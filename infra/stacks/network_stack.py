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
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. Define the 3-Tier VPC Architecture
        self.vpc = ec2.Vpc(
            self, "SentinelNetVPC",
            ip_addresses=ec2.IpAddresses.cidr("10.0.0.0/16"),
            max_azs=2, # Redundancy and High Availability
            subnet_configuration=[
                # PUBLIC: Only for Load Balancers and Ingress
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24
                ),
                # PRIVATE: Application logic (Wazuh, TheHive, Lambdas)
                ec2.SubnetConfiguration(
                    name="Private-App",
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidr_mask=24
                ),
                # ISOLATED: Database storage (RDS MySQL, DynamoDB Endpoints)
                ec2.SubnetConfiguration(
                    name="Isolated-Data",
                    subnet_type=ec2.SubnetType.PRIVATE_ISOLATED,
                    cidr_mask=24
                )
            ]
        )

        # 2. Enforcement of Global Tags for Cost Allocation
        Tags.of(self).add("Project", "SentinelNet")
        Tags.of(self).add("Environment", "Dev")
