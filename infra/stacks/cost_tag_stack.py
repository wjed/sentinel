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

        sentinel_tags = {
            "Project": "SentinelNet",
            "Owner": "Andrew-Myshkevych",
            "Environment": "Dev",
            "CostCenter": "JMU-Cyber-Lab",
            "ManagedBy": "CDK-Python",
            "Application": "SIEM-Stack",
            "Name": "SentinelNet-Resource",
            "aws:createdBy": "Andrew-Myshkevych",
            "aws:createdWith": "CDK-Python"
        }

        for key, value in sentinel_tags.items():
            Tags.of(scope).add(key, value)
