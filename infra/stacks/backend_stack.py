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
    def __init__(self, scope: Construct, construct_id: str, vpc: ec2.Vpc, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Wrap the internal subnet IDs into a SubnetSelection CDK can use
        internal_subnets = ec2.SubnetSelection(
            subnets=[
                ec2.Subnet.from_subnet_id(self, f"InternalSubnet{i}", subnet_id)
                for i, subnet_id in enumerate(internal_subnet_ids)
            ]
        )

        # ─────────────────────────────────────────────
        # DynamoDB — Telemetry Storage (Isolated Data Subnet)
        # Fully Managed | No VPC placement required
        # ─────────────────────────────────────────────
        telemetry_table = dynamodb.Table(
            self, "TelemetryTable",
            table_name="sentinel-telemetry",
            partition_key=dynamodb.Attribute(
                name="id",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="timestamp",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,  # No capacity planning needed
            removal_policy=RemovalPolicy.DESTROY,  # Change to RETAIN for production
        )

        # ─────────────────────────────────────────────
        # RDS MySQL — Relational Data (Isolated Data Subnet)
        # Fully Managed
        # ─────────────────────────────────────────────

        # Security group — no inbound by default (isolated)
        rds_sg = ec2.SecurityGroup(
            self, "RDSSecurityGroup",
            vpc=vpc,
            description="Security group for RDS MySQL (isolated data subnet)",
            allow_all_outbound=False,
        )

        rds_instance = rds.DatabaseInstance(
            self, "SentinelMySQL",
            engine=rds.DatabaseInstanceEngine.mysql(
                version=rds.MysqlEngineVersion.VER_8_0
            ),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.T3, ec2.InstanceSize.MICRO
            ),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_ISOLATED),
            security_groups=[rds_sg],
            database_name="sentineldb",
            instance_identifier="sentinel-mysql",
            multi_az=False,              # Set True for production HA
            allocated_storage=20,        # GB
            max_allocated_storage=100,   # Auto-scaling cap in GB
            backup_retention=Duration.days(7),
            deletion_protection=False,   # Set True for production
            removal_policy=RemovalPolicy.DESTROY,  # Change to RETAIN for production
        )

        # ─────────────────────────────────────────────
        # Expose resources for cross-stack references
        # ─────────────────────────────────────────────
        self.telemetry_table = telemetry_table
        self.rds_instance = rds_instance
        # --- Wazuh Manager EC2 (in private subnet) ---
        # Security group for Wazuh manager (allow agent traffic from inside VPC)
        wazuh_sg = ec2.SecurityGroup(
            self,
            "WazuhManagerSG",
            vpc=vpc,
            description="Allow Wazuh agent traffic from VPC and SSM",
            allow_all_outbound=True,
        )
        # Wazuh manager default ports: 1514 (tcp/udp) for agent data, 1515 (tcp) for registration
        wazuh_sg.add_ingress_rule(ec2.Peer.ipv4(vpc.vpc_cidr_block), ec2.Port.tcp(1514), "Wazuh agent TCP from VPC")
        wazuh_sg.add_ingress_rule(ec2.Peer.ipv4(vpc.vpc_cidr_block), ec2.Port.udp(1514), "Wazuh agent UDP from VPC")
        wazuh_sg.add_ingress_rule(ec2.Peer.ipv4(vpc.vpc_cidr_block), ec2.Port.tcp(1515), "Wazuh registration TCP from VPC")

        # IAM role so the instance can use SSM (no SSH key required by default)
        wazuh_role = iam.Role(
            self,
            "WazuhInstanceRole",
            assumed_by=iam.ServicePrincipal("ec2.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSSMManagedInstanceCore"),
            ],
        )

        # Minimal user-data to install Wazuh manager (placeholder; adapt for chosen distro/version)
        user_data = ec2.UserData.for_linux()
        user_data.add_commands(
            "yum update -y",
            "yum install -y curl",
            "# TODO: add Wazuh repository and install steps for the chosen OS",
            "# Example (RHEL/CentOS/AmazonLinux compatible):",
            "# curl -sO https://packages.wazuh.com/4.x/yum/wazuh-repo-4.x.rpm || true",
            "# rpm -ivh wazuh-repo-4.x.rpm || true",
            "# yum install -y wazuh-manager || true",
            "# systemctl enable --now wazuh-manager || true",
        )

        # Launch the EC2 instance in the provided private subnets
        wazuh_instance = ec2.Instance(
            self,
            "WazuhManagerInstance",
            instance_type=ec2.InstanceType("t3.medium"),
            machine_image=ec2.MachineImage.latest_amazon_linux(
                generation=ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
            ),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_ids=private_subnet_ids),
            security_group=wazuh_sg,
            role=wazuh_role,
            user_data=user_data,
        )

        # Output the Wazuh manager private IP for reference
        CfnOutput(
            self,
            "WazuhManagerPrivateIp",
            value=wazuh_instance.instance_private_ip,
            description="Wazuh Manager private IP",
        )