"""
Data Stack — SentinelNet (Scaffolding).

Future purpose:
  Define data ingestion, storage, and processing resources for security data.
  This stack will own data lakes, queues, and pipelines for SOC workflows.

This stack is INTENTIONALLY EMPTY. No AWS resources are defined.
Do not add resources until the project phase allows deployment.
"""

from aws_cdk import Stack
from constructs import Construct


class DataStack(Stack):
    """
    Placeholder for the SentinelNet data layer.

    Responsibility: Data team.
    Future resources (conceptual): S3, Kinesis, SQS, Glue, etc.
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ---------------------------------------------------------------------
        # Intentionally empty. No AWS resources are defined in this scaffold.
        # Add resources here in a later phase when deployment is approved.
        # ---------------------------------------------------------------------
