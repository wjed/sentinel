"""
WazuhConstruct — SQS queues + ingest Lambda + Wazuh Manager EC2.

Owns all Wazuh-related infrastructure:
  - SQS alert queue + dead-letter queue
  - Lambda ingest function (SQS → DynamoDB)
  - Wazuh Manager EC2 instance (private subnet)
  - IAM roles and security groups for the above

Constructor args:
  vpc               — ec2.Vpc — the VPC to place resources in
  private_subnets   — list[ec2.ISubnet] — subnets for the EC2 instance
  table           — dynamodb.Table — TelemetryConstruct.table, destination for ingested alerts
  kms_key         — kms.Key — TelemetryConstruct.kms_key, used to grant encrypt/decrypt to the Lambda

Exposes:
  self.alert_queue  — the main SQS queue
  self.alert_dlq    — the dead-letter queue
  self.ingest_fn    — the Lambda ingest function
  self.instance     — the Wazuh Manager EC2 instance
"""

from os import path

from aws_cdk import Duration, RemovalPolicy
from aws_cdk import aws_dynamodb as dynamodb
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_iam as iam
from aws_cdk import aws_kms as kms
from aws_cdk import aws_lambda as lambda_
from aws_cdk import aws_lambda_event_sources as lambda_event_sources
from aws_cdk import aws_sqs as sqs
from constructs import Construct


def render_file_command(destination: str, contents: str) -> str:
    normalized_contents = contents.replace("\r\n", "\n").rstrip("\n")
    return f"cat <<'EOF' > {destination}\n{normalized_contents}\nEOF"


