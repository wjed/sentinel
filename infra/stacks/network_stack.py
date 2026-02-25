"""
Network Stack — VPC and subnets for the center/backend team.

Deploy with: cdk deploy SentinelNet-Network

Other stacks can reference the VPC via exports or by taking this stack as a dependency.
"""

from aws_cdk import CfnOutput, Stack
from aws_cdk import aws_ec2 as ec2
from constructs import Construct


class NetworkStack(Stack):
    """VPC with public and private subnets for SentinelNet workloads."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.vpc = ec2.Vpc(
            self,
            "Vpc",
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

        CfnOutput(
            self,
            "VpcId",
            value=self.vpc.vpc_id,
            description="VPC ID for center/backend workloads.",
            export_name="SentinelNetVpcId",
        )
        CfnOutput(
            self,
            "PrivateSubnetIds",
            value=",".join(s.subnet_id for s in self.vpc.private_subnets),
            description="Comma-separated private subnet IDs.",
            export_name="SentinelNetPrivateSubnetIds",
        )
        CfnOutput(
            self,
            "PublicSubnetIds",
            value=",".join(s.subnet_id for s in self.vpc.public_subnets),
            description="Comma-separated public subnet IDs.",
            export_name="SentinelNetPublicSubnetIds",
        )
