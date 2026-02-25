from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    aws_rds as rds,
    aws_dynamodb as dynamodb,
    RemovalPolicy,
    Duration,
)
from constructs import Construct
from aws_cdk import Stack
from aws_cdk import aws_ec2 as ec2, aws_ecs as ecs, aws_elasticloadbalancingv2 as elbv2, aws_iam as iam
from constructs import Construct

class BackendStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, vpc: ec2.Vpc, private_subnet_ids: list, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ECS Cluster
        cluster = ecs.Cluster(self, "BackendCluster", vpc=vpc)

        # Fargate Task Definition for Grafana
        task_def = ecs.FargateTaskDefinition(self, "GrafanaTaskDef")
        task_def.add_container(
            "GrafanaContainer",
            image=ecs.ContainerImage.from_registry("grafana/grafana"),
            port_mappings=[ecs.PortMapping(container_port=3000)],
        )

        # Fargate Service in private subnet
        service = ecs.FargateService(
            self,
            "GrafanaService",
            cluster=cluster,
            task_definition=task_def,
            vpc_subnets=ec2.SubnetSelection(subnet_ids=private_subnet_ids),
            assign_public_ip=False,
        )

        # Application Load Balancer in private subnet
        lb = elbv2.ApplicationLoadBalancer(
            self,
            "GrafanaLB",
            vpc=vpc,
            internet_facing=False,
            vpc_subnets=ec2.SubnetSelection(subnet_ids=private_subnet_ids),
        )
        listener = lb.add_listener("GrafanaListener", port=80)
        listener.add_targets(
            "GrafanaTarget",
            port=3000,
            targets=[service],
        )

        # Output the Load Balancer DNS
        from aws_cdk import CfnOutput
        CfnOutput(
            self,
            "GrafanaEndpoint",
            value=lb.load_balancer_dns_name,
            description="Grafana ALB endpoint (private)",
        )
        
        thehive_sg = ec2.SecurityGroup(
            self, "TheHiveSecurityGroup",
            vpc=vpc,
            description="Allow SSH and Web access for TheHive",
            allow_all_outbound=True
        )
        thehive_sg.add_ingress_rule(
            ec2.Peer.any_ipv4(), ec2.Port.tcp(22), "Allow SSH"
        )
        thehive_sg.add_ingress_rule(
            ec2.Peer.any_ipv4(), ec2.Port.tcp(9000), "Allow TheHive web UI"
        )

        machine_image = ec2.MachineImage.from_ssm_parameter(
            "/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id",
            os=ec2.OperatingSystemType.LINUX
        )

        thehive_instance = ec2.Instance(
            self, "TheHiveInstance",
            instance_type=ec2.InstanceType("t3.medium"),
            machine_image=machine_image,
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_ids=private_subnet_ids),
            security_group=thehive_sg,
        )

        thehive_instance.role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSSMManagedInstanceCore")
        )

        CfnOutput(
            self, "TheHivePrivateIP",
            value=thehive_instance.instance_private_ip,
            description="The private IP address of TheHive EC2 instance",
            export_name="TheHiveInstancePrivateIP"
        )
