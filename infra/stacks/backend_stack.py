from aws_cdk import CfnOutput, Stack
from aws_cdk import aws_ec2 as ec2
from constructs import Construct

from .constructs import (
    HiveConstruct,
    TelemetryConstruct,
    RdsConstruct,
    GrafanaConstruct,
    WazuhConstruct,
)


class BackendStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.Vpc,
        private_subnet_ids: list,
        internal_subnet_ids: list,
        public_subnet_ids: list = None,  # For ECS/Grafana
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        azs = self.availability_zones
        
        private_subnets = [
            ec2.Subnet.from_subnet_attributes(
                self, f"PrivateSubnetRef{idx+1}",
                subnet_id=subnet_id, availability_zone=azs[idx % len(azs)]
            ) for idx, subnet_id in enumerate(private_subnet_ids)
        ]
        
        internal_subnets = [
            ec2.Subnet.from_subnet_attributes(
                self, f"InternalSubnetRef{idx+1}",
                subnet_id=subnet_id, availability_zone=azs[idx % len(azs)]
            ) for idx, subnet_id in enumerate(internal_subnet_ids)
        ]

        # 1. Telemetry
        telemetry = TelemetryConstruct(self, "Telemetry")

        # 2. Wazuh
        wazuh = WazuhConstruct(
            self, "Wazuh",
            vpc=vpc,
            private_subnets=private_subnets,
            table=telemetry.table,
            kms_key=telemetry.kms_key,
        )

        # 3. RDS
        rds_construct = RdsConstruct(
            self, "Rds",
            vpc=vpc,
            internal_subnets=internal_subnets,
        )

        # 4. Grafana
        if public_subnet_ids:
            public_subnets = [
                ec2.Subnet.from_subnet_attributes(
                    self, f"PublicSubnetRef{idx+1}",
                    subnet_id=subnet_id, availability_zone=azs[idx % len(azs)]
                ) for idx, subnet_id in enumerate(public_subnet_ids)
            ]

            grafana = GrafanaConstruct(
                self, "Grafana",
                vpc=vpc,
                public_subnets=public_subnets,
            )

            CfnOutput(self, "GrafanaEndpoint", value=grafana.lb_dns)

        # 5. TheHive
        hive = HiveConstruct(
            self, "TheHive",
            vpc=vpc,
            private_subnets=private_subnets,
            wazuh_alert_queue=wazuh.alert_queue,
        )

        # Expose Outputs
        CfnOutput(self, "WazuhManagerPrivateIp", value=wazuh.instance.instance_private_ip)
        CfnOutput(self, "HiveEndpoint", value=hive.lb_dns)
        CfnOutput(self, "TelemetryTableName", value=telemetry.table.table_name)
        CfnOutput(self, "WazuhAlertsQueueUrl", value=wazuh.alert_queue.queue_url)
        CfnOutput(self, "WazuhAlertsQueueArn", value=wazuh.alert_queue.queue_arn)
        CfnOutput(self, "WazuhAlertsDlqUrl", value=wazuh.alert_dlq.queue_url)
        CfnOutput(self, "WazuhIngestLambdaName", value=wazuh.ingest_fn.function_name)
        
        CfnOutput(self, "RdsMySqlEndpoint", value=rds_construct.instance.db_instance_endpoint_address, export_name="SentinelNetRdsMySqlEndpoint")
        CfnOutput(self, "RdsMySqlPort", value=rds_construct.instance.db_instance_endpoint_port, export_name="SentinelNetRdsMySqlPort")
        CfnOutput(self, "RdsMySqlSecretArn", value=rds_construct.instance.secret.secret_arn, export_name="SentinelNetRdsMySqlSecretArn")
