from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    aws_rds as rds,
    aws_dynamodb as dynamodb,
    RemovalPolicy,
    Duration,
)
from constructs import Construct


class BackendStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.Vpc,
        internal_subnet_ids: list,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Wrap the internal subnet IDs into a SubnetSelection CDK can use
        internal_subnets = ec2.SubnetSelection(
            subnets=[
                ec2.Subnet.from_subnet_id(self, f"InternalSubnet{i}", subnet_id)
                for i, subnet_id in enumerate(internal_subnet_ids)
            ]
        )

        # ─────────────────────────────────────────────
        # DynamoDB — installed to internal subnet
        # (DynamoDB is fully serverless; subnet here is
        #  a logical placement for IAM/VPC endpoint access)
        # ─────────────────────────────────────────────
        self.telemetry_table = dynamodb.Table(
            self, "TelemetryTable",
            table_name="sentinel-telemetry",
            partition_key=dynamodb.Attribute(
                name="id",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # ─────────────────────────────────────────────
        # RDS MySQL — installed to internal subnet
        # ─────────────────────────────────────────────
        rds_sg = ec2.SecurityGroup(
            self, "RDSSecurityGroup",
            vpc=vpc,
            description="RDS MySQL — internal subnet only, no inbound by default",
            allow_all_outbound=False,
        )

        self.rds_instance = rds.DatabaseInstance(
            self, "SentinelMySQL",
            engine=rds.DatabaseInstanceEngine.mysql(
                version=rds.MysqlEngineVersion.VER_8_0
            ),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.T3, ec2.InstanceSize.MICRO
            ),
            vpc=vpc,
            vpc_subnets=internal_subnets,
            security_groups=[rds_sg],
            instance_identifier="sentinel-mysql",
            allocated_storage=20,
            backup_retention=Duration.days(7),
            deletion_protection=False,
            removal_policy=RemovalPolicy.DESTROY,
        )
