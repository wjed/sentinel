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
from aws_cdk import Duration
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_ecs as ecs
from aws_cdk import aws_sqs as sqs
from aws_cdk import aws_elasticloadbalancingv2 as elbv2
from constructs import Construct

class HiveConstruct(Construct):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.Vpc,                   # Input: The VPC
        private_subnets: list,          # Input: Subnets to deploy into
        wazuh_alert_queue: Optional[sqs.Queue] = None, # Input: Queue to read from
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        subnet_selection = ec2.SubnetSelection(subnets=private_subnets)

        # Create the ECS Cluster
        cluster = ecs.Cluster(self, "HiveCluster", vpc=vpc)

        # Define the Fargate Task
        task_def = ecs.FargateTaskDefinition(
            self, "HiveTaskDef", memory_limit_mib=4096, cpu=2048
        )

        # Add TheHive Container
        task_def.add_container(
            "TheHiveContainer",
            image=ecs.ContainerImage.from_registry("strangebee/thehive:5.6.2"),
            port_mappings=[ecs.PortMapping(container_port=9000)],
            environment={"db.url": "http://127.0.0.1:9200"},
        )

        # Add Elasticsearch Sidecar Container
        task_def.add_container(
            "ElasticsearchContainer",
            image=ecs.ContainerImage.from_registry("docker.elastic.co/elasticsearch/elasticsearch:7.17.14"),
            port_mappings=[ecs.PortMapping(container_port=9200)],
            environment={
                "discovery.type": "single-node",
                "xpack.security.enabled": "false",
            },
        )

        # Grant SQS permissions if a queue was provided
        if wazuh_alert_queue:
            wazuh_alert_queue.grant_consume_messages(task_def.task_role)

        # Create Security Group for the Service
        sg = ec2.SecurityGroup(
            self, "HiveSG", vpc=vpc, description="SG for TheHive Fargate service"
        )
        sg.add_ingress_rule(
            ec2.Peer.ipv4(vpc.vpc_cidr_block), ec2.Port.tcp(9000), "Allow VPC access"
        )

        # Create the Fargate Service
        self.service = ecs.FargateService(
            self, "HiveService",
            cluster=cluster,
            task_definition=task_def,
            vpc_subnets=subnet_selection,
            security_groups=[sg],
        )

        # Create an Internal ALB
        lb = elbv2.ApplicationLoadBalancer(
            self, "HiveLB",
            vpc=vpc,
            internet_facing=False,
            vpc_subnets=subnet_selection,
            security_group=ec2.SecurityGroup(self, "HiveLBSG", vpc=vpc)
        )
        lb.connections.allow_from(ec2.Peer.ipv4(vpc.vpc_cidr_block), ec2.Port.tcp(80))
        lb.connections.allow_to(sg, ec2.Port.tcp(9000))

        listener = lb.add_listener("HiveListener", port=80)
        listener.add_targets(
            "HiveTarget",
            port=9000,
            protocol=elbv2.ApplicationProtocol.HTTP,
            targets=[self.service],
            health_check=elbv2.HealthCheck(
                path="/api/v1/about",
                interval=Duration.seconds(30),
            ),
        )

        self.lb_dns = lb.load_balancer_dns_name
