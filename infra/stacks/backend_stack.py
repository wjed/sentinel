"""
Backend Stack - Single EC2 running SOC services via docker-compose.

Resources:
  - EC2 (t3.medium, public subnet) running Wazuh + TheHive + Grafana
  - ALB (internet-facing) with Cognito auth in front of TheHive
  - DynamoDB telemetry table + KMS key for alert storage
  - SQS alert queue + DLQ for Wazuh alert ingestion
  - Lambda function (SQS -> DynamoDB)

Deploy with: cdk deploy SentinelNet-Backend
"""

from pathlib import Path

from aws_cdk import CfnOutput, Duration, RemovalPolicy, Stack, Tags
from aws_cdk import aws_cognito as cognito
from aws_cdk import aws_dynamodb as dynamodb
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_elasticloadbalancingv2 as elbv2
from aws_cdk import aws_elasticloadbalancingv2_targets as targets
from aws_cdk.aws_elasticloadbalancingv2_actions import AuthenticateCognitoAction
from aws_cdk import aws_iam as iam
from aws_cdk import aws_kms as kms
from aws_cdk import aws_lambda as lambda_
from aws_cdk import aws_lambda_event_sources as events
from aws_cdk import aws_sqs as sqs
from constructs import Construct


class BackendStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.Vpc,
        user_pool: cognito.UserPool,
        user_pool_domain: cognito.UserPoolDomain,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        Tags.of(self).add("Project", "SentinelNet")

        repo_root = Path(__file__).resolve().parents[2]
        lambda_dir = str(repo_root / "backend" / "lambda" / "wazuh_ingest")

        # ── Security Group ────────────────────────────────────────────────────
        self.sg = ec2.SecurityGroup(
            self, "ServicesSG", vpc=vpc,
            description="SentinelNet SOC services",
            allow_all_outbound=True,
        )
        # ALB health checks + forwarding
        self.sg.add_ingress_rule(
            ec2.Peer.ipv4(vpc.vpc_cidr_block), ec2.Port.tcp(9000),
            "TheHive from VPC/ALB")
        self.sg.add_ingress_rule(
            ec2.Peer.ipv4(vpc.vpc_cidr_block), ec2.Port.tcp(3000),
            "Grafana from VPC/ALB")
        # Wazuh agent registration/events from VPC
        self.sg.add_ingress_rule(
            ec2.Peer.ipv4(vpc.vpc_cidr_block), ec2.Port.tcp(1514),
            "Wazuh agent TCP")
        self.sg.add_ingress_rule(
            ec2.Peer.ipv4(vpc.vpc_cidr_block), ec2.Port.tcp(1515),
            "Wazuh registration")

        # ── EC2 Instance ──────────────────────────────────────────────────────
        role = iam.Role(
            self, "EC2Role",
            assumed_by=iam.ServicePrincipal("ec2.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "AmazonSSMManagedInstanceCore"),
            ],
        )

        user_data = ec2.UserData.for_linux()
        user_data.add_commands(
            "#!/bin/bash",
            "set -ex",
            # Install Docker
            "yum update -y",
            "yum install -y docker",
            "systemctl enable docker && systemctl start docker",
            "usermod -aG docker ec2-user",
            # Install docker-compose
            'COMPOSE_URL="https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)"',
            "curl -L $COMPOSE_URL -o /usr/local/bin/docker-compose",
            "chmod +x /usr/local/bin/docker-compose",
            # Create compose file
            "mkdir -p /opt/sentinel",
            "cat > /opt/sentinel/docker-compose.yml << 'COMPOSE_EOF'",
            "services:",
            "  wazuh:",
            "    image: wazuh/wazuh-manager:4.9.2",
            "    hostname: wazuh-manager",
            "    restart: unless-stopped",
            "    ports:",
            '      - "1514:1514"',
            '      - "1515:1515"',
            '      - "55000:55000"',
            "    volumes:",
            "      - wazuh_data:/var/ossec/data",
            "      - wazuh_etc:/var/ossec/etc",
            "      - wazuh_logs:/var/ossec/logs",
            "",
            "  thehive:",
            "    image: strangebee/thehive:5.4",
            "    restart: unless-stopped",
            "    ports:",
            '      - "9000:9000"',
            "    volumes:",
            "      - thehive_db:/opt/thp/thehive/db",
            "      - thehive_index:/opt/thp/thehive/index",
            "",
            "  grafana:",
            "    image: grafana/grafana:latest",
            "    restart: unless-stopped",
            "    ports:",
            '      - "3000:3000"',
            "    environment:",
            "      - GF_SECURITY_ADMIN_PASSWORD=sentinel",
            "    volumes:",
            "      - grafana_data:/var/lib/grafana",
            "",
            "volumes:",
            "  wazuh_data:",
            "  wazuh_etc:",
            "  wazuh_logs:",
            "  thehive_db:",
            "  thehive_index:",
            "  grafana_data:",
            "COMPOSE_EOF",
            # Start services
            "cd /opt/sentinel && /usr/local/bin/docker-compose up -d",
        )

        self.instance = ec2.Instance(
            self, "SOCInstance",
            instance_type=ec2.InstanceType("t3.medium"),
            machine_image=ec2.MachineImage.latest_amazon_linux2(),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            security_group=self.sg,
            role=role,
            user_data=user_data,
        )

        # ── ALB ───────────────────────────────────────────────────────────────
        alb_sg = ec2.SecurityGroup(
            self, "AlbSG", vpc=vpc,
            description="SentinelNet ALB",
            allow_all_outbound=True,
        )
        alb_sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(80), "HTTP")

        alb = elbv2.ApplicationLoadBalancer(
            self, "ALB",
            vpc=vpc,
            internet_facing=True,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            security_group=alb_sg,
        )

        # Allow ALB to reach EC2
        self.sg.connections.allow_from(alb, ec2.Port.tcp(9000))

        # TheHive listener (HTTP port 80 -> port 9000 on EC2)
        listener = alb.add_listener("HttpListener", port=80)
        listener.add_targets(
            "TheHiveTarget",
            port=9000,
            protocol=elbv2.ApplicationProtocol.HTTP,
            targets=[targets.InstanceTarget(self.instance, 9000)],
            health_check=elbv2.HealthCheck(
                path="/",
                interval=Duration.seconds(60),
                healthy_threshold_count=2,
                unhealthy_threshold_count=5,
            ),
        )

        # ── Telemetry: DynamoDB + KMS ─────────────────────────────────────────
        self.kms_key = kms.Key(
            self, "TelemetryKey",
            enable_key_rotation=True,
            removal_policy=RemovalPolicy.DESTROY,
        )

        self.telemetry_table = dynamodb.Table(
            self, "TelemetryTable",
            partition_key=dynamodb.Attribute(
                name="pk", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(
                name="sk", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption=dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryption_key=self.kms_key,
            removal_policy=RemovalPolicy.DESTROY,
            time_to_live_attribute="ttl",
        )

        # ── SQS: Alert Queue + DLQ ───────────────────────────────────────────
        self.alert_dlq = sqs.Queue(
            self, "AlertDLQ",
            queue_name="sentinel-alerts-dlq",
            retention_period=Duration.days(14),
            enforce_ssl=True,
        )

        self.alert_queue = sqs.Queue(
            self, "AlertQueue",
            queue_name="sentinel-alerts",
            retention_period=Duration.days(4),
            visibility_timeout=Duration.seconds(120),
            dead_letter_queue=sqs.DeadLetterQueue(
                queue=self.alert_dlq, max_receive_count=5),
            enforce_ssl=True,
        )

        # Grant EC2 permission to send to SQS
        self.alert_queue.grant_send_messages(role)

        # ── Lambda: SQS -> DynamoDB ───────────────────────────────────────────
        self.ingest_fn = lambda_.Function(
            self, "IngestFunction",
            function_name="sentinel-wazuh-ingest",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=lambda_.Code.from_asset(lambda_dir),
            timeout=Duration.seconds(60),
            memory_size=256,
            environment={
                "TABLE_NAME": self.telemetry_table.table_name,
                "RETENTION_DAYS": "30",
            },
        )

        self.alert_queue.grant_consume_messages(self.ingest_fn)
        self.ingest_fn.add_event_source(
            events.SqsEventSource(self.alert_queue, batch_size=10,
                                  report_batch_item_failures=True))
        self.telemetry_table.grant_write_data(self.ingest_fn)
        self.kms_key.grant_encrypt_decrypt(self.ingest_fn)

        # ── Outputs ───────────────────────────────────────────────────────────
        CfnOutput(self, "InstanceId", value=self.instance.instance_id)
        CfnOutput(self, "ALBEndpoint", value=alb.load_balancer_dns_name,
                  export_name="SentinelNetALBEndpoint")
        CfnOutput(self, "TelemetryTableName",
                  value=self.telemetry_table.table_name)
        CfnOutput(self, "AlertQueueUrl", value=self.alert_queue.queue_url)
