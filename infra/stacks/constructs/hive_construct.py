"""
HiveConstruct — TheHive SOC case management platform on ECS Fargate.

Deploys TheHive (strangebee/thehive) with an Elasticsearch sidecar in the same
Fargate task, behind an internal ALB. Runs in private subnets — not internet-facing.

Ports:
  9000 — TheHive web UI / REST API  (exposed via internal ALB)
  9200 — Elasticsearch              (internal to the task only, not exposed on the SG)

Constructor args:
  vpc             — ec2.Vpc — the VPC
  private_subnets — list[ec2.ISubnet] — private subnets for the service and ALB
  wazuh_alert_queue (optional) — sqs.Queue — grants TheHive task role SQS read
                                               so Wazuh alerts can be correlated

Exposes:
  self.service  — ecs.FargateService
  self.lb_dns   — str — internal ALB DNS name (used for CfnOutput)
"""

from typing import Optional

from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_ecs as ecs
from aws_cdk import aws_sqs as sqs
from constructs import Construct


class HiveConstruct(Construct):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.Vpc,
        private_subnets: list,
        wazuh_alert_queue: Optional[sqs.Queue] = None,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # TODO: implement ECS cluster, Fargate task (TheHive + Elasticsearch sidecar),
        #       internal ALB, security group (inbound 9000 from VPC CIDR only),
        #       and optional SQS read grant for the task role.
        self.service: ecs.FargateService = None  # type: ignore
        self.lb_dns: str = None  # type: ignore
