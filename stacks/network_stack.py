"""
Network Stack — SentinelNet (Scaffolding).

Future purpose:
  Define VPCs, subnets, security groups, and network connectivity
  for the SOC platform. This stack will own networking boundaries
  and firewall-style rules.

This stack is INTENTIONALLY EMPTY. No AWS resources are defined.
Do not add resources until the project phase allows deployment.
"""

from aws_cdk import Stack
from constructs import Construct


class NetworkStack(Stack):
    """
    Placeholder for the SentinelNet network layer.

    Responsibility: Network team.
    Future resources (conceptual): VPC, subnets, NAT, security groups, etc.
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ---------------------------------------------------------------------
        # Intentionally empty. No AWS resources are defined in this scaffold.
        # Add resources here in a later phase when deployment is approved.
        # ---------------------------------------------------------------------
