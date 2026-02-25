# from aws_cdk import Stack
# from aws_cdk import aws_ec2 as ec2, aws_ecs as ecs, aws_elasticloadbalancingv2 as elbv2
# from constructs import Construct

# class BackendStack(Stack):
#     def __init__(self, scope: Construct, construct_id: str, vpc: ec2.Vpc, private_subnet_ids: list, **kwargs) -> None:
#         super().__init__(scope, construct_id, **kwargs)

#         # ECS Cluster
#         cluster = ecs.Cluster(self, "BackendCluster", vpc=vpc)

#         # Fargate Task Definition for Grafana
#         task_def = ecs.FargateTaskDefinition(self, "GrafanaTaskDef")
#         task_def.add_container(
#             "GrafanaContainer",
#             image=ecs.ContainerImage.from_registry("grafana/grafana"),
#             port_mappings=[ecs.PortMapping(container_port=3000)],
#         )

#         # Fargate Service in private subnet
#         service = ecs.FargateService(
#             self,
#             "GrafanaService",
#             cluster=cluster,
#             task_definition=task_def,
#             vpc_subnets=ec2.SubnetSelection(subnet_ids=private_subnet_ids),
#             assign_public_ip=False,
#         )

#         # Application Load Balancer in private subnet
#         lb = elbv2.ApplicationLoadBalancer(
#             self,
#             "GrafanaLB",
#             vpc=vpc,
#             internet_facing=False,
#             vpc_subnets=ec2.SubnetSelection(subnet_ids=private_subnet_ids),
#         )
#         listener = lb.add_listener("GrafanaListener", port=80)
#         listener.add_targets(
#             "GrafanaTarget",
#             port=3000,
#             targets=[service],
#         )

#         # Output the Load Balancer DNS
#         from aws_cdk import CfnOutput
#         CfnOutput(
#             self,
#             "GrafanaEndpoint",
#             value=lb.load_balancer_dns_name,
#             description="Grafana ALB endpoint (private)",
#         )
