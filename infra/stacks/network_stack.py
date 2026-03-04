"""
Network Stack — VPC and subnets for the center/backend team.

Deploy with: cdk deploy SentinelNet-Network

Other stacks can reference the VPC via exports or by taking this stack as a dependency.
"""

from aws_cdk import CfnOutput, Stack, Tags
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_rds as rds
from constructs import Construct


class NetworkStack(Stack):
    """VPC with public and private subnets for SentinelNet workloads."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Tag so template changes and CloudFormation can reach UPDATE_COMPLETE after a rollback
        Tags.of(self).add("SentinelNet", "Network")

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
            self, "PublicRouteTable", vpc_id=self.vpc.vpc_id,
            tags=[{"key": "Name", "value": "sentinel-public-rt"}]
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
            self, "PrivateRouteTable", vpc_id=self.vpc.vpc_id,
            tags=[{"key": "Name", "value": "sentinel-private-rt"}]
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
            self, "InternalRouteTable", vpc_id=self.vpc.vpc_id,
            tags=[{"key": "Name", "value": "sentinel-internal-rt"}]
        )
        for idx, internal in enumerate(internal_subnets):
            ec2.CfnSubnetRouteTableAssociation(
                self,
                f"InternalRTA{idx+1}",
                route_table_id=internal_rt.ref,
                subnet_id=internal.subnet_id,
            )

        # Expose subnet lists and IDs for other stacks
        self.public_subnets = public_subnets
        self.private_subnets = private_subnets
        self.internal_subnets = internal_subnets
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

        # ── DynamoDB VPC Endpoint (Gateway) ───────────────────────────────────
        # Allows the isolated internal subnets to reach DynamoDB without any
        # internet egress.  The endpoint is added to the internal route table.
        dynamo_endpoint = self.vpc.add_gateway_endpoint(
            "DynamoDbEndpoint",
            service=ec2.GatewayVpcEndpointAwsService.DYNAMODB,
            # Restrict to the isolated data subnets only
            subnets=[
                ec2.SubnetSelection(
                    subnets=internal_subnets
                )
            ],
        )

        CfnOutput(
            self,
            "DynamoDbEndpointId",
            value=dynamo_endpoint.vpc_endpoint_id,
            description="DynamoDB Gateway VPC Endpoint ID (isolated data tier).",
            export_name="SentinelNetDynamoDbEndpointId",
        )

        # ── RDS MySQL (Isolated Data subnet tier) ─────────────────────────────
        # Security group: only allow MySQL traffic (3306) from within the VPC.
        self.rds_sg = ec2.SecurityGroup(
            self,
            "RdsMySqlSg",
            vpc=self.vpc,
            description="Allow MySQL (3306) inbound from within the VPC only.",
            allow_all_outbound=False,
        )
        self.rds_sg.add_ingress_rule(
            peer=ec2.Peer.ipv4(self.vpc.vpc_cidr_block),
            connection=ec2.Port.tcp(3306),
            description="MySQL from VPC CIDR",
        )

        # Subnet group: pin the RDS instance to the isolated internal subnets.
        rds_subnet_group = rds.SubnetGroup(
            self,
            "RdsMySqlSubnetGroup",
            description="Isolated data subnets for RDS MySQL.",
            vpc=self.vpc,
            vpc_subnets=ec2.SubnetSelection(subnets=internal_subnets),
            removal_policy=RemovalPolicy.RETAIN,
        )

        # RDS MySQL 8.0 Multi-AZ instance.
        # Credentials are auto-generated and stored in AWS Secrets Manager.
        self.rds_instance = rds.DatabaseInstance(
            self,
            "RdsMySqlInstance",
            engine=rds.DatabaseInstanceEngine.mysql(
                version=rds.MysqlEngineVersion.VER_8_0
            ),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MEDIUM
            ),
            vpc=self.vpc,
            subnet_group=rds_subnet_group,
            security_groups=[self.rds_sg],
            multi_az=True,
            allocated_storage=20,          # GiB – increase for production
            storage_encrypted=True,
            deletion_protection=True,
            removal_policy=RemovalPolicy.RETAIN,
            database_name="sentinel",
            credentials=rds.Credentials.from_generated_secret(
                "sentinel_rds_admin",
                secret_name="sentinel/rds/mysql/admin",
            ),
        )

        CfnOutput(
            self,
            "RdsMySqlEndpoint",
            value=self.rds_instance.db_instance_endpoint_address,
            description="RDS MySQL endpoint hostname.",
            export_name="SentinelNetRdsMySqlEndpoint",
        )
        CfnOutput(
            self,
            "RdsMySqlPort",
            value=self.rds_instance.db_instance_endpoint_port,
            description="RDS MySQL port (3306).",
            export_name="SentinelNetRdsMySqlPort",
        )
        CfnOutput(
            self,
            "RdsMySqlSecretArn",
            value=self.rds_instance.secret.secret_arn,
            description="Secrets Manager ARN for RDS MySQL admin credentials.",
            export_name="SentinelNetRdsMySqlSecretArn",
        )
