"""
Data Stack — SentinelNet (Scaffolding).

Future purpose: Data ingestion, storage, pipelines.
This stack is INTENTIONALLY EMPTY. No AWS resources are defined.
"""

from aws_cdk import Stack
from constructs import Construct


class DataStack(Stack):
    """Placeholder for data layer. Responsibility: Data team."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        # Intentionally empty.
