"""
Identity Stack — SentinelNet (Scaffolding).

Future purpose:
  Define IAM roles, policies, and identity boundaries for the SOC platform.
  This stack will own authentication and authorization constructs.

This stack is INTENTIONALLY EMPTY. No AWS resources are defined.
Do not add resources until the project phase allows deployment.
"""

from aws_cdk import Stack
from constructs import Construct


class IdentityStack(Stack):
    """
    Placeholder for the SentinelNet identity and access layer.

    Responsibility: Identity team.
    Future resources (conceptual): IAM roles, policies, identity providers, etc.
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ---------------------------------------------------------------------
        # Intentionally empty. No AWS resources are defined in this scaffold.
        # Add resources here in a later phase when deployment is approved.
        # ---------------------------------------------------------------------
