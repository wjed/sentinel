"""
Backend Stack — SentinelNet (Scaffolding).

Future purpose:
  Define compute, APIs, and backend services for the SOC platform.
  This stack will own Lambda, API Gateway, and orchestration components.

This stack is INTENTIONALLY EMPTY. No AWS resources are defined.
Do not add resources until the project phase allows deployment.
"""

from aws_cdk import Stack
from constructs import Construct


class BackendStack(Stack):
    """
    Placeholder for the SentinelNet backend and API layer.

    Responsibility: Backend team.
    Future resources (conceptual): Lambda, API Gateway, ECS, etc.
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ---------------------------------------------------------------------
        # Intentionally empty. No AWS resources are defined in this scaffold.
        # Add resources here in a later phase when deployment is approved.
        # ---------------------------------------------------------------------
