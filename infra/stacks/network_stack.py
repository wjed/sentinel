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

        # Create a VPC with a fixed CIDR and no automatic subnets so we can
        # create subnets with explicit static CIDR ranges.
        self.vpc = ec2.Vpc(
            self,
            "Vpc",
            cidr="10.0.0.0/16",
            max_azs=2,
            nat_gateways=0,
            subnet_configuration=[],
        )

        # Create explicit static subnets using L2 constructs.
        # Use one public and one private subnet per AZ (two AZs total).
        azs = self.availability_zones[:2]

        # Public: 10.0.0.0/24, 10.0.2.0/24
        # Private: 10.0.1.0/24, 10.0.3.0/24
        public_cidrs = ["10.0.0.0/24", "10.0.2.0/24"]
        private_cidrs = ["10.0.1.0/24", "10.0.3.0/24"]

        public_subnets = []
        private_subnets = []

        for idx, az in enumerate(azs):
            pub = ec2.PublicSubnet(
                self,
                f"PublicSubnet{idx+1}",
                vpc_id=self.vpc.vpc_id,
                availability_zone=az,
                cidr_block=public_cidrs[idx],
                map_public_ip_on_launch=True,
            )
            public_subnets.append(pub)

            priv = ec2.PrivateSubnet(
                self,
                f"PrivateSubnet{idx+1}",
                vpc_id=self.vpc.vpc_id,
                availability_zone=az,
                cidr_block=private_cidrs[idx],
            )
            private_subnets.append(priv)

        # Internal data subnets (isolated from internet). No default route to NAT/IGW.
        internal_cidrs = ["10.0.4.0/24", "10.0.5.0/24"]
        internal_subnets = []
        for idx, az in enumerate(azs):
            internal = ec2.PrivateSubnet(
                self,
                f"InternalSubnet{idx+1}",
                vpc_id=self.vpc.vpc_id,
                availability_zone=az,
                cidr_block=internal_cidrs[idx],
            )
            internal_subnets.append(internal)

        # Internet Gateway for public subnets
        igw = ec2.CfnInternetGateway(self, "InternetGateway")
        ec2.CfnVPCGatewayAttachment(
            self,
            "IGWAttachment",
            vpc_id=self.vpc.vpc_id,
            internet_gateway_id=igw.ref,
        )

        # Public route table -> IGW
        public_rt = ec2.CfnRouteTable(
            self, "PublicRouteTable", vpc_id=self.vpc.vpc_id
        )
        ec2.CfnRoute(
            self,
            "PublicDefaultRoute",
            route_table_id=public_rt.ref,
            destination_cidr_block="0.0.0.0/0",
            gateway_id=igw.ref,
        )

        # Associate public subnets with public route table
        for idx, pub in enumerate(public_subnets):
            ec2.CfnSubnetRouteTableAssociation(
                self,
                f"PublicRTA{idx+1}",
                route_table_id=public_rt.ref,
                subnet_id=pub.subnet_id,
            )

        # Create an Elastic IP and NAT Gateway in the first public subnet
        nat_eip = ec2.CfnEIP(self, "NatEip", domain="vpc")
        nat_gw = ec2.CfnNatGateway(
            self,
            "NatGateway",
            allocation_id=nat_eip.attr_allocation_id,
            subnet_id=public_subnets[0].subnet_id,
        )

        # Private route table -> NAT
        private_rt = ec2.CfnRouteTable(
            self, "PrivateRouteTable", vpc_id=self.vpc.vpc_id
        )
        ec2.CfnRoute(
            self,
            "PrivateDefaultRoute",
            route_table_id=private_rt.ref,
            destination_cidr_block="0.0.0.0/0",
            nat_gateway_id=nat_gw.ref,
        )

        # Associate private subnets with private route table
        for idx, priv in enumerate(private_subnets):
            ec2.CfnSubnetRouteTableAssociation(
                self,
                f"PrivateRTA{idx+1}",
                route_table_id=private_rt.ref,
                subnet_id=priv.subnet_id,
            )

        # Internal route table (no internet egress)
        internal_rt = ec2.CfnRouteTable(
            self, "InternalRouteTable", vpc_id=self.vpc.vpc_id
        )
        for idx, internal in enumerate(internal_subnets):
            ec2.CfnSubnetRouteTableAssociation(
                self,
                f"InternalRTA{idx+1}",
                route_table_id=internal_rt.ref,
                subnet_id=internal.subnet_id,
            )

        # Expose lists for other stacks to reference (wrap L1 ids into higher-level structures)
        # Create simple wrappers so other code expecting VPC subnets can still access ids
        # Note: these are Cfn-level resources; their `.ref` yields the subnet id.
        # expose subnet ids lists
        self.public_subnet_ids = [s.subnet_id for s in public_subnets]
        self.private_subnet_ids = [s.subnet_id for s in private_subnets]
        self.internal_subnet_ids = [s.subnet_id for s in internal_subnets]

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
            value=",".join(self.private_subnet_ids),
            description="Comma-separated private subnet IDs.",
            export_name="SentinelNetPrivateSubnetIds",
        )
        CfnOutput(
            self,
            "PublicSubnetIds",
            value=",".join(self.public_subnet_ids),
            description="Comma-separated public subnet IDs.",
            export_name="SentinelNetPublicSubnetIds",
        )
