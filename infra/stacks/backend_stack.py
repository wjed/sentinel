"""
Backend Stack — Lightweight POC foundation for SentinelNet.

Provides an empty ECS Cluster and a base Security Group so container
images can be deployed into the VPC when ready.

Future services (not deployed yet):
  - Wazuh Manager (EC2)
  - TheHive (EC2 + docker-compose)
  - Grafana (Fargate)
  - RDS MySQL (t4g.micro)

Deploy with: cdk deploy SentinelNet-Backend
"""

from aws_cdk import CfnOutput, Stack, Tags
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_ecs as ecs
from constructs import Construct


class BackendStack(Stack):
    """Barebones ECS Cluster + Security Group — ready for images."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.Vpc,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        Tags.of(self).add("Project", "SentinelNet")

        # ── ECS Cluster ───────────────────────────────────────────────────────
        self.cluster = ecs.Cluster(
            self,
            "Cluster",
            vpc=vpc,
            cluster_name="sentinel-poc",
            container_insights_v2=ecs.ContainerInsights.DISABLED,
        )

        # ── Base Security Group ───────────────────────────────────────────────
        # Wide-open inside the VPC for POC; lock down per-service later.
        self.base_sg = ec2.SecurityGroup(
            self,
            "BaseSG",
            vpc=vpc,
            description="SentinelNet POC — allows all VPC-internal traffic",
            allow_all_outbound=True,
        )
        self.base_sg.add_ingress_rule(
            ec2.Peer.ipv4(vpc.vpc_cidr_block),
            ec2.Port.all_traffic(),
            "Allow all traffic from within the VPC",
        )

        # ── Outputs ───────────────────────────────────────────────────────────
        CfnOutput(
            self,
            "ClusterName",
            value=self.cluster.cluster_name,
            description="ECS Cluster name — deploy images here.",
            export_name="SentinelNetClusterName",
        )
        CfnOutput(
            self,
            "ClusterArn",
            value=self.cluster.cluster_arn,
            description="ECS Cluster ARN.",
            export_name="SentinelNetClusterArn",
        )
        CfnOutput(
            self,
            "BaseSecurityGroupId",
            value=self.base_sg.security_group_id,
            description="Base SG for backend services.",
            export_name="SentinelNetBaseSGId",
        )
