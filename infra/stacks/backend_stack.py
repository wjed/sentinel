from os import path
from aws_cdk import (
    CfnOutput,
    Duration,
    RemovalPolicy,
    Stack,
    aws_dynamodb as dynamodb,
    aws_ec2 as ec2,
    aws_iam as iam,
    aws_kms as kms,
    aws_lambda as _lambda,
    aws_lambda_event_sources as lambda_event_sources,
    aws_rds as rds,
    aws_sqs as sqs,
    aws_ecs as ecs,
    aws_elasticloadbalancingv2 as elbv2,
)
from constructs import Construct



class BackendStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.Vpc,
        private_subnet_ids: list,
        internal_subnet_ids: list,
        public_subnet_ids: list = None,  # For ECS/Grafana
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        azs = self.availability_zones
        private_subnets = [
            ec2.Subnet.from_subnet_attributes(
                self,
                f"PrivateSubnetRef{idx+1}",
                subnet_id=subnet_id,
                availability_zone=azs[idx % len(azs)],
            )
            for idx, subnet_id in enumerate(private_subnet_ids)
        ]
        internal_subnets = [
            ec2.Subnet.from_subnet_attributes(
                self,
                f"InternalSubnetRef{idx+1}",
                subnet_id=subnet_id,
                availability_zone=azs[idx % len(azs)],
            )
            for idx, subnet_id in enumerate(internal_subnet_ids)
        ]

        telemetry_kms_key = kms.Key(
            self,
            "TelemetryTableKmsKey",
            alias="alias/sentinel-telemetry-key",
            enable_key_rotation=True,
            removal_policy=RemovalPolicy.DESTROY,
        )

        telemetry_table = dynamodb.Table(
            self,
            "TelemetryTable",
            table_name="sentinel-telemetry",
            partition_key=dynamodb.Attribute(
                name="id",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="timestamp",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption=dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryption_key=telemetry_kms_key,
            point_in_time_recovery=True,
            time_to_live_attribute="expiresAt",
            removal_policy=RemovalPolicy.DESTROY,
        )

        wazuh_alert_dlq = sqs.Queue(
            self,
            "WazuhAlertsDLQ",
            queue_name="sentinel-wazuh-alerts-dlq",
            retention_period=Duration.days(14),
            encryption=sqs.QueueEncryption.SQS_MANAGED,
            enforce_ssl=True,
        )
        wazuh_alert_dlq.apply_removal_policy(RemovalPolicy.DESTROY)

        wazuh_alert_queue = sqs.Queue(
            self,
            "WazuhAlertsQueue",
            queue_name="sentinel-wazuh-alerts",
            retention_period=Duration.days(4),
            visibility_timeout=Duration.seconds(120),
            dead_letter_queue=sqs.DeadLetterQueue(
                queue=wazuh_alert_dlq,
                max_receive_count=5,
            ),
            encryption=sqs.QueueEncryption.SQS_MANAGED,
            enforce_ssl=True,
        )
        wazuh_alert_queue.apply_removal_policy(RemovalPolicy.DESTROY)

        wazuh_ingest_fn = _lambda.Function(
            self,
            "WazuhIngestFunction",
            function_name="sentinel-wazuh-ingest",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="handler.handler",
            code=_lambda.Code.from_asset(
                path.abspath(
                    path.join(
                        path.dirname(__file__),
                        "..",
                        "..",
                        "backend",
                        "lambda",
                        "wazuh_ingest",
                    )
                )
            ),
            timeout=Duration.seconds(60),
            memory_size=256,
            environment={
                "TABLE_NAME": telemetry_table.table_name,
                "RETENTION_DAYS": "30",
            },
        )

        wazuh_alert_queue.grant_consume_messages(wazuh_ingest_fn)
        wazuh_ingest_fn.add_event_source(
            lambda_event_sources.SqsEventSource(
                wazuh_alert_queue,
                batch_size=10,
                report_batch_item_failures=True,
            )
        )

        # Least privilege: only telemetry writes required by the ingestor.
        wazuh_ingest_fn.add_to_role_policy(
            iam.PolicyStatement(
                actions=["dynamodb:PutItem", "dynamodb:BatchWriteItem"],
                resources=[telemetry_table.table_arn],
            )
        )
        telemetry_kms_key.grant_encrypt_decrypt(wazuh_ingest_fn)

        # Security group - no inbound by default (isolated)
        rds_sg = ec2.SecurityGroup(
            self,
            "RDSSecurityGroup",
            vpc=vpc,
            description="Security group for RDS MySQL (isolated data subnet)",
            allow_all_outbound=False,
        )

        rds_instance = rds.DatabaseInstance(
            self,
            "SentinelMySQL",
            engine=rds.DatabaseInstanceEngine.mysql(
                version=rds.MysqlEngineVersion.VER_8_0
            ),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.T3, ec2.InstanceSize.MICRO
            ),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnets=internal_subnets),
            security_groups=[rds_sg],
            database_name="sentineldb",
            instance_identifier="sentinel-mysql",
            multi_az=False,
            allocated_storage=20,
            max_allocated_storage=100,
            backup_retention=Duration.days(7),
            deletion_protection=False,
            removal_policy=RemovalPolicy.DESTROY,
        )

        self.telemetry_table = telemetry_table
        self.rds_instance = rds_instance
        self.wazuh_alert_queue = wazuh_alert_queue
        self.wazuh_alert_dlq = wazuh_alert_dlq
        self.wazuh_ingest_fn = wazuh_ingest_fn

        wazuh_sg = ec2.SecurityGroup(
            self,
            "WazuhManagerSG",
            vpc=vpc,
            description="Wazuh Manager — internal subnet only, no inbound by default",
            allow_all_outbound=False,
        )
        wazuh_sg.add_ingress_rule(
            ec2.Peer.ipv4(vpc.vpc_cidr_block),
            ec2.Port.tcp(1514),
            "Wazuh agent TCP from VPC",
        )
        wazuh_sg.add_ingress_rule(
            ec2.Peer.ipv4(vpc.vpc_cidr_block),
            ec2.Port.udp(1514),
            "Wazuh agent UDP from VPC",
        )
        wazuh_sg.add_ingress_rule(
            ec2.Peer.ipv4(vpc.vpc_cidr_block),
            ec2.Port.tcp(1515),
            "Wazuh registration TCP from VPC",
        )

        wazuh_role = iam.Role(
            self,
            "WazuhInstanceRole",
            assumed_by=iam.ServicePrincipal("ec2.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "AmazonSSMManagedInstanceCore"
                ),
            ],
        )
        wazuh_role.add_to_policy(
            iam.PolicyStatement(
                actions=["sqs:SendMessage"],
                resources=[wazuh_alert_queue.queue_arn],
            )
        )

        user_data = ec2.UserData.for_linux()
        user_data.add_commands(
            "yum update -y",
            "yum install -y curl",
            "# TODO: add Wazuh repository and install steps for the chosen OS",
            "# Example (RHEL/CentOS/AmazonLinux compatible):",
            "# curl -sO https://packages.wazuh.com/4.x/yum/wazuh-repo-4.x.rpm || true",
            "# rpm -ivh wazuh-repo-4.x.rpm || true",
            "# yum install -y wazuh-manager || true",
            "# systemctl enable --now wazuh-manager || true",
        )

        wazuh_instance = ec2.Instance(
            self,
            "WazuhManagerInstance",
            instance_type=ec2.InstanceType("t3.medium"),
            machine_image=ec2.MachineImage.latest_amazon_linux(
                generation=ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
            ),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnets=private_subnets),
            security_group=wazuh_sg,
            role=wazuh_role,
            user_data=user_data,
        )


        CfnOutput(
            self,
            "WazuhManagerPrivateIp",
            value=wazuh_instance.instance_private_ip,
            description="Wazuh Manager private IP",
        )

        # --- ECS Fargate + ALB (Grafana) ---
        if public_subnet_ids:
            public_subnets = [
                ec2.Subnet.from_subnet_attributes(
                    self,
                    f"PublicSubnetRef{idx+1}",
                    subnet_id=subnet_id,
                    availability_zone=azs[idx % len(azs)],
                )
                for idx, subnet_id in enumerate(public_subnet_ids)
            ]
            subnet_selection = ec2.SubnetSelection(subnets=public_subnets)

            # ECS Cluster
            cluster = ecs.Cluster(self, "BackendCluster", vpc=vpc)

            # Fargate Task Definition for Grafana
            task_def = ecs.FargateTaskDefinition(self, "GrafanaTaskDef")
            task_def.add_container(
                "GrafanaContainer",
                image=ecs.ContainerImage.from_registry("public.ecr.aws/bitnami/grafana:latest"),
                port_mappings=[ecs.PortMapping(container_port=3000)],
            )

            # Fargate Service in public subnet with public IP so it can pull the image (no NAT needed)
            service = ecs.FargateService(
                self,
                "GrafanaService",
                cluster=cluster,
                task_definition=task_def,
                vpc_subnets=subnet_selection,
                assign_public_ip=True,
            )

            # Internal ALB (not internet-facing) in same subnets
            lb = elbv2.ApplicationLoadBalancer(
                self,
                "GrafanaLB",
                vpc=vpc,
                internet_facing=False,
                vpc_subnets=subnet_selection,
            )
            listener = lb.add_listener("GrafanaListener", port=80)
            listener.add_targets(
                "GrafanaTarget",
                port=3000,
                protocol=elbv2.ApplicationProtocol.HTTP,
                targets=[service],
                health_check=elbv2.HealthCheck(
                    path="/api/health",
                    interval=Duration.seconds(15),
                    timeout=Duration.seconds(5),
                    healthy_http_codes="200",
                ),
            )

            CfnOutput(
                self,
                "GrafanaEndpoint",
                value=lb.load_balancer_dns_name,
                description="Grafana ALB endpoint (private)",
            )

        CfnOutput(
            self,
            "TelemetryTableName",
            value=telemetry_table.table_name,
            description="DynamoDB table name for normalized Wazuh alerts",
        )
        CfnOutput(
            self,
            "WazuhAlertsQueueUrl",
            value=wazuh_alert_queue.queue_url,
            description="SQS queue URL for Wazuh alert ingestion",
        )
        CfnOutput(
            self,
            "WazuhAlertsQueueArn",
            value=wazuh_alert_queue.queue_arn,
            description="SQS queue ARN for Wazuh alert ingestion",
        )
        CfnOutput(
            self,
            "WazuhAlertsDlqUrl",
            value=wazuh_alert_dlq.queue_url,
            description="SQS dead-letter queue URL for Wazuh alert ingestion",
        )
        CfnOutput(
            self,
            "WazuhIngestLambdaName",
            value=wazuh_ingest_fn.function_name,
            description="Lambda function name for Wazuh alert ingestion",
        )
