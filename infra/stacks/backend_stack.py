"""
Backend Stack - Single EC2 running SOC services via docker-compose.

Resources:
  - EC2 (t3.Large, public subnet) running Wazuh + TheHive + Grafana
  - ALB (internet-facing) routing to TheHive + Grafana
  - DynamoDB telemetry table + KMS key for alert storage
  - SQS alert queue + DLQ for Wazuh alert ingestion
  - Lambda function (SQS -> DynamoDB)

Deploy with: cdk deploy SentinelNet-Backend
"""

import hashlib
from pathlib import Path

from aws_cdk import (
    CfnOutput,
    Duration,
    RemovalPolicy,
    Stack,
    aws_apigatewayv2 as apigwv2,
    aws_apigatewayv2_integrations as integrations,
    aws_certificatemanager as acm,
    aws_cognito as cognito,
    aws_ec2 as ec2,
    aws_elasticloadbalancingv2 as elbv2,
    aws_elasticloadbalancingv2_actions as elb_actions,
    aws_elasticloadbalancingv2_targets as targets,
    aws_iam as iam,
    aws_lambda as lambda_,
    aws_lambda_event_sources as events,
    aws_logs as logs,
    aws_route53 as route53,
    aws_route53_targets as route53_targets,
    aws_s3 as s3,
    aws_sqs as sqs,
)
from constructs import Construct


