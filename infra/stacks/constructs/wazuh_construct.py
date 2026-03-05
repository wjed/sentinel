"""
WazuhConstruct — SQS queues + ingest Lambda + Wazuh Manager EC2.

Owns all Wazuh-related infrastructure:
  - SQS alert queue + dead-letter queue
  - Lambda ingest function (SQS → DynamoDB)
  - Wazuh Manager EC2 instance (private subnet)
  - IAM roles and security groups for the above

Constructor args:
  vpc               — ec2.Vpc — the VPC to place resources in
  private_subnets   — list[ec2.ISubnet] — subnets for the EC2 instance
  telemetry_table   — dynamodb.Table — destination for ingested alerts
  telemetry_kms_key — kms.Key — used to grant encrypt/decrypt to the Lambda

Exposes:
  self.alert_queue  — the main SQS queue
  self.alert_dlq    — the dead-letter queue
  self.ingest_fn    — the Lambda ingest function
  self.instance     — the Wazuh Manager EC2 instance
"""

from aws_cdk import aws_dynamodb as dynamodb
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_kms as kms
from aws_cdk import aws_lambda as lambda_
from aws_cdk import aws_sqs as sqs
from constructs import Construct


class WazuhConstruct(Construct):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.Vpc,
        private_subnets: list,
        telemetry_table: dynamodb.Table,
        telemetry_kms_key: kms.Key,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # TODO: move SQS queues, Lambda, EC2 instance here from BackendStack
        self.alert_queue: sqs.Queue = None  # type: ignore
        self.alert_dlq: sqs.Queue = None  # type: ignore
        self.ingest_fn: lambda_.Function = None  # type: ignore
        self.instance: ec2.Instance = None  # type: ignore
