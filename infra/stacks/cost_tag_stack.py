from aws_cdk import Stack, Tags
from constructs import Construct

class CostTagStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. Global Project Tags (Applied to everything)
        global_tags = {
            "Project": "SentinelNet",
            "Environment": "Dev"
        }
        for key, value in global_tags.items():
            Tags.of(scope).add(key, value)

    @staticmethod
    def tag_internal_resources(resource_scope: Construct):
        """Call this specifically for the DataStack or Private Subnets"""
        Tags.of(resource_scope).add("Tier", "Internal-Private")
        Tags.of(resource_scope).add("DataSensitivity", "High")
        Tags.of(resource_scope).add("Service", "Database-Storage")

    @staticmethod
    def tag_public_resources(resource_scope: Construct):
        """Call this specifically for the NetworkStack or Public Subnets"""
        Tags.of(resource_scope).add("Tier", "Public-Ingress")
        Tags.of(resource_scope).add("Service", "Network-Gateway")