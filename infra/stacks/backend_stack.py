"""
Backend Stack - Single EC2 running SOC services via docker-compose.

Resources:
  - EC2 (t3.medium, public subnet) running Wazuh + TheHive + Grafana
  - ALB (internet-facing) routing to TheHive + Grafana
  - DynamoDB telemetry table + KMS key for alert storage
  - SQS alert queue + DLQ for Wazuh alert ingestion
  - Lambda function (SQS -> DynamoDB)

Deploy with: cdk deploy SentinelNet-Backend
"""

from pathlib import Path

from aws_cdk import (
    CfnOutput,
    Duration,
    RemovalPolicy,
    Stack,
    Tags,
    aws_cognito as cognito,
    aws_dynamodb as dynamodb,
    aws_ec2 as ec2,
    aws_elasticloadbalancingv2 as elbv2,
    aws_elasticloadbalancingv2_targets as targets,
    aws_iam as iam,
    aws_kms as kms,
    aws_lambda as lambda_,
    aws_lambda_event_sources as events,
    aws_logs as logs,
    aws_s3 as s3,
    aws_sqs as sqs,
)
from constructs import Construct


class BackendStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        vpc: ec2.Vpc,
        user_pool: cognito.UserPool,
        user_pool_domain: cognito.UserPoolDomain,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        repo_root = Path(__file__).resolve().parents[2]
        lambda_dir = str(repo_root / "backend" / "lambda" / "wazuh_ingest")

        # ── Telemetry: S3 Data Lake (Replacing DynamoDB) ──────────────────────
        self.alerts_bucket = s3.Bucket(
            self, "AlertsDataLake",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            enforce_ssl=True,
            lifecycle_rules=[
                s3.LifecycleRule(
                    expiration=Duration.days(1),
                    id="AlertExpiration"
                )
            ]
        )

        # ── SQS: Alert Queue + DLQ ───────────────────────────────────────────
        self.alert_dlq = sqs.Queue(
            self, "AlertDLQ",
            queue_name="sentinel-alerts-dlq",
            retention_period=Duration.days(14),
            enforce_ssl=True,
        )

        self.alert_queue = sqs.Queue(
            self, "AlertQueue",
            queue_name="sentinel-alerts",
            retention_period=Duration.days(4),
            visibility_timeout=Duration.seconds(120),
            dead_letter_queue=sqs.DeadLetterQueue(
                queue=self.alert_dlq, max_receive_count=5),
            enforce_ssl=True,
        )

        # ── ALB Security Group ────────────────────────────────────────────────
        self.alb_sg = ec2.SecurityGroup(
            self, "AlbSG", vpc=vpc,
            description="SentinelNet ALB",
            allow_all_outbound=True,
        )
        self.alb_sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(80), "HTTP (TheHive)")
        self.alb_sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(3000), "HTTP (Grafana)")

        # ── Security Group ────────────────────────────────────────────────────
        self.sg = ec2.SecurityGroup(
            self, "ServicesSG", vpc=vpc,
            description="SentinelNet SOC services",
            allow_all_outbound=True,
        )
        # ALB forwarding (TheHive & Grafana)
        self.sg.add_ingress_rule(self.alb_sg, ec2.Port.tcp(9000), "TheHive from ALB")
        self.sg.add_ingress_rule(self.alb_sg, ec2.Port.tcp(3000), "Grafana from ALB")

        # Wazuh agent registration/events from Everywhere
        self.sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(1514), "Wazuh agent TCP")
        self.sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(1515), "Wazuh registration")
        self.sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(55000), "Wazuh API")

        # ── EC2 Instance ──────────────────────────────────────────────────────
        role = iam.Role(
            self, "EC2Role",
            assumed_by=iam.ServicePrincipal("ec2.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "AmazonSSMManagedInstanceCore"),
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "CloudWatchAgentServerPolicy"),
            ],
        )

        # Grant EC2 permission to send to SQS
        self.alert_queue.grant_send_messages(role)

        user_data = ec2.UserData.for_linux()
        user_data.add_commands(
            "#!/bin/bash",
            "set -ex",
            # Install Docker
            "yum update -y",
            "yum install -y docker",
            "systemctl enable docker && systemctl start docker",
            "usermod -aG docker ec2-user",
            # Add 4GB Swap
            "fallocate -l 4G /swapfile",
            "chmod 600 /swapfile",
            "mkswap /swapfile",
            "swapon /swapfile",
            'echo "/swapfile swap swap defaults 0 0" >> /etc/fstab',
            # Kernel Tuning for Elasticsearch
            "sysctl -w vm.max_map_count=262144",
            'echo "vm.max_map_count=262144" >> /etc/sysctl.conf',
            # Allow memlock for ES
            'echo "* soft memlock unlimited" >> /etc/security/limits.conf',
            'echo "* hard memlock unlimited" >> /etc/security/limits.conf',
            # Install docker-compose
            'COMPOSE_URL="https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)"',
            "curl -L $COMPOSE_URL -o /usr/local/bin/docker-compose",
            "chmod +x /usr/local/bin/docker-compose",
            # Create directories
            "mkdir -p /opt/sentinel/conf",
            "mkdir -p /opt/sentinel/data/cassandra /opt/sentinel/data/elasticsearch /opt/sentinel/data/wazuh_logs",
            "chown -R 1000:1000 /opt/sentinel/data/elasticsearch /opt/sentinel/data/wazuh_logs",
            # Create TheHive Config
            "cat > /opt/sentinel/conf/thehive.conf << 'THEHIVE_EOF'",
            'db.janusgraph.backend = "cql"',
            'db.janusgraph.hostname = ["cassandra"]',
            'db.janusgraph.cql.cluster-name = "thp"',
            'db.janusgraph.cql.keyspace = "thehive"',
            'index.search.backend = "elasticsearch"',
            'index.search.hostname = ["elasticsearch"]',
            'index.search.elasticsearch.cluster-name = "thp"',
            'storage.backend = "local"',
            'storage.local.directory = "/opt/thp/thehive/files"',
            "THEHIVE_EOF",
            # Create compose file
            "cat > /opt/sentinel/docker-compose.yml << 'COMPOSE_EOF'",
            "version: '3'",
            "services:",
            "  cassandra:",
            "    image: cassandra:4.1.3",
            "    hostname: cassandra",
            "    restart: unless-stopped",
            "    environment:",
            "      - MAX_HEAP_SIZE=512M",
            "      - HEAP_NEWSIZE=100M",
            "    volumes:",
            "      - /opt/sentinel/data/cassandra:/var/lib/cassandra",
            "",
            "  elasticsearch:",
            "    image: elasticsearch:7.17.13",
            "    hostname: elasticsearch",
            "    restart: unless-stopped",
            "    environment:",
            '      - "discovery.type=single-node"',
            '      - "ES_JAVA_OPTS=-Xms512M -Xmx512M"',
            "    ulimits:",
            "      memlock:",
            "        soft: -1",
            "        hard: -1",
            "    volumes:",
            "      - /opt/sentinel/data/elasticsearch:/usr/share/elasticsearch/data",
            "",
            "  thehive:",
            "    image: strangebee/thehive:5.4",
            "    hostname: thehive",
            "    restart: unless-stopped",
            "    depends_on:",
            "      - cassandra",
            "      - elasticsearch",
            "    ports:",
            '      - "9000:9000"',
            "    environment:",
            "      - JAVA_OPTS=-Xms768M -Xmx768M",
            "    volumes:",
            "      - /opt/sentinel/conf/thehive.conf:/etc/thehive/application.conf",
            "      - thehive_data:/opt/thp/thehive/files",
            "",
            "  wazuh:",
            "    image: wazuh/wazuh-manager:4.9.2",
            "    hostname: wazuh-manager",
            "    restart: unless-stopped",
            "    ports:",
            '      - "1514:1514"',
            '      - "1515:1515"',
            '      - "55000:55000"',
            "    volumes:",
            "      - /opt/sentinel/data/wazuh_data:/var/ossec/data",
            "      - /opt/sentinel/data/wazuh_etc:/var/ossec/etc",
            "      - /opt/sentinel/data/wazuh_logs:/var/ossec/logs",
            "",
            "  grafana:",
            "    image: grafana/grafana:latest",
            "    restart: unless-stopped",
            "    ports:",
            '      - "3000:3000"',
            "    environment:",
            "      - GF_SECURITY_ADMIN_PASSWORD=sentinel",
            "      - GF_SERVER_ROOT_URL=https://%(domain)s/grafana/",
            "      - GF_SERVER_SERVE_FROM_SUB_PATH=true",
            "    volumes:",
            "      - grafana_data:/var/lib/grafana",
            "",
            "volumes:",
            "  thehive_data:",
            "  grafana_data:",
            "COMPOSE_EOF",
            # Start services
            "cd /opt/sentinel && /usr/local/bin/docker-compose up -d",
            # Install Wazuh-to-SQS forwarder
            "yum install -y python3-pip",
            "pip3 install boto3",
            "cat > /usr/local/bin/wazuh_to_sqs.py << 'PY_EOF'",
            "import json, time, boto3, os",
            "sqs = boto3.client('sqs', region_name=os.environ.get('AWS_REGION', 'us-east-1'))",
            "queue_url = os.environ.get('QUEUE_URL')",
            "alerts_path = '/opt/sentinel/data/wazuh_logs/alerts/alerts.json'",
            "def forward():",
            "    if not os.path.exists(alerts_path): return",
            "    with open(alerts_path, 'r') as f:",
            "        f.seek(0, 2)",
            "        while True:",
            "            line = f.readline()",
            "            if not line: time.sleep(1); continue",
            "            try:",
            "                alert = json.loads(line)",
            "                sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(alert))",
            "            except Exception as e: print(e)",
            "if __name__ == '__main__': forward()",
            "PY_EOF",
            "chmod +x /usr/local/bin/wazuh_to_sqs.py",
            # Create systemd service for forwarder
            "cat > /etc/systemd/system/wazuh-forwarder.service << SERVICE_EOF",
            "[Unit]",
            "Description=Wazuh to SQS Forwarder",
            "After=docker.service",
            "[Service]",
            "Type=simple",
            f"Environment=QUEUE_URL={self.alert_queue.queue_url}",
            f"Environment=AWS_REGION={self.region}",
            "ExecStart=/usr/bin/python3 /usr/local/bin/wazuh_to_sqs.py",
            "Restart=always",
            "User=root",
            "SERVICE_EOF",
            "systemctl enable wazuh-forwarder && systemctl start wazuh-forwarder",
            # CloudWatch Integration (Errors Only)
            "yum install -y amazon-cloudwatch-agent",
            "touch /var/log/sentinel_errors.log",
            "chmod 666 /var/log/sentinel_errors.log",
            # Create Filter Service
            "cat > /usr/local/bin/log_filter.sh << 'FILTER_EOF'",
            "#!/bin/bash",
            "tail -F /var/log/messages /var/ossec/logs/ossec.log /var/lib/docker/containers/*/*.log 2>/dev/null | grep --line-buffered -Ei 'ERROR|CRITICAL|FAIL' >> /var/log/sentinel_errors.log",
            "FILTER_EOF",
            "chmod +x /usr/local/bin/log_filter.sh",
            # Register Filter as Systemd Service
            "cat > /etc/systemd/system/sentinel-log-filter.service << SERVICE_EOF",
            "[Unit]",
            "Description=SentinelNet Log Error Filter",
            "After=docker.service",
            "[Service]",
            "Type=simple",
            "ExecStart=/bin/bash /usr/local/bin/log_filter.sh",
            "Restart=always",
            "User=root",
            "SERVICE_EOF",
            "systemctl enable sentinel-log-filter && systemctl start sentinel-log-filter",
            # Configure CloudWatch Agent
            "cat > /opt/aws/amazon-cloudwatch-agent/bin/config.json << 'CW_EOF'",
            "{",
            '  "logs": {',
            '    "logs_collected": {',
            '      "files": {',
            '        "collect_list": [',
            "          {",
            '            "file_path": "/var/log/sentinel_errors.log",',
            '            "log_group_name": "/sentinelnet/soc/errors",',
            '            "log_stream_name": "{instance_id}",',
            '            "retention_in_days": 1',
            "          }",
            "        ]",
            "      }",
            "    }",
            "  }",
            "}",
            "CW_EOF",
            # Start CloudWatch Agent
            "/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json -s",
        )

        self.instance = ec2.Instance(
            self, "SentinelSOCReplicaV4",
            instance_type=ec2.InstanceType("t3.medium"),
            machine_image=ec2.MachineImage.latest_amazon_linux2(),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            security_group=self.sg,
            role=role,
            user_data=user_data,
            associate_public_ip_address=True,
            block_devices=[
                ec2.BlockDevice(
                    device_name="/dev/xvda",
                    volume=ec2.BlockDeviceVolume.ebs(20, volume_type=ec2.EbsDeviceVolumeType.GP3)
                )
            ]
        )

        self.alb = elbv2.ApplicationLoadBalancer(
            self, "ALB",
            vpc=vpc,
            internet_facing=True,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            security_group=self.alb_sg,
        )

        # Allow ALB to reach EC2
        self.sg.connections.allow_from(self.alb, ec2.Port.tcp(9000))

        # TheHive listener (HTTP port 80 -> port 9000 on EC2)
        listener = self.alb.add_listener("HttpListener", port=80)
        listener.add_targets(
            "TheHiveTarget",
            port=9000,
            protocol=elbv2.ApplicationProtocol.HTTP,
            targets=[targets.InstanceTarget(self.instance, 9000)],
            health_check=elbv2.HealthCheck(
                path="/",
                interval=Duration.seconds(20),
                healthy_threshold_count=2,
                unhealthy_threshold_count=3,
                healthy_http_codes="200-499"
            ),
        )

        # Grafana listener (HTTP port 3000 -> port 3000 on EC2)
        grafana_listener = self.alb.add_listener(
            "GrafanaListener", 
            port=3000,
            protocol=elbv2.ApplicationProtocol.HTTP
        )
        grafana_listener.add_targets(
            "GrafanaTarget",
            port=3000,
            protocol=elbv2.ApplicationProtocol.HTTP,
            targets=[targets.InstanceTarget(self.instance, 3000)],
            health_check=elbv2.HealthCheck(
                path="/login",
                interval=Duration.seconds(20),
                healthy_threshold_count=2,
                unhealthy_threshold_count=3,
                healthy_http_codes="200-499"
            ),
        )

        # ── Lambda: SQS -> DynamoDB ───────────────────────────────────────────
        self.ingest_fn = lambda_.Function(
            self, "IngestFunction",
            function_name="sentinel-wazuh-ingest",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=lambda_.Code.from_asset(lambda_dir),
            timeout=Duration.seconds(60),
            memory_size=256,
            log_retention=logs.RetentionDays.ONE_DAY,
            environment={
                "ALERTS_BUCKET_NAME": self.alerts_bucket.bucket_name,
            },
        )

        self.alert_queue.grant_consume_messages(self.ingest_fn)
        self.ingest_fn.add_event_source(
            events.SqsEventSource(self.alert_queue, batch_size=10,
                                  report_batch_item_failures=True))
        self.alerts_bucket.grant_put(self.ingest_fn)

        # ── Telemetry API ────────────────────────────────────────────────────
        # Created as an authenticated HTTP API in WebsiteStack, sharing the
        # same Cognito app client as the CloudFront frontend.
        telemetry_api_dir = str(repo_root / "backend" / "lambda" / "telemetry_api")
        self.telemetry_api_fn = lambda_.Function(
            self, "TelemetryApiFunction",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=lambda_.Code.from_asset(telemetry_api_dir),
            log_retention=logs.RetentionDays.ONE_DAY,
            environment={
                "ALERTS_BUCKET_NAME": self.alerts_bucket.bucket_name,
            },
        )
        self.alerts_bucket.grant_read(self.telemetry_api_fn)

        # ── Outputs ───────────────────────────────────────────────────────────
        CfnOutput(self, "InstanceId", value=self.instance.instance_id)
        CfnOutput(self, "ALBEndpoint", value=self.alb.load_balancer_dns_name,
                  export_name="SentinelNetALBEndpoint")
        CfnOutput(self, "AlertsBucketName",
                  value=self.alerts_bucket.bucket_name)
        CfnOutput(self, "AlertQueueUrl", value=self.alert_queue.queue_url)
        CfnOutput(self, "ManagerPublicIP", value=self.instance.instance_public_ip)
