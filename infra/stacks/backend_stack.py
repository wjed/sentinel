"""
Backend Stack — SentinelNet (Scaffolding).

Future purpose: Compute, APIs, orchestration.
This stack is INTENTIONALLY EMPTY. No AWS resources are defined.
"""

from aws_cdk import Stack
from constructs import Construct


class BackendStack(Stack):
    """Placeholder for backend/API layer. Responsibility: Backend team."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        # Intentionally empty.
