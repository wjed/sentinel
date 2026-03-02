"""
Backend Stack — ECS Fargate + ALB (e.g. Grafana) in the Network VPC.

Uses public subnets so Fargate tasks can pull the container image without
relying on NAT (avoids timeout/egress issues). ALB stays internal (not internet-facing).
"""

from aws_cdk import CfnOutput, Duration, Stack
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_ecs as ecs
from aws_cdk import aws_elasticloadbalancingv2 as elbv2
from constructs import Construct


class BackendStack(Stack):
    """ECS cluster + Fargate service + internal ALB (e.g. Grafana)."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.IVpc,
        subnets: list,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        subnet_selection = ec2.SubnetSelection(subnets=subnets)

        # ECS Cluster
        cluster = ecs.Cluster(self, "BackendCluster", vpc=vpc)

        # Fargate Task Definition for Grafana
        task_def = ecs.FargateTaskDefinition(self, "GrafanaTaskDef")
        # Use ECR Public so Fargate pulls from AWS (avoids Docker Hub timeout in private subnet)
        task_def.add_container(
            "GrafanaContainer",
            image=ecs.ContainerImage.from_registry("public.ecr.aws/bitnami/grafana:latest"),
            port_mappings=[ecs.PortMapping(container_port=3000)],
        )

        # Fargate Service in public subnet with public IP so it can pull the image (no NAT needed)
        service = ecs.FargateService(
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
            targets=[service],
            health_check=elbv2.HealthCheck(
                path="/api/health",
                interval=Duration.seconds(15),
                timeout=Duration.seconds(5),
                healthy_http_codes="200",
            ),
        )

        CfnOutput(
            self,
            "GrafanaEndpoint",
            value=lb.load_balancer_dns_name,
            description="Grafana ALB endpoint (private)",
        )
