"""
GrafanaConstruct — ECS Fargate + internal ALB for Grafana.

Deploys Grafana as a Fargate service behind an internal Application Load Balancer:
  - ECS Cluster
  - Fargate task definition (grafana:latest from ECR Public)
  - Fargate service (public IP to pull image without NAT)
  - Internal ALB on port 80 → container port 3000

Constructor args:
  vpc            — ec2.Vpc — the VPC
  public_subnets — list[ec2.ISubnet] — subnets for the service and ALB

Exposes:
  self.lb_dns   — str — the ALB DNS name (used for CfnOutput)
  self.service  — ecs.FargateService
"""

from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_ecs as ecs
from aws_cdk import aws_elasticloadbalancingv2 as elbv2
from constructs import Construct


class GrafanaConstruct(Construct):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.Vpc,
        public_subnets: list,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # TODO: move ECS cluster, task def, Fargate service, ALB here from BackendStack
        self.service: ecs.FargateService = None  # type: ignore
        self.lb_dns: str = None  # type: ignore
