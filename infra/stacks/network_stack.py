"""
Network Stack - VPC for SentinelNet POC.

Public subnets only, no NAT Gateway ($0 networking cost).
Deploy with: cdk deploy SentinelNet-Network
"""

from aws_cdk import CfnOutput, Stack, Tags
from aws_cdk import aws_ec2 as ec2
from constructs import Construct


class NetworkStack(Stack):
    """VPC with public subnets only - no NAT Gateway for POC cost savings."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        Tags.of(self).add("Project", "SentinelNet")

        self.vpc = ec2.Vpc(
            self,
            "Vpc",
            ip_addresses=ec2.IpAddresses.cidr("10.0.0.0/16"),
            max_azs=2,
            nat_gateways=0,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24,
                ),
            ],
        )

        # Outputs
        CfnOutput(self, "VpcId", value=self.vpc.vpc_id,
                  export_name="SentinelNetVpcId")
        CfnOutput(self, "PublicSubnetIds",
                  value=",".join([s.subnet_id for s in self.vpc.public_subnets]),
                  export_name="SentinelNetPublicSubnetIds")
