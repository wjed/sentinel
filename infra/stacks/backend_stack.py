"""
Backend Stack: ECS Fargate + ALB and Wazuh alert ingestion resources.
"""

from pathlib import Path
from typing import Optional

from aws_cdk import CfnOutput, Duration, RemovalPolicy, Stack
from aws_cdk import aws_dynamodb as dynamodb
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_ecs as ecs
from aws_cdk import aws_elasticloadbalancingv2 as elbv2
from aws_cdk import aws_iam as iam
from aws_cdk import aws_kms as kms
from aws_cdk import aws_lambda as lambda_
from aws_cdk import aws_lambda_event_sources as lambda_event_sources
from aws_cdk import aws_sqs as sqs
from constructs import Construct


class BackendStack(Stack):
    """ECS cluster + Fargate service + internal ALB + Wazuh ingest path."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.IVpc,
        subnets: list,
        wazuh_manager_instance_role: Optional[iam.IRole] = None,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        subnet_selection = ec2.SubnetSelection(subnets=subnets)

        # ECS cluster and service for Grafana.
        cluster = ecs.Cluster(self, "BackendCluster", vpc=vpc)
        task_def = ecs.FargateTaskDefinition(self, "GrafanaTaskDef")
        task_def.add_container(
            "GrafanaContainer",
            image=ecs.ContainerImage.from_registry("public.ecr.aws/bitnami/grafana:latest"),
            port_mappings=[ecs.PortMapping(container_port=3000)],
        )
        service = ecs.FargateService(
            self,
            "GrafanaService",
            cluster=cluster,
            task_definition=task_def,
            vpc_subnets=subnet_selection,
            assign_public_ip=True,
        )

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

        # Hardened telemetry table for normalized Wazuh alerts.
        telemetry_key = kms.Key(
            self,
            "TelemetryKmsKey",
            description="KMS key for SentinelNet telemetry table encryption",
            enable_key_rotation=True,
            removal_policy=RemovalPolicy.DESTROY,
        )

        telemetry_table = dynamodb.Table(
            self,
            "TelemetryTable",
            table_name="sentinel-telemetry",
            partition_key=dynamodb.Attribute(name="id", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="timestamp", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption=dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryption_key=telemetry_key,
            point_in_time_recovery=True,
            time_to_live_attribute="expiresAt",
            removal_policy=RemovalPolicy.DESTROY,
        )

        wazuh_alerts_dlq = sqs.Queue(
            self,
            "WazuhAlertsDlq",
            queue_name="wazuh-alerts-dlq",
            retention_period=Duration.days(14),
            encryption=sqs.QueueEncryption.SQS_MANAGED,
        )
        wazuh_alerts_dlq.apply_removal_policy(RemovalPolicy.DESTROY)

        wazuh_alerts_queue = sqs.Queue(
            self,
            "WazuhAlertsQueue",
            queue_name="wazuh-alerts-queue",
            retention_period=Duration.days(4),
            visibility_timeout=Duration.seconds(120),
            dead_letter_queue=sqs.DeadLetterQueue(
                queue=wazuh_alerts_dlq,
                max_receive_count=5,
            ),
            encryption=sqs.QueueEncryption.SQS_MANAGED,
        )
        wazuh_alerts_queue.apply_removal_policy(RemovalPolicy.DESTROY)

        ingest_lambda_role = iam.Role(
            self,
            "WazuhIngestLambdaRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaBasicExecutionRole"
                )
            ],
        )
        ingest_lambda_role.add_to_policy(
            iam.PolicyStatement(
                actions=["dynamodb:PutItem", "dynamodb:BatchWriteItem"],
                resources=[telemetry_table.table_arn],
            )
        )
        ingest_lambda_role.add_to_policy(
            iam.PolicyStatement(
                actions=["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey"],
                resources=[telemetry_key.key_arn],
            )
        )

        ingest_handler_path = (
            Path(__file__).resolve().parents[2] / "backend" / "lambda" / "wazuh_ingest"
        )
        wazuh_ingest_handler = lambda_.Function(
            self,
            "WazuhIngestHandler",
            function_name="wazuh-ingest-handler",
            runtime=lambda_.Runtime.PYTHON_3_11,
            code=lambda_.Code.from_asset(str(ingest_handler_path)),
            handler="handler.handler",
            timeout=Duration.seconds(30),
            memory_size=256,
            role=ingest_lambda_role,
            environment={
                "TABLE_NAME": telemetry_table.table_name,
                "RETENTION_DAYS": "30",
            },
        )
        wazuh_ingest_handler.add_event_source(
            lambda_event_sources.SqsEventSource(
                wazuh_alerts_queue,
                batch_size=10,
                max_batching_window=Duration.seconds(5),
                report_batch_item_failures=True,
            )
        )

        # Optional hook: pass the Wazuh EC2 instance role when available.
        if wazuh_manager_instance_role is not None:
            wazuh_alerts_queue.grant_send_messages(wazuh_manager_instance_role)

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
            value=wazuh_alerts_queue.queue_url,
            description="SQS queue URL for Wazuh alert ingestion",
        )
        CfnOutput(
            self,
            "WazuhAlertsQueueArn",
            value=wazuh_alerts_queue.queue_arn,
            description="SQS queue ARN for Wazuh alert ingestion",
        )
        CfnOutput(
            self,
            "WazuhAlertsDlqUrl",
            value=wazuh_alerts_dlq.queue_url,
            description="SQS dead-letter queue URL for Wazuh alert ingestion",
        )
        CfnOutput(
            self,
            "WazuhIngestLambdaName",
            value=wazuh_ingest_handler.function_name,
            description="Lambda function name for Wazuh alert ingestion",
        )