class WazuhConstruct(Construct):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.Vpc,
        private_subnets: list,
        table: dynamodb.Table,
        kms_key: kms.Key,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)
        repo_root = path.abspath(path.join(path.dirname(__file__), "..", "..", ".."))
        wazuh_forwarder_dir = path.join(repo_root, "backend", "wazuh_forwarder")

        self.alert_dlq = sqs.Queue(
            self,
            "WazuhAlertsDLQ",
            queue_name="sentinel-wazuh-alerts-dlq",
            retention_period=Duration.days(14),
            encryption=sqs.QueueEncryption.SQS_MANAGED,
            enforce_ssl=True,
        )
        self.alert_dlq.apply_removal_policy(RemovalPolicy.DESTROY)

        self.alert_queue = sqs.Queue(
            self,
            "WazuhAlertsQueue",
            queue_name="sentinel-wazuh-alerts",
            retention_period=Duration.days(4),
            visibility_timeout=Duration.seconds(120),
            dead_letter_queue=sqs.DeadLetterQueue(
                queue=self.alert_dlq,
                max_receive_count=5,
            ),
            encryption=sqs.QueueEncryption.SQS_MANAGED,
            enforce_ssl=True,
        )
        self.alert_queue.apply_removal_policy(RemovalPolicy.DESTROY)

        self.ingest_fn = lambda_.Function(
            self,
            "WazuhIngestFunction",
            function_name="sentinel-wazuh-ingest",
            runtime=lambda_.Runtime.PYTHON_3_11,
            handler="handler.handler",
            code=lambda_.Code.from_asset(
                path.abspath(
                    path.join(
                        path.dirname(__file__),
                        "..",
                        "..",
                        "..",
                        "backend",
                        "lambda",
                        "wazuh_ingest",
                    )
                )
            ),
            timeout=Duration.seconds(60),
            memory_size=256,
            environment={
                "TABLE_NAME": table.table_name,
                "RETENTION_DAYS": "30",
            },
        )

        self.alert_queue.grant_consume_messages(self.ingest_fn)
        self.ingest_fn.add_event_source(
            lambda_event_sources.SqsEventSource(
                self.alert_queue,
                batch_size=10,
                report_batch_item_failures=True,
            )
        )

        self.ingest_fn.add_to_role_policy(
            iam.PolicyStatement(
                actions=["dynamodb:PutItem", "dynamodb:BatchWriteItem"],
                resources=[table.table_arn],
            )
        )
        kms_key.grant_encrypt_decrypt(self.ingest_fn)

        wazuh_sg = ec2.SecurityGroup(
            self,
            "WazuhManagerSG",
            vpc=vpc,
            description="Wazuh Manager internal subnet only, no inbound by default",
            allow_all_outbound=False,
        )
        wazuh_sg.add_ingress_rule(
            ec2.Peer.ipv4(vpc.vpc_cidr_block),
            ec2.Port.tcp(1514),
            "Wazuh agent TCP from VPC",
        )
        wazuh_sg.add_ingress_rule(
            ec2.Peer.ipv4(vpc.vpc_cidr_block),
            ec2.Port.udp(1514),
            "Wazuh agent UDP from VPC",
        )
        wazuh_sg.add_ingress_rule(
            ec2.Peer.ipv4(vpc.vpc_cidr_block),
            ec2.Port.tcp(1515),
            "Wazuh registration TCP from VPC",
        )

        wazuh_role = iam.Role(
            self,
            "WazuhInstanceRole",
            assumed_by=iam.ServicePrincipal("ec2.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "AmazonSSMManagedInstanceCore"
                ),
            ],
        )
        wazuh_role.add_to_policy(
            iam.PolicyStatement(
                actions=["sqs:SendMessage", "sqs:SendMessageBatch"],
                resources=[self.alert_queue.queue_arn],
            )
        )

        with open(
            path.join(wazuh_forwarder_dir, "wazuh_to_sqs.py"),
            encoding="utf-8",
        ) as forwarder_file:
            forwarder_script = forwarder_file.read()

        with open(
            path.join(wazuh_forwarder_dir, "sentinel-wazuh-forwarder.service"),
            encoding="utf-8",
        ) as service_file:
            forwarder_service = service_file.read()

        forwarder_env = "\n".join(
            [
                f"WAZUH_ALERT_QUEUE_URL={self.alert_queue.queue_url}",
                "WAZUH_ALERTS_FILE=/var/ossec/logs/alerts/alerts.json",
                "WAZUH_STATE_FILE=/var/lib/sentinel/wazuh-forwarder-state.json",
                "WAZUH_BATCH_SIZE=10",
                "WAZUH_POLL_INTERVAL_SECONDS=2.0",
            ]
        )

        user_data = ec2.UserData.for_linux()
        user_data.add_commands(
            "yum update -y",
            "yum install -y curl python3 python3-pip",
            "python3 -c \"import boto3\" || python3 -m pip install boto3",
            "mkdir -p /opt/sentinel /etc/sentinel /var/lib/sentinel",
            render_file_command("/opt/sentinel/wazuh_to_sqs.py", forwarder_script),
            "chmod 0755 /opt/sentinel/wazuh_to_sqs.py",
            render_file_command("/etc/sentinel/wazuh-forwarder.env", forwarder_env),
            "chmod 0644 /etc/sentinel/wazuh-forwarder.env",
            render_file_command(
                "/etc/systemd/system/sentinel-wazuh-forwarder.service",
                forwarder_service,
            ),
            "chmod 0644 /etc/systemd/system/sentinel-wazuh-forwarder.service",
            "systemctl daemon-reload",
            "systemctl enable sentinel-wazuh-forwarder.service",
            (
                "systemctl restart sentinel-wazuh-forwarder.service "
                "|| systemctl start sentinel-wazuh-forwarder.service"
            ),
            "# TODO: add Wazuh repository and install steps for the chosen OS",
            "# Example (RHEL/CentOS/AmazonLinux compatible):",
            "# curl -sO https://packages.wazuh.com/4.x/yum/wazuh-repo-4.x.rpm || true",
            "# rpm -ivh wazuh-repo-4.x.rpm || true",
            "# yum install -y wazuh-manager || true",
            "# systemctl enable --now wazuh-manager || true",
        )

        self.instance = ec2.Instance(
            self,
            "WazuhManagerInstance",
            instance_type=ec2.InstanceType("t3.medium"),
            machine_image=ec2.MachineImage.latest_amazon_linux2(),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnets=private_subnets),
            security_group=wazuh_sg,
            role=wazuh_role,
            user_data=user_data,
        )
