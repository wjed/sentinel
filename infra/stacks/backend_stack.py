"""
Backend Stack — SentinelNet (Scaffolding).

Future purpose: Compute, APIs, orchestration.
This stack is INTENTIONALLY EMPTY. No AWS resources are defined.
"""

from aws_cdk import (
    Stack,
    aws_dynamodb as dynamodb,
    aws_rds as rds,
    aws_ec2 as ec2,
    Tags,
    RemovalPolicy
)
from constructs import Construct

class DataStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, vpc: ec2.Vpc, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. DynamoDB Table (Security Telemetry)
        # We tag this specifically as 'Internal' and 'Telemetry'
        telemetry_table = dynamodb.Table(
            self, "SentinelNet-Telemetry",
            partition_key=dynamodb.Attribute(name="tenant_id", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="timestamp", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN # Safety for project data
        )
        
        # Apply specific data tags
        Tags.of(telemetry_table).add("Tier", "Internal-Data")
        Tags.of(telemetry_table).add("Service", "Telemetry-Storage")

        # 2. RDS Instance (Case Management)
        # We tag this to distinguish from the high-volume DynamoDB costs
        case_db = rds.DatabaseInstance(
            self, "SentinelNet-Cases",
            engine=rds.DatabaseInstanceEngine.mysql(version=rds.MysqlEngineVersion.VER_8_0),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PRIVATE_ISOLATED),
            instance_type=ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO)
        )

        # Apply specific data tags
        Tags.of(case_db).add("Tier", "Internal-Data")
        Tags.of(case_db).add("Service", "Case-Management-DB")