"""
Network Stack — SentinelNet (Scaffolding).

Future purpose: VPCs, subnets, security groups, connectivity.
This stack is INTENTIONALLY EMPTY. No AWS resources are defined.
"""

from aws_cdk import Stack
from constructs import Construct


class NetworkStack(Stack):
    """Placeholder for network layer. Responsibility: Network team."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        # Intentionally empty.
