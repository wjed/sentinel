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

from aws_cdk import Duration
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

        subnet_selection = ec2.SubnetSelection(subnets=public_subnets)

        # ECS Cluster
        cluster = ecs.Cluster(self, "GrafanaCluster", vpc=vpc)

        # Fargate Task Definition for Grafana
        task_def = ecs.FargateTaskDefinition(self, "GrafanaTaskDef")
        task_def.add_container(
            "GrafanaContainer",
            image=ecs.ContainerImage.from_registry("public.ecr.aws/bitnami/grafana:latest"),
            port_mappings=[ecs.PortMapping(container_port=3000)],
        )

        # Fargate Service in public subnet with public IP so it can pull the image (no NAT needed)
        self.service = ecs.FargateService(
            self,
            "GrafanaService",
            cluster=cluster,
            task_definition=task_def,
            vpc_subnets=subnet_selection,
            assign_public_ip=True,
        )

        # Internal ALB (not internet-facing) in same subnets
        lb = elbv2.ApplicationLoadBalancer(
            self,
            "GrafanaLB",
            vpc=vpc,
            internet_facing=False,
            vpc_subnets=subnet_selection,
        )
        listener = lb.add_listener("GrafanaListener", port=80)
        listener.add_targets(
            "GrafanaTarget",
            port=3000,
            protocol=elbv2.ApplicationProtocol.HTTP,
            targets=[self.service],
            health_check=elbv2.HealthCheck(
                path="/api/health",
                interval=Duration.seconds(15),
                timeout=Duration.seconds(5),
                healthy_http_codes="200",
            ),
        )

        self.lb_dns = lb.load_balancer_dns_name
