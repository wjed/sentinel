from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    Tags
)
from constructs import Construct

class NetworkStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. Define the 3-Tier VPC Architecture across 2 AZs
        self.vpc = ec2.Vpc(
            self, "SentinelNetVPC",
            ip_addresses=ec2.IpAddresses.cidr("10.0.0.0/16"),
            max_azs=2,  # Spreads subnets across 2 AZs for High Availability
            
            # NAT Gateway Configuration:
            # - Use 1 NAT Gateway to save cost in Dev (shared across AZs)
            # - Use 2 (one per AZ) for full Production redundancy
            nat_gateways=1, 
            
            subnet_configuration=[
                # PUBLIC: DMZ for Load Balancers, API Gateway, and NAT Gateway
                ec2.SubnetConfiguration(
                    name="Public-Ingress",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24 # 256 IPs per AZ
                ),
                # PRIVATE: Logic tier for Wazuh Manager, TheHive, and Lambdas
                ec2.SubnetConfiguration(
                    name="Private-App",
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidr_mask=24
                ),
                # ISOLATED: Database tier for RDS MySQL and DynamoDB
                ec2.SubnetConfiguration(
                    name="Isolated-Data",
                    subnet_type=ec2.SubnetType.PRIVATE_ISOLATED,
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
        )
        # 2. Project-Wide Cost Tagging
        Tags.of(self).add("Project", "SentinelNet")
