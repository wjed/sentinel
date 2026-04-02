"""
Network Stack — VPC for SentinelNet POC.

Simplified VPC: 2 AZs, public + private subnets, 1 NAT Gateway.
Deploy with: cdk deploy SentinelNet-Network
"""

from aws_cdk import CfnOutput, Stack, Tags
from aws_cdk import aws_ec2 as ec2
from constructs import Construct


class NetworkStack(Stack):
    """VPC with public and private subnets for the SentinelNet POC."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        Tags.of(self).add("Project", "SentinelNet")

        # ── VPC ───────────────────────────────────────────────────────────────
        # CDK handles IGW, route tables, and NAT automatically.
        # 1 NAT Gateway keeps costs low for the POC.
        self.vpc = ec2.Vpc(
            self,
            "Vpc",
            ip_addresses=ec2.IpAddresses.cidr("10.0.0.0/16"),
            max_azs=2,
            nat_gateways=1,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24,
                ),
                ec2.SubnetConfiguration(
                    name="Private",
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidr_mask=24,
                ),
            ],
        )

        # ── Outputs ───────────────────────────────────────────────────────────
        CfnOutput(
            self,
            "VpcId",
            value=self.vpc.vpc_id,
            description="VPC ID",
            export_name="SentinelNetVpcId",
        )
        CfnOutput(
            self,
            "PublicSubnetIds",
            value=",".join([s.subnet_id for s in self.vpc.public_subnets]),
            description="Comma-separated public subnet IDs.",
            export_name="SentinelNetPublicSubnetIds",
        )
        CfnOutput(
            self,
            "PrivateSubnetIds",
            value=",".join([s.subnet_id for s in self.vpc.private_subnets]),
            description="Comma-separated private subnet IDs.",
            export_name="SentinelNetPrivateSubnetIds",
        )
