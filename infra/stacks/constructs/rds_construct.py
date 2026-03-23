"""
RdsConstruct — RDS MySQL instance + security group.

Owns the relational database used for structured SOC data:
  - Security group (no inbound by default)
  - RDS MySQL 8.0 instance (internal/isolated subnet)

Constructor args:
  vpc              — ec2.Vpc — the VPC to place the instance in
  internal_subnets — list[ec2.ISubnet] — isolated data subnets

Exposes:
  self.instance        — the RDS DatabaseInstance construct
  self.security_group  — the RDS SecurityGroup construct
"""

from aws_cdk import RemovalPolicy
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_rds as rds
from constructs import Construct


class RdsConstruct(Construct):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.Vpc,
        internal_subnets: list,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.security_group = ec2.SecurityGroup(
            self,
            "RdsSG",
            vpc=vpc,
            description="RDS MySQL — no inbound by default",
            allow_all_outbound=False,
        )

        self.security_group.add_ingress_rule(
            peer=ec2.Peer.ipv4(vpc.vpc_cidr_block),
            connection=ec2.Port.tcp(3306),
            description="MySQL from VPC CIDR",
        )

        subnet_group = rds.SubnetGroup(
            self,
            "RdsSubnetGroup",
            description="Isolated subnets for Sentinel RDS",
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnets=internal_subnets),
            removal_policy=RemovalPolicy.RETAIN,
        )

        self.instance = rds.DatabaseInstance(
            self,
            "RdsInstance",
            engine=rds.DatabaseInstanceEngine.mysql(
                version=rds.MysqlEngineVersion.VER_8_0
            ),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO
            ),
            vpc=vpc,
            subnet_group=subnet_group,
            security_groups=[self.security_group],
            multi_az=False,
            allocated_storage=20,
            storage_encrypted=True,
            deletion_protection=False,
            removal_policy=RemovalPolicy.DESTROY,
            database_name="sentinel",
            credentials=rds.Credentials.from_generated_secret(
                "sentinel_rds_admin",
                secret_name="sentinel/rds/mysql/admin",
            ),
        )
