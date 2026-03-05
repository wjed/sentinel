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

        # TODO: move RDS instance + security group here from BackendStack
        self.instance: rds.DatabaseInstance = None  # type: ignore
        self.security_group: ec2.SecurityGroup = None  # type: ignore
