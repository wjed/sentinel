"""
Network Stack — SentinelNet (Scaffolding).

Future purpose: VPCs, subnets, security groups, connectivity.
This stack is INTENTIONALLY EMPTY. No AWS resources are defined.
"""

from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    Tags
)
from constructs import Construct


class NetworkStack(Stack):
    """Placeholder for network layer. Responsibility: Network team."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        # You will need to update this code. This is just a baseline code for creating a VPC with public subnets. We will also
        # look at making 2 zones for redundancy and high availability. This is just a starting point.
        self.vpc = ec2.Vpc(
            self, "SentinelNetVPC",
            ip_addresses=ec2.IpAddresses.cidr("10.0.0.0/16"),
            max_azs=2, 
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public-Ingress",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24
                ),
                ec2.SubnetConfiguration(
                    name="Private-App-Logic",
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidr_mask=24
                ),
                ec2.SubnetConfiguration(
                    name="Isolated-Data-Storage",
                    subnet_type=ec2.SubnetType.PRIVATE_ISOLATED,
                    cidr_mask=24
                )
            ],
            nat_gateways=1,
        )

# example of the cost tagging stack. This is just a baseline code. You will have to update it.
        Tags.of(self).add("Project", "SentinelNet")
        Tags.of(self).add("Layer", "Networking")
        Tags.of(self).add("Tier", "VPC-Base")
        Tags.of(self).add("Owner", "Andrew-Myshkevych")
        Tags.of(self).add("Environment", "Dev")
        Tags.of(self).add("CostCenter", "JMU-Cyber-Lab")
        Tags.of(self).add("ManagedBy", "CDK-Python")
        Tags.of(self).add("Application", "SIEM-Stack")
        Tags.of(self).add("Name", "SentinelNet-Resource")
        Tags.of(self).add("aws:createdBy", "Andrew-Myshkevych")
        Tags.of(self).add("aws:createdWith", "CDK-Python")
