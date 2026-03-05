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

        # TODO: move KMS key + DynamoDB table here from BackendStack
        self.kms_key: kms.Key = None  # type: ignore
        self.table: dynamodb.Table = None  # type: ignore
