from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    Tags,
)
from constructs import Construct


class NetworkStack(Stack):
    """CloudFormation stack that provisions the VPC and helpers."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
            super().__init__(scope, construct_id, **kwargs)

            # - ip_addresses: VPC CIDR block
            # - max_azs: number of AZs to create subnets in (HA across AZs)
            # - nat_gateways: number of NAT gateways to create (1 saves cost)
            # - subnet_configuration: logical subnet groups; CDK expands these
            #   per AZ up to `max_azs` (so each entry creates N subnets).
            self.vpc = ec2.Vpc(
                self,
                "SentinelNetVPC",
                ip_addresses=ec2.IpAddresses.cidr("10.0.0.0/16"),
                max_azs=2,
                nat_gateways=1,  # change to 2 for production AZ-redundant NATs
                subnet_configuration=[
                    # PUBLIC: for load balancers, bastions, NAT EIPs
                    ec2.SubnetConfiguration(
                        name="Public-Ingress",
                        subnet_type=ec2.SubnetType.PUBLIC,
                        cidr_mask=24,
                    ),

                    # PRIVATE_WITH_EGRESS: app/service tier that requires
                    # outbound internet via NAT (e.g., to pull updates)
                    ec2.SubnetConfiguration(
                        name="Private-App",
                        subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                        cidr_mask=24,
                    ),

                    # PRIVATE_ISOLATED: no internet; ideal for databases/storage
                    ec2.SubnetConfiguration(
                        name="Isolated-Data",
                        subnet_type=ec2.SubnetType.PRIVATE_ISOLATED,
                        cidr_mask=24,
                    ),

                    # Additional logical separation for other app components
                    ec2.SubnetConfiguration(
                        name="Private-App-Logic",
                        subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                        cidr_mask=24,
                    ),
                ],
            )

            # Adds a project tag to resources created by this stack (where
            # supported) so you can filter and allocate costs in AWS console.
            Tags.of(self).add("Project", "SentinelNet")

            # 3) VPC Endpoints

            # - Gateway endpoint (S3) lets isolated subnets access S3 without
            #   routing through NAT Gateways (saves cost and keeps traffic
            #   within AWS network).
            # - Interface endpoints provide private connectivity to many
            #   AWS services (e.g., Secrets Manager, ECR).
            self.vpc.add_gateway_endpoint(
                "S3Endpoint",
                service=ec2.GatewayVpcEndpointAwsService.S3,
                # Restrict to isolated subnets where possible
                subnets=[
                    ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_ISOLATED)
                ],
            )

            # Interface endpoint example (Secrets Manager). CDK will create
            # ENIs in the selected subnets so your isolated workloads can
            # reach the service privately.
            self.vpc.add_interface_endpoint(
                "SecretsManagerEndpoint",
                service=ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
                # Optionally restrict which subnets the endpoint is placed in
                subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS),
                private_dns_enabled=True,
            )
