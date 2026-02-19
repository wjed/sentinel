"""
Cost tagging stack.

Future purpose: Cost tag our rescources.
"""

from aws_cdk import Stack
from constructs import Construct
from aws_cdk import Tags
from aws_cdk import aws_ec2 as ec2

class CostTagStack(Stack):
    """Stack for applying cost tags to AWS resources."""

    # Just a baseline code. this is not right. you will have to update it.

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        Tags.of(self).add("CostCenter", "Engineering")
        Tags.of(self).add("Environment", "Production")
        Tags.of(self).add("ManagedBy", "CDK")