def load_thehive_proxy_secrets(repo_root: Path) -> dict:
    env_path = repo_root / ".thehive_proxy.env"
    if not env_path.exists():
        return {}

    secrets: dict[str, str] = {}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        secrets[key.strip()] = value.strip()
    return secrets


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
        proxy_secrets = load_thehive_proxy_secrets(repo_root)
        proxy_user = proxy_secrets.get("THEHIVE_USER", "thehive-proxy@sentinelnetsolutions.com")
        proxy_password = proxy_secrets.get("THEHIVE_PASSWORD", "CHANGE_ME")
        admin_user = proxy_secrets.get("THEHIVE_ADMIN_USER", "")
        admin_password = proxy_secrets.get("THEHIVE_ADMIN_PASSWORD", "CHANGE_ME")
        admin_org = proxy_secrets.get("THEHIVE_ORG", "thehive")
        if not proxy_user or not proxy_password or proxy_password == "CHANGE_ME":
            raise ValueError(
                "Missing TheHive proxy credentials. Create .thehive_proxy.env "
                "with THEHIVE_USER and THEHIVE_PASSWORD before deploying."
            )
        if not admin_user or not admin_password or admin_password == "CHANGE_ME":
            raise ValueError(
                "Missing TheHive admin credentials. Create .thehive_proxy.env "
                "with THEHIVE_ADMIN_USER and THEHIVE_ADMIN_PASSWORD before deploying."
            )

        # ── Telemetry: S3 Data Lake ──────────────────────────────────────────
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
        self.alb_sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(443), "HTTPS (ALB)")

        # ── Services Security Group ───────────────────────────────────────────
        self.sg = ec2.SecurityGroup(
            self, "ServicesSG", vpc=vpc,
            description="SentinelNet SOC services",
            allow_all_outbound=True,
        )
        self.sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(22), "SSH for instance access")
        # ALB forwarding
        self.sg.add_ingress_rule(self.alb_sg, ec2.Port.tcp(9000), "TheHive from ALB")
        self.sg.add_ingress_rule(self.alb_sg, ec2.Port.tcp(9001), "TheHive proxy from ALB")
        self.sg.add_ingress_rule(self.alb_sg, ec2.Port.tcp(3000), "Grafana from ALB")
        # Wazuh registration/events
        self.sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(1514), "Wazuh agent TCP")
        self.sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(1515), "Wazuh registration")
        self.sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(55000), "Wazuh API")

        # ── IAM Role ──────────────────────────────────────────────────────────
        role = iam.Role(
            self, "EC2Role",
            assumed_by=iam.ServicePrincipal("ec2.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSSMManagedInstanceCore"),
                iam.ManagedPolicy.from_aws_managed_policy_name("CloudWatchAgentServerPolicy"),
            ],
        )
        self.alert_queue.grant_send_messages(role)

        # ── ALB ───────────────────────────────────────────────────────────────
        self.alb = elbv2.ApplicationLoadBalancer(
            self, "ALB",
            vpc=vpc,
            internet_facing=True,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            security_group=self.alb_sg,
        )

        hosted_zone = route53.HostedZone.from_hosted_zone_attributes(
            self, "HostedZone",
            hosted_zone_id="Z02031801QLNS1AIUFNZK",
            zone_name="sentinelnetsolutions.com"
        )
        alb_domain = "api.sentinelnetsolutions.com"
        website_url = "https://sentinelnetsolutions.com"

        alb_cert = acm.Certificate(
            self, "AlbCert",
            domain_name=alb_domain,
            validation=acm.CertificateValidation.from_dns(hosted_zone)
        )

        route53.ARecord(
            self, "AlbAliasRecord",
            zone=hosted_zone,
            record_name="api",
            target=route53.RecordTarget.from_alias(route53_targets.LoadBalancerTarget(self.alb))
        )

        # ── Cognito App Client for ALB ────────────────────────────────────────
        alb_client = user_pool.add_client(
            "AlbClient",
            generate_secret=True,
            o_auth=cognito.OAuthSettings(
                flows=cognito.OAuthFlows(authorization_code_grant=True),
                scopes=[cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
                callback_urls=[
                    f"https://{alb_domain}/oauth2/idpresponse",
                    "https://api.sentinelnetsolutions.com/grafana/login/generic_oauth",
                    "https://api.sentinelnetsolutions.com/thehive/"
                ],
                logout_urls=[
                    website_url,
                    f"{website_url}/",
                    f"{website_url}/login",
                    "http://localhost:3000/",
                    "http://localhost:5173/",
                    "https://api.sentinelnetsolutions.com/grafana/",
                    "https://api.sentinelnetsolutions.com/thehive/"
                ]
            )
        )

        cognito_domain = user_pool_domain.domain_name + ".auth." + self.region + ".amazoncognito.com"
        client_id = alb_client.user_pool_client_id
        
        # Logout URLs to clear Cognito session
        grafana_logout = f"https://{cognito_domain}/logout?client_id={client_id}&logout_uri={website_url}/"
        thehive_logout = f"https://{cognito_domain}/logout?client_id={client_id}&logout_uri={website_url}/"

        # ── User Data ─────────────────────────────────────────────────────────
        user_data = ec2.UserData.for_linux()
        user_data.add_commands(
            "#!/bin/bash",
            "set -ex",
            "yum update -y",
            "yum install -y docker",
            "systemctl enable docker && systemctl start docker",
            "usermod -aG docker ec2-user",
            # Swap & Tuning
            "fallocate -l 4G /swapfile",
            "chmod 600 /swapfile",
            "mkswap /swapfile",
            "swapon /swapfile",
            'echo "/swapfile swap swap defaults 0 0" >> /etc/fstab',
            "sysctl -w vm.max_map_count=262144",
            'echo "vm.max_map_count=262144" >> /etc/sysctl.conf',
            'echo "* soft memlock unlimited" >> /etc/security/limits.conf',
            'echo "* hard memlock unlimited" >> /etc/security/limits.conf',
            # Compose
            'COMPOSE_URL="https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)"',
            "curl -L $COMPOSE_URL -o /usr/local/bin/docker-compose",
            "chmod +x /usr/local/bin/docker-compose",
            "mkdir -p /opt/sentinel/conf /opt/sentinel/data/cassandra /opt/sentinel/data/elasticsearch /opt/sentinel/data/wazuh_logs",
            "chown -R 1000:1000 /opt/sentinel/data/elasticsearch /opt/sentinel/data/wazuh_logs",
            # TheHive SSO Proxy
            "mkdir -p /opt/sentinel/thehive_proxy",
            "cat > /opt/sentinel/thehive_proxy/package.json << 'PROXY_EOF'",
            '{"name":"thehive-auth-proxy","version":"1.0.0","private":true,"type":"module","dependencies":{"express":"4.19.2","http-proxy-middleware":"2.0.7"}}',
            "PROXY_EOF",
            "cat > /opt/sentinel/thehive_proxy/server.js << 'PROXY_EOF'",
            "import express from 'express';",
            "import { createProxyMiddleware } from 'http-proxy-middleware';",
            "",
            "const app = express();",
            "const target = process.env.THEHIVE_BASE || 'http://thehive:9000';",
            "const allowedGroups = (process.env.ALLOWED_GROUPS || 'SentinelNetAdmins,SentinelNetAnalysts')",
            "  .split(',').map((g) => g.trim()).filter(Boolean);",
            "const thehiveUser = process.env.THEHIVE_USER || '';",
            "const thehivePassword = process.env.THEHIVE_PASSWORD || '';",
            "const sessionCache = new Map();",
            "",
            "function base64UrlDecode(value) {",
            "  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');",
            "  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');",
            "  return Buffer.from(padded, 'base64').toString('utf8');",
            "}",
            "",
            "function decodeJwt(token) {",
            "  if (!token) return {};",
            "  const parts = token.split('.');",
            "  if (parts.length < 2) return {};",
            "  try {",
            "    return JSON.parse(base64UrlDecode(parts[1]));",
            "  } catch {",
            "    return {};",
            "  }",
            "}",
            "",
            "function normalizeGroups(value) {",
            "  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);",
            "  if (typeof value === 'string') {",
            "    return value.split(/[\\s,]+/).map((v) => v.trim()).filter(Boolean);",
            "  }",
            "  return [];",
            "}",
            "",
            "function hasAllowedGroup(claims) {",
            "  if (!allowedGroups.length) return true;",
            "  const groups = new Set([",
            "    ...normalizeGroups(claims['cognito:groups']),",
            "    ...normalizeGroups(claims.groups),",
            "  ]);",
            "  for (const group of allowedGroups) {",
            "    if (groups.has(group)) return true;",
            "  }",
            "  return false;",
            "}",
            "",
            "async function loginToTheHive() {",
            "  if (!thehiveUser || !thehivePassword) {",
            "    throw new Error('Missing TheHive credentials');",
            "  }",
            "  const endpoints = ['/thehive/api/login', '/thehive/api/v1/login', '/thehive/api/v1/auth/login'];",
            "  const bodies = [",
            "    { user: thehiveUser, password: thehivePassword },",
            "    { login: thehiveUser, password: thehivePassword },",
            "    { username: thehiveUser, password: thehivePassword, remember: false },",
            "  ];",
            "  for (const endpoint of endpoints) {",
            "    for (const body of bodies) {",
            "      try {",
            "        const response = await fetch(`${target}${endpoint}`, {",
            "          method: 'POST',",
            "          headers: { 'Content-Type': 'application/json' },",
            "          body: JSON.stringify(body),",
            "        });",
            "        const setCookie = response.headers.get('set-cookie');",
            "        if (response.ok && setCookie) {",
            "          return setCookie.split(';')[0];",
            "        }",
            "        if (process.env.DEBUG_LOG_CLAIMS === '1') {",
            "          console.log(`Login attempt to ${endpoint} returned ${response.status}`);",
            "        }",
            "      } catch (error) {",
            "        if (process.env.DEBUG_LOG_CLAIMS === '1') {",
            "          console.error(`Fetch error for ${endpoint}:`, error.message);",
            "        }",
            "      }",
            "    }",
            "  }",
            "  throw new Error('Unable to establish TheHive session');",
            "}",
            "",
            "app.get('/healthz', (req, res) => res.status(200).send('ok'));",
            "",
            "app.use(async (req, res, next) => {",
            "  const dataToken = req.header('x-amzn-oidc-data');",
            "  const accessToken = req.header('x-amzn-oidc-accesstoken');",
            "  const claims = {",
            "    ...decodeJwt(dataToken || ''),",
            "    ...decodeJwt(accessToken || ''),",
            "  };",
            "  const subject = claims.sub || claims.username || claims.email || 'unknown';",
            "  if (!dataToken && !accessToken) {",
            "    return res.status(401).send('Missing identity token');",
            "  }",
            "  if (process.env.DEBUG_LOG_CLAIMS === '1') {",
            "    const groups = [claims['cognito:groups'], claims.groups].filter(Boolean);",
            "    console.log('oidc groups', JSON.stringify(groups));",
            "    console.log('oidc claim keys', Object.keys(claims));",
            "  }",
            "  if (!hasAllowedGroup(claims)) {",
            "    return res.status(403).send('Access denied');",
            "  }",
            "  const cached = sessionCache.get(subject);",
            "  if (cached && cached.expiresAt > Date.now()) {",
            "    req.headers.cookie = cached.cookie;",
            "    return next();",
            "  }",
            "  try {",
            "    const cookie = await loginToTheHive();",
            "    sessionCache.set(subject, { cookie, expiresAt: Date.now() + 30 * 60 * 1000 });",
            "    req.headers.cookie = cookie;",
            "    return next();",
            "  } catch (error) {",
            "    console.error(`Session failure for ${subject}:`, error.message);",
            "    return res.status(502).send('TheHive session failure');",
            "  }",
            "});",
            "",
            "app.use(createProxyMiddleware({",
            "  target,",
            "  changeOrigin: true,",
            "  logLevel: 'warn',",
            "  onProxyReq: (proxyReq, req) => {",
            "    if (req.headers.cookie) {",
            "      proxyReq.setHeader('cookie', req.headers.cookie);",
            "    }",
            "  },",
            "}));",
            "",
            "app.listen(8080, () => {",
            "  console.log('TheHive auth proxy listening on :8080');",
            "});",
            "PROXY_EOF",
            # TheHive Config
            "cat > /opt/sentinel/conf/thehive.conf << 'THEHIVE_EOF'",
            'play.http.context = "/thehive"',
            'application.baseUrl = "https://sentinelnetsolutions.com/thehive"',
            'db.janusgraph.backend = "cql"',
            'db.janusgraph.hostname = ["cassandra"]',
            'db.janusgraph.cql.cluster-name = "thp"',
            'db.janusgraph.cql.keyspace = "thehive"',
            'index.search.backend = "elasticsearch"',
            'index.search.hostname = ["elasticsearch"]',
            'index.search.elasticsearch.cluster-name = "thp"',
            'storage.backend = "local"',
            'storage.local.directory = "/opt/thp/thehive/files"',
            'auth {',
            '  providers: [',
            '    {name: session}',
            '    {name: basic, realm: thehive}',
            '    {name: local}',
            '    {name: key}',
            '  ]',
            '  defaultUserDomain: "thehive.local"',
            '  organisationCookieName: "X-Organisation"',
            '}',
            f'play.controllers.Logout.redirectUrl = "{thehive_logout}"',
            'play.http.forwarded.trustedProxies = ["10.0.0.0/8", "172.16.0.0/12"]',
            "THEHIVE_EOF",
            # Docker Compose
            "cat > /opt/sentinel/docker-compose.yml << 'COMPOSE_EOF'",
            "version: '3'",
            "services:",
            "  cassandra:",
            "    image: cassandra:4.1.3",
            "    hostname: cassandra",
            "    restart: unless-stopped",
            "    environment: [ MAX_HEAP_SIZE=512M, HEAP_NEWSIZE=100M ]",
            "    healthcheck:",
            "      test: [ 'CMD', 'bash', '-lc', 'echo > /dev/tcp/127.0.0.1/9042' ]",
            "      interval: 20s",
            "      timeout: 5s",
            "      retries: 18",
            "      start_period: 60s",
            "    volumes: [ /opt/sentinel/data/cassandra:/var/lib/cassandra ]",
            "  elasticsearch:",
            "    image: elasticsearch:7.17.13",
            "    hostname: elasticsearch",
            "    restart: unless-stopped",
            "    environment: [ 'discovery.type=single-node', 'ES_JAVA_OPTS=-Xms512M -Xmx512M' ]",
            "    ulimits: { memlock: { soft: -1, hard: -1 } }",
            "    healthcheck:",
            "      test: [ 'CMD', 'bash', '-lc', 'echo > /dev/tcp/127.0.0.1/9200' ]",
            "      interval: 20s",
            "      timeout: 5s",
            "      retries: 18",
            "      start_period: 90s",
            "    volumes: [ /opt/sentinel/data/elasticsearch:/usr/share/elasticsearch/data ]",
            "  thehive:",
            "    image: strangebee/thehive:5.4",
            "    hostname: thehive",
            "    restart: unless-stopped",
            "    depends_on:",
            "      cassandra:",
            "        condition: service_healthy",
            "      elasticsearch:",
            "        condition: service_healthy",
            "    ports: [ '9000:9000' ]",
            "    environment: [ JAVA_OPTS=-Xms768M -Xmx768M ]",
            "    volumes:",
            "      - /opt/sentinel/conf/thehive.conf:/etc/thehive/application.conf",
            "      - thehive_data:/opt/thp/thehive/files",
            "  thehive_proxy:",
            "    image: node:18-alpine",
            "    hostname: thehive-proxy",
            "    restart: unless-stopped",
            "    depends_on:",
            "      - thehive",
            "    ports: [ '9001:8080' ]",
            "    working_dir: /app",
            "    environment:",
            "      - THEHIVE_BASE=http://thehive:9000",
            f"      - THEHIVE_USER={proxy_user}",
            f"      - THEHIVE_PASSWORD={proxy_password.replace('$', '$$')}",
            "      - ALLOWED_GROUPS=SentinelNetAdmins,SentinelNetAnalysts",
            "    volumes:",
            "      - /opt/sentinel/thehive_proxy:/app",
            "    command: [ 'sh', '-lc', 'npm install --production && node server.js' ]",
            "  wazuh:",
            "    image: wazuh/wazuh-manager:4.9.2",
            "    hostname: wazuh-manager",
            "    restart: unless-stopped",
            "    ports: [ '1514:1514', '1515:1515', '55000:55000' ]",
            "    volumes:",
            "      - /opt/sentinel/data/wazuh_data:/var/ossec/data",
            "      - /opt/sentinel/data/wazuh_etc:/var/ossec/etc",
            "      - /opt/sentinel/data/wazuh_logs:/var/ossec/logs",
            "  grafana:",
            "    image: grafana/grafana:latest",
            "    restart: unless-stopped",
            "    ports: [ '3000:3000' ]",
            "    environment:",
            "      - GF_INSTALL_PLUGINS=wazuh-wazuh-app",
            "      - GF_SECURITY_ADMIN_PASSWORD=sentinel",
            "      - GF_SERVER_ROOT_URL=https://api.sentinelnetsolutions.com/grafana/",
            "      - GF_SERVER_SERVE_FROM_SUB_PATH=true",
            "      - GF_SECURITY_COOKIE_SECURE=true",
            "      - GF_SECURITY_COOKIE_SAMESITE=none",
            "      - GF_AUTH_DISABLE_LOGIN_FORM=true",
            "      - GF_AUTH_PROXY_ENABLED=true",
            "      - GF_AUTH_PROXY_HEADER_NAME=X-Amzn-Oidc-Identity",
            "      - GF_AUTH_PROXY_HEADER_PROPERTY=email",
            "      - GF_AUTH_PROXY_AUTO_SIGN_UP=true",
            "      - GF_AUTH_PROXY_WHITELIST=",
            f"      - GF_AUTH_SIGNOUT_REDIRECT_URL={grafana_logout}",
            "    volumes: [ grafana_data:/var/lib/grafana ]",
            "volumes: { thehive_data: {}, grafana_data: {} }",
            "COMPOSE_EOF",
            "cd /opt/sentinel && /usr/local/bin/docker-compose up -d",
                        # TheHive proxy user bootstrap
                        "cat > /opt/sentinel/bootstrap_thehive_user.sh << 'BOOT_EOF'",
                        "#!/bin/bash",
                        "set -euo pipefail",
                        "BASE_URL=\"http://localhost:9000/thehive\"",
                        f"ADMIN_USER=\"{admin_user}\"",
                        f"ADMIN_PASSWORD=\"{admin_password.replace('$', '\\$')}\"",
                        f"ADMIN_ORG=\"{admin_org}\"",
                        f"PROXY_USER=\"{proxy_user}\"",
                        f"PROXY_PASSWORD=\"{proxy_password.replace('$', '\\$')}\"",
                        "PROXY_NAME=\"TheHive Proxy\"",
                        "PROXY_ROLE=\"analyst\"",
                        "",
                        "echo 'Waiting for TheHive to accept connections...'",
                        "for i in $(seq 1 60); do",
                        "  if curl -sSf \"${BASE_URL}/api/status\" >/dev/null 2>&1; then",
                        "    break",
                        "  fi",
                        "  sleep 5",
                        "done",
                        "",
                        "LOGIN_CODE=$(curl -sS -o /dev/null -w '%{http_code}' -X POST \"${BASE_URL}/api/login\" -H 'Content-Type: application/json' -d \"{\\\"user\\\":\\\"${PROXY_USER}\\\",\\\"password\\\":\\\"${PROXY_PASSWORD}\\\"}\")",
                        "if [ \"${LOGIN_CODE}\" = '200' ] || [ \"${LOGIN_CODE}\" = '204' ]; then",
                        "  echo 'Proxy user already works.'",
                        "  exit 0",
                        "fi",
                        "",
                            "ADMIN_COOKIE=$(curl -sS -i -X POST \"${BASE_URL}/api/login\" -H 'Content-Type: application/json' -d \"{\\\"user\\\":\\\"${ADMIN_USER}\\\",\\\"password\\\":\\\"${ADMIN_PASSWORD}\\\"}\" | awk -F': ' 'tolower($1)==\"set-cookie\"{print $2}' | head -n1 | cut -d';' -f1)",
                            "if [ -z \"${ADMIN_COOKIE}\" ]; then ADMIN_COOKIE=$(curl -sS -i -X POST \"${BASE_URL}/api/v1/auth/login\" -H 'Content-Type: application/json' -d \"{\\\"username\\\":\\\"${ADMIN_USER}\\\",\\\"password\\\":\\\"${ADMIN_PASSWORD}\\\",\\\"remember\\\":false}\" | awk -F': ' 'tolower($1)==\"set-cookie\"{print $2}' | head -n1 | cut -d';' -f1); fi",
                        "if [ -z \"${ADMIN_COOKIE}\" ]; then",
                        "  echo 'Admin login failed; cannot create proxy user.'",
                        "  exit 1",
                        "fi",
                        "",
                        "echo 'Attempting to create proxy user via API...'",
                        "PAYLOAD1=\"{\\\"login\\\":\\\"${PROXY_USER}\\\",\\\"name\\\":\\\"${PROXY_NAME}\\\",\\\"email\\\":\\\"${PROXY_USER}\\\",\\\"password\\\":\\\"${PROXY_PASSWORD}\\\",\\\"profile\\\":\\\"${PROXY_ROLE}\\\",\\\"organisation\\\":\\\"${ADMIN_ORG}\\\"}\"",
                        "PAYLOAD2=\"{\\\"user\\\":\\\"${PROXY_USER}\\\",\\\"name\\\":\\\"${PROXY_NAME}\\\",\\\"email\\\":\\\"${PROXY_USER}\\\",\\\"password\\\":\\\"${PROXY_PASSWORD}\\\",\\\"profile\\\":\\\"${PROXY_ROLE}\\\",\\\"organisation\\\":\\\"${ADMIN_ORG}\\\"}\"",
                        "for endpoint in /api/user /api/v1/user /api/user/_create /api/v1/user/_create; do",
                        "  for payload in \"${PAYLOAD1}\" \"${PAYLOAD2}\"; do",
                        "    code=$(curl -sS -o /dev/null -w '%{http_code}' \
                            -X POST \"${BASE_URL}${endpoint}\" \
                            -H 'Content-Type: application/json' \
                            -H \"Cookie: ${ADMIN_COOKIE}\" \
                            -d \"${payload}\")",
                        "    if [ \"${code}\" = '200' ] || [ \"${code}\" = '201' ] || [ \"${code}\" = '409' ]; then",
                        "      echo \"Create user response ${code} on ${endpoint}\"",
                        "      break 2",
                        "    fi",
                        "  done",
                        "done",
                        "",
                        "echo 'Validating proxy user login after create...'",
                        "code=$(curl -sS -o /dev/null -w '%{http_code}' \
                            -X POST \"${BASE_URL}/api/login\" \
                            -H 'Content-Type: application/json' \
                            -d \"{\\\"user\\\":\\\"${PROXY_USER}\\\",\\\"password\\\":\\\"${PROXY_PASSWORD}\\\"}\")",
                        "if ! echo \"${code}\" | grep -q '^2'; then",
                        "  echo 'Proxy user login still failing.'",
                        "  exit 1",
                        "fi",
                        "echo 'Proxy user ready.'",
                        "BOOT_EOF",
                        "chmod +x /opt/sentinel/bootstrap_thehive_user.sh",
                        "/opt/sentinel/bootstrap_thehive_user.sh || true",
            # Wazuh Forwarder
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
            # CloudWatch Integration
            "yum install -y amazon-cloudwatch-agent",
            "touch /var/log/sentinel_errors.log",
            "chmod 666 /var/log/sentinel_errors.log",
            "cat > /usr/local/bin/log_filter.sh << 'FILTER_EOF'",
            "#!/bin/bash",
            "tail -F /var/log/messages /var/ossec/logs/ossec.log /var/lib/docker/containers/*/*.log 2>/dev/null | grep --line-buffered -Ei 'ERROR|CRITICAL|FAIL' >> /var/log/sentinel_errors.log",
            "FILTER_EOF",
            "chmod +x /usr/local/bin/log_filter.sh",
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
            "cat > /opt/aws/amazon-cloudwatch-agent/bin/config.json << 'CW_EOF'",
            '{"logs": {"logs_collected": {"files": {"collect_list": [{"file_path": "/var/log/sentinel_errors.log","log_group_name": "/sentinelnet/soc/errors","log_stream_name": "{instance_id}","retention_in_days": 1}]}}}}',
            "CW_EOF",
            "/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json -s",
        )

        # ── EC2 Instance ──────────────────────────────────────────────────────
        # Force instance replacement when user_data changes.
        user_data_hash = hashlib.sha1(user_data.render().encode("utf-8")).hexdigest()[:8]
        self.instance = ec2.Instance(
            self, f"SentinelSOCReplica{user_data_hash}",
            instance_type=ec2.InstanceType("t3.large"),
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
                    volume=ec2.BlockDeviceVolume.ebs(50, volume_type=ec2.EbsDeviceVolumeType.GP3)
                )
            ]
        )

        # ── ALB Targets & Rules ──────────────────────────────────────────────
        thehive_tg = elbv2.ApplicationTargetGroup(
            self, "TheHiveTG", vpc=vpc, port=9001,
            protocol=elbv2.ApplicationProtocol.HTTP,
            targets=[targets.InstanceTarget(self.instance, 9001)],
            health_check=elbv2.HealthCheck(
                path="/healthz",
                interval=Duration.seconds(20),
                timeout=Duration.seconds(10),
                healthy_threshold_count=2,
                unhealthy_threshold_count=5,
                healthy_http_codes="200-499"
            )
        )
        grafana_tg = elbv2.ApplicationTargetGroup(
            self, "GrafanaTG", vpc=vpc, port=3000,
            protocol=elbv2.ApplicationProtocol.HTTP,
            targets=[targets.InstanceTarget(self.instance, 3000)],
            health_check=elbv2.HealthCheck(path="/grafana/login", interval=Duration.seconds(20), healthy_http_codes="200-499")
        )

        https_listener = self.alb.add_listener(
            "HttpsListener", port=443, certificates=[alb_cert],
            default_action=elbv2.ListenerAction.fixed_response(404, message_body="Not Found")
        )

        https_listener.add_action(
            "TheHiveAuth", priority=11,
            conditions=[elbv2.ListenerCondition.path_patterns(["/thehive", "/thehive/*"])],
            action=elb_actions.AuthenticateCognitoAction(
                user_pool=user_pool, user_pool_client=alb_client,
                user_pool_domain=user_pool_domain,
                next=elbv2.ListenerAction.forward([thehive_tg])
            )
        )
        https_listener.add_action(
            "GrafanaAuth", priority=20,
            conditions=[elbv2.ListenerCondition.path_patterns(["/grafana", "/grafana/*"])],
            action=elb_actions.AuthenticateCognitoAction(
                user_pool=user_pool, user_pool_client=alb_client,
                user_pool_domain=user_pool_domain,
                next=elbv2.ListenerAction.forward([grafana_tg])
            )
        )

        # ── Ingest Lambda ─────────────────────────────────────────────────────
        self.ingest_fn = lambda_.Function(
            self, "IngestFunction",
            function_name="sentinel-wazuh-ingest",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=lambda_.Code.from_asset(lambda_dir),
            timeout=Duration.seconds(60),
            memory_size=256,
            log_retention=logs.RetentionDays.ONE_DAY,
            environment={"ALERTS_BUCKET_NAME": self.alerts_bucket.bucket_name},
        )
        self.alert_queue.grant_consume_messages(self.ingest_fn)
        self.ingest_fn.add_event_source(events.SqsEventSource(self.alert_queue, batch_size=10, report_batch_item_failures=True))
        self.alerts_bucket.grant_put(self.ingest_fn)

        # ── Telemetry API ─────────────────────────────────────────────────────
        telemetry_api_dir = str(repo_root / "backend" / "lambda" / "telemetry_api")
        self.telemetry_api_fn = lambda_.Function(
            self, "TelemetryApiFunction",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=lambda_.Code.from_asset(telemetry_api_dir),
            log_retention=logs.RetentionDays.ONE_DAY,
            environment={"ALERTS_BUCKET_NAME": self.alerts_bucket.bucket_name},
        )
        self.alerts_bucket.grant_read(self.telemetry_api_fn)

        self.telemetry_api = apigwv2.HttpApi(
            self, "TelemetryHttpApi",
            cors_preflight=apigwv2.CorsPreflightOptions(
                allow_methods=[apigwv2.CorsHttpMethod.GET, apigwv2.CorsHttpMethod.OPTIONS],
                allow_origins=["*"],
                allow_headers=["Authorization", "Content-Type"],
            ),
        )
        self.telemetry_api.add_routes(
            path="/alerts",
            methods=[apigwv2.HttpMethod.GET],
            integration=integrations.HttpLambdaIntegration("TelemetryIntegration", self.telemetry_api_fn),
        )

        # ── Outputs ───────────────────────────────────────────────────────────
        CfnOutput(self, "InstanceId", value=self.instance.instance_id)
        CfnOutput(self, "ALBEndpoint", value=self.alb.load_balancer_dns_name, export_name="SentinelNetALBEndpoint")
        CfnOutput(self, "AlertsBucketName", value=self.alerts_bucket.bucket_name)
        CfnOutput(self, "AlertQueueUrl", value=self.alert_queue.queue_url)
        CfnOutput(self, "TelemetryApiUrl", value=self.telemetry_api.api_endpoint)
        CfnOutput(self, "ManagerPublicIP", value=self.instance.instance_public_ip)
