"""
TelemetryConstruct — KMS key + DynamoDB telemetry table.

Owns all storage for normalized Wazuh alerts:
  - Customer-managed KMS key (with rotation)
  - DynamoDB table (PAY_PER_REQUEST, PITR enabled, TTL on expiresAt)

Exposes:
  self.table      — the DynamoDB Table construct
  self.kms_key    — the KMS Key construct (grant_encrypt_decrypt to other constructs)
"""

from aws_cdk import RemovalPolicy
from aws_cdk import aws_dynamodb as dynamodb
from aws_cdk import aws_kms as kms
from constructs import Construct


class TelemetryConstruct(Construct):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.kms_key = kms.Key(
            self,
            "TelemetryKey",
            description="CMK for Sentinel telemetry DynamoDB table",
            enable_key_rotation=True,
            removal_policy=RemovalPolicy.DESTROY,
        )

        self.table = dynamodb.Table(
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
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True,
            ),
            encryption=dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryption_key=self.kms_key,
            time_to_live_attribute="expiresAt",
            removal_policy=RemovalPolicy.DESTROY,
        )
