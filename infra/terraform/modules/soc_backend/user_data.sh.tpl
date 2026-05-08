#!/bin/bash
set -ex

# SentinelNet SOC Backend bootstrap
#
# Alert flow:
#   Wazuh alerts.json ──► Filebeat ──► Elasticsearch ──► Grafana dashboards
#   Wazuh alerts.json ──► wazuh_to_sqs.py ──► SQS ──► Lambda ──► S3 ──► Telemetry API

# ── System prep ────────────────────────────────────────────────────────────────
yum update -y
yum install -y docker python3-pip amazon-cloudwatch-agent jq

systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# ── Swap (4 GB) ────────────────────────────────────────────────────────────────
if [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
fi

# ── Kernel settings (required for Elasticsearch) ───────────────────────────────
sysctl -w vm.max_map_count=262144
grep -q 'vm.max_map_count' /etc/sysctl.conf || echo 'vm.max_map_count=262144' >> /etc/sysctl.conf

# ── docker compose v2 ──────────────────────────────────────────────────────────
if [ ! -f /usr/local/bin/docker-compose ]; then
  COMPOSE_VER="v2.24.7"
  COMPOSE_OS="$(uname -s)"
  COMPOSE_ARCH="$(uname -m)"
  curl -fsSL "https://github.com/docker/compose/releases/download/$${COMPOSE_VER}/docker-compose-$${COMPOSE_OS}-$${COMPOSE_ARCH}" \
    -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

# ── Directories ────────────────────────────────────────────────────────────────
mkdir -p /opt/sentinel/data/{elasticsearch,wazuh_data,wazuh_etc,wazuh_indexer,wazuh_api}
mkdir -p /opt/sentinel/data/wazuh_logs/{alerts,archives,firewall}
mkdir -p /opt/sentinel/conf/grafana/provisioning/{datasources,dashboards}
mkdir -p /opt/sentinel/conf/grafana/dashboards
mkdir -p /opt/sentinel/conf/wazuh-dashboard
mkdir -p /opt/sentinel/conf/wazuh-indexer
mkdir -p /opt/sentinel/conf/wazuh-certs

# ── Wazuh Dashboard config ────────────────────────────────────────────────────
# Wazuh 4.8+ renamed the home app from /app/wazuh to /app/wz-home; without the
# defaultRoute override, the dashboard lands on /app/wazuh and renders
# "Application Not Found" client-side.
cat > /opt/sentinel/conf/wazuh-dashboard/opensearch_dashboards.yml << OSD_EOF
server.host: "0.0.0.0"
server.port: 5601
server.basePath: "/wazuh"
server.rewriteBasePath: true
opensearch.hosts: ["https://wazuh.indexer:9200"]
opensearch.ssl.verificationMode: certificate
opensearch.requestHeadersAllowlist: ["securitytenant","Authorization"]
opensearch.ssl.certificateAuthorities: ["/usr/share/wazuh-dashboard/certs/root-ca.pem"]
opensearch.ssl.certificate: "/usr/share/wazuh-dashboard/certs/wazuh-dashboard.pem"
opensearch.ssl.key: "/usr/share/wazuh-dashboard/certs/wazuh-dashboard.key"
opensearch.username: "kibanaserver"
opensearch.password: "WazuhSentinel24"
server.ssl.enabled: false
opensearch_security.multitenancy.enabled: false
uiSettings.overrides.defaultRoute: /app/wz-home
# Cognito SSO via the OpenSearch security plugin's OIDC backend.  The
# corresponding openid_auth_domain block is written to the indexer's
# /opensearch-security/config.yml further below.
opensearch_security.auth.type: "openid"
opensearch_security.openid.connect_url: "https://cognito-idp.${aws_region}.amazonaws.com/${cognito_user_pool_id}/.well-known/openid-configuration"
opensearch_security.openid.client_id: "${soc_client_id}"
opensearch_security.openid.client_secret: "${soc_client_secret}"
opensearch_security.openid.scope: "openid email profile"
opensearch_security.openid.base_redirect_url: "${site_url}/wazuh"
opensearch_security.openid.logout_url: "${cognito_domain_url}/logout?client_id=${soc_client_id}&logout_uri=${site_url}/wazuh/"
OSD_EOF

# wazuh.yml must be read-only (444); the wazuh dashboard image's entrypoint
# (wazuh_app_config.sh) re-runs on every container start and appends a second
# `hosts:` block when the file is writable, producing a "duplicated mapping
# key" YAML parse error and crash-looping the dashboard.
cat > /opt/sentinel/conf/wazuh-dashboard/wazuh.yml << 'WAZUH_YML_EOF'
pattern: "wazuh-alerts-*"
hosts:
  - default:
      url: "https://wazuh-manager"
      port: 55000
      username: "wazuh-wui"
      password: "WazuhSentinel24!"
      run_as: false
WAZUH_YML_EOF
chmod 444 /opt/sentinel/conf/wazuh-dashboard/wazuh.yml

# Elasticsearch writes as UID 1000 inside the container
chown -R 1000:1000 /opt/sentinel/data/elasticsearch
# Wazuh manager runs as uid 999 inside the container; analysisd needs to create
# year subdirectories under logs/{alerts,archives,firewall}, so the entire
# wazuh_logs tree must be writable by uid 999. Without this, analysisd crashes
# with "Could not create directory 'logs/firewall/2026/'" and the API returns
# 500, which breaks the dashboard's wazuh plugin.
chown -R 999:999 /opt/sentinel/data/wazuh_logs
chmod -R u+rwX,g+rX /opt/sentinel/data/wazuh_logs
# wazuh.indexer (OpenSearch fork) runs as uid 1000 inside the container
chown -R 1000:1000 /opt/sentinel/data/wazuh_indexer

# ── Wazuh stack TLS certs ─────────────────────────────────────────────────────
# Self-signed CA + server certs for wazuh.indexer, wazuh-dashboard, wazuh-manager
# (filebeat module), and an admin client cert for the OpenSearch security
# plugin. AL2 ships openssl 1.0.2 which lacks -addext, so we drive SAN via an
# openssl config file.
WZ_CERTS=/opt/sentinel/conf/wazuh-certs
if [ ! -f "$WZ_CERTS/root-ca.pem" ]; then
  cd "$WZ_CERTS"
  # Docker bind-mounts auto-create missing source paths as DIRECTORIES,
  # so a prior failed boot may have left empty dirs where files should go.
  # Wipe anything that's a dir so openssl can write actual files.
  for path in *.pem *.key; do
    [ -d "$path" ] && rm -rf "$path"
  done
  openssl genrsa -out root-ca.key 2048 2>/dev/null
  openssl req -x509 -new -nodes -key root-ca.key -sha256 -days 3650 \
    -subj "/CN=SentinelNet Root CA" -out root-ca.pem 2>/dev/null
  for name in wazuh.indexer wazuh-dashboard filebeat admin; do
    openssl genrsa -out $name.key 2048
    # CSR with just CN; SAN goes in via -extfile at sign time (works on
    # AL2's openssl 1.0.2 which lacks `-addext`).
    openssl req -new -key $name.key -subj "/CN=$name" -out $name.csr
    cat > $name.ext <<EXT
subjectAltName = DNS:$name,DNS:wazuh-manager,DNS:localhost,IP:127.0.0.1
EXT
    openssl x509 -req -in $name.csr -CA root-ca.pem -CAkey root-ca.key \
      -CAcreateserial -out $name.pem -days 3650 -sha256 -extfile $name.ext
    rm -f $name.csr $name.ext
  done
  # OpenSearch indexer requires PKCS#8 keys; convert PKCS#1 → PKCS#8
  for name in wazuh.indexer wazuh-dashboard filebeat admin; do
    openssl pkcs8 -inform PEM -outform PEM -in $name.key -topk8 -nocrypt \
      -out $name.key.pk8 2>/dev/null
    mv $name.key.pk8 $name.key
  done
  chmod 644 *.pem *.key
  chown -R 1000:1000 "$WZ_CERTS"
  cd -
fi

# ── Wazuh Indexer (OpenSearch fork) config ────────────────────────────────────
cat > /opt/sentinel/conf/wazuh-indexer/opensearch.yml << 'OS_YML_EOF'
network.host: 0.0.0.0
node.name: "wazuh.indexer"
cluster.name: "wazuh-cluster"
discovery.type: single-node
bootstrap.memory_lock: true
plugins.security.ssl.http.pemcert_filepath: certs/wazuh.indexer.pem
plugins.security.ssl.http.pemkey_filepath: certs/wazuh.indexer.key
plugins.security.ssl.http.pemtrustedcas_filepath: certs/root-ca.pem
plugins.security.ssl.transport.pemcert_filepath: certs/wazuh.indexer.pem
plugins.security.ssl.transport.pemkey_filepath: certs/wazuh.indexer.key
plugins.security.ssl.transport.pemtrustedcas_filepath: certs/root-ca.pem
plugins.security.ssl.http.enabled: true
plugins.security.ssl.transport.enforce_hostname_verification: false
plugins.security.ssl.transport.resolve_hostname: false
plugins.security.authcz.admin_dn:
  - "CN=admin"
plugins.security.check_snapshot_restore_write_privileges: true
plugins.security.enable_snapshot_restore_privilege: true
plugins.security.nodes_dn:
  - "CN=wazuh.indexer"
plugins.security.restapi.roles_enabled: ["all_access", "security_rest_api_access"]
plugins.security.system_indices.enabled: true
plugins.security.system_indices.indices:
  [".opendistro-alerting-config", ".opendistro-alerting-alert*",
   ".opendistro-anomaly-results*", ".opendistro-anomaly-detector*",
   ".opendistro-anomaly-checkpoints", ".opendistro-anomaly-detection-state",
   ".opendistro-reports-*", ".opensearch-notifications-*",
   ".opensearch-notebooks", ".opensearch-observability",
   ".opendistro-asynchronous-search-response*", ".replication-metadata-store"]
compatibility.override_main_response_version: true
OS_YML_EOF

# Internal users — bcrypt hashes for "WazuhSentinel24" computed at boot so we
# don't ship credentials in the rendered user_data. python3 + bcrypt is enough.
pip3 install bcrypt --quiet 2>/dev/null || true
ADMIN_HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw(b'WazuhSentinel24', bcrypt.gensalt(12)).decode())")
KIBANASERVER_HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw(b'WazuhSentinel24', bcrypt.gensalt(12)).decode())")
# OpenSearch security config — OIDC auth domain pointing at Cognito so users
# hitting the dashboard get redirected to Cognito instead of the local login
# form. Basic auth still works as a fallback (via `kibanaserver` etc.) for
# the dashboard's own backend connection.
cat > /opt/sentinel/conf/wazuh-indexer/config.yml << OSC_YML_EOF
---
_meta:
  type: "config"
  config_version: 2
config:
  dynamic:
    http:
      anonymous_auth_enabled: false
      xff:
        enabled: false
    authc:
      openid_auth_domain:
        description: "Authenticate via Cognito OpenID Connect"
        http_enabled: true
        transport_enabled: true
        order: 0
        http_authenticator:
          type: openid
          challenge: false
          config:
            subject_key: email
            roles_key: "cognito:groups"
            openid_connect_url: "https://cognito-idp.${aws_region}.amazonaws.com/${cognito_user_pool_id}/.well-known/openid-configuration"
        authentication_backend:
          type: noop
      basic_internal_auth_domain:
        description: "Authenticate via HTTP Basic against internal users database"
        http_enabled: true
        transport_enabled: true
        order: 4
        http_authenticator:
          type: basic
          challenge: true
        authentication_backend:
          type: intern
OSC_YML_EOF

# Roles mapping — only Admins and Analysts get into the Wazuh dashboard.
# Viewers are intentionally left off so they get a 403 from the security
# plugin when Cognito redirects them here, matching the access policy on
# TheHive and Grafana. The dashboard itself is for read+write SOC work;
# Viewers consume telemetry through the SentinelNet UI only.
cat > /opt/sentinel/conf/wazuh-indexer/roles_mapping.yml << RM_YML_EOF
---
_meta:
  type: "rolesmapping"
  config_version: 2
all_access:
  reserved: false
  backend_roles:
    - "admin"
    - "${admin_group_name}"
    - "${analyst_group_name}"
  description: "admin + admin/analyst cognito groups → all_access"
own_index:
  reserved: false
  users:
    - "*"
kibana_user:
  reserved: false
  backend_roles:
    - "kibanauser"
    - "${admin_group_name}"
    - "${analyst_group_name}"
kibana_server:
  reserved: true
  users:
    - "kibanaserver"
  description: "Required for the dashboard's backend connection"
manage_wazuh_index:
  reserved: true
  users:
    - "kibanaserver"
  description: "Lets the dashboard write to wazuh-* templates"
manage_snapshots:
  reserved: false
  backend_roles:
    - "snapshotrestore"
logstash:
  reserved: false
  backend_roles:
    - "logstash"
readall:
  reserved: false
  backend_roles:
    - "readall"
RM_YML_EOF

cat > /opt/sentinel/conf/wazuh-indexer/internal_users.yml <<IU_YML_EOF
---
_meta:
  type: "internalusers"
  config_version: 2
admin:
  hash: "$ADMIN_HASH"
  reserved: true
  backend_roles: ["admin"]
kibanaserver:
  hash: "$KIBANASERVER_HASH"
  reserved: true
wazuh-wui:
  hash: "$ADMIN_HASH"
  reserved: false
  backend_roles: ["admin"]
IU_YML_EOF

# ── TheHive configuration ──────────────────────────────────────────────────────
# TheHive 5 OAuth2 / OIDC against Cognito.  `auth.sso.autologin = true` makes
# the UI redirect straight to Cognito — no local login form is shown.  `local`
# stays in `auth.provider` so the bootstrap script below can still POST to
# /api/login with admin@thehive.local to mint a dashboard-api API key.
cat > /opt/sentinel/conf/thehive.conf << 'THEHIVE_EOF'
play.http.context = "/thehive"
application.baseUrl = "${site_url}/thehive"

db.janusgraph.storage.backend = cql
db.janusgraph.storage.hostname = ["cassandra"]
db.janusgraph.storage.cql.cluster-name = thp
db.janusgraph.storage.cql.keyspace = thehive
db.janusgraph.storage.cql.local-datacenter = datacenter1

index.search.backend = elasticsearch
index.search.hostname = ["elasticsearch"]

storage.backend = "local"
storage.local.directory = "/opt/thp/thehive/files"

auth {
  providers = [
    {name: session}
    {name: basic, realm: thehive}
    {name: local}
    {name: key}
    {name: oauth2}
  ]

  defaults.oauth2 {
    clientId            = "${soc_client_id}"
    clientSecret        = "${soc_client_secret}"
    redirectUri         = "${site_url}/thehive/api/ssoLogin"
    responseType        = "code"
    grantType           = "authorization_code"
    authorizationUrl    = "${cognito_domain_url}/oauth2/authorize"
    tokenUrl            = "${cognito_domain_url}/oauth2/token"
    userUrl             = "${cognito_domain_url}/oauth2/userInfo"
    scope               = ["openid", "email", "profile"]
    userIdField         = "email"
    authorizationHeader = "Bearer"
    defaultOrganisation = "SentinelNet"
  }

  sso {
    autocreate          = true
    autoupdate          = true
    autologin           = true
    defaultRoles        = ["read", "write"]
    defaultOrganisation = "SentinelNet"
  }
}

user.autoCreateOnSso       = true
user.defaults.organisation = "SentinelNet"
THEHIVE_EOF

# ── Filebeat configuration ─────────────────────────────────────────────────────
# Reads Wazuh alerts.json (newline-delimited JSON) and ships to Elasticsearch.
# Index pattern: wazuh-alerts-YYYY.MM.DD  (queried by Grafana)
cat > /opt/sentinel/conf/filebeat.yml << 'FILEBEAT_EOF'
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/ossec/logs/alerts/alerts.json
    json.keys_under_root: true
    json.add_error_key: true
    json.overwrite_keys: true
    close_inactive: 24h
    scan_frequency: 10s
    tags: ["wazuh", "alerts"]

output.elasticsearch:
  hosts: ["http://elasticsearch:9200"]
  index: "wazuh-alerts-%%{+yyyy.MM.dd}"
  allow_older_versions: true

setup.template.name: "wazuh"
setup.template.pattern: "wazuh-alerts-*"
setup.template.settings:
  index.number_of_shards: 1
  index.number_of_replicas: 0
setup.ilm.enabled: false

logging.level: warning
FILEBEAT_EOF

# ── Grafana: Elasticsearch data source ────────────────────────────────────────
cat > /opt/sentinel/conf/grafana/provisioning/datasources/elasticsearch.yaml << 'GF_DS_EOF'
apiVersion: 1
datasources:
  - name: Wazuh-Elasticsearch
    type: elasticsearch
    uid: wazuh-es
    url: http://elasticsearch:9200
    access: proxy
    isDefault: true
    jsonData:
      index: "wazuh-alerts-*"
      timeField: "@timestamp"
      esVersion: "7.10.0"
      logMessageField: "full_log"
      logLevelField: "rule.level"
GF_DS_EOF

# ── Grafana: dashboard file provider ──────────────────────────────────────────
cat > /opt/sentinel/conf/grafana/provisioning/dashboards/default.yaml << 'GF_PROV_EOF'
apiVersion: 1
providers:
  - name: Wazuh
    orgId: 1
    folder: "Wazuh"
    type: file
    disableDeletion: false
    updateIntervalSeconds: 60
    options:
      path: /etc/grafana/dashboards
GF_PROV_EOF

# ── Grafana: Wazuh Security Alerts dashboard ───────────────────────────────────
# All datasource references use the UID "wazuh-es" provisioned above.
# Panels: stat overview, alerts timeline, top rules, top agents,
#         level distribution, severity buckets, recent alert logs.
cat > /opt/sentinel/conf/grafana/dashboards/wazuh-alerts.json << 'DASHBOARD_EOF'
{
  "id": null,
  "uid": "wazuh-alerts",
  "title": "Wazuh Security Alerts",
  "tags": ["wazuh", "security"],
  "timezone": "browser",
  "schemaVersion": 38,
  "version": 1,
  "refresh": "30s",
  "time": {"from": "now-24h", "to": "now"},
  "timepicker": {},
  "templating": {"list": []},
  "annotations": {"list": []},
  "panels": [
    {
      "type": "row",
      "id": 100,
      "title": "Overview",
      "collapsed": false,
      "gridPos": {"h": 1, "w": 24, "x": 0, "y": 0}
    },
    {
      "id": 1,
      "type": "stat",
      "title": "Total Alerts (24h)",
      "gridPos": {"h": 4, "w": 6, "x": 0, "y": 1},
      "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
      "targets": [{
        "refId": "A",
        "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
        "query": "",
        "alias": "Total",
        "metrics": [{"type": "count", "id": "1"}],
        "bucketAggs": [{"type": "date_histogram", "field": "@timestamp", "id": "2", "settings": {"interval": "auto", "min_doc_count": "0"}}],
        "timeField": "@timestamp"
      }],
      "options": {
        "reduceOptions": {"values": false, "calcs": ["sum"]},
        "orientation": "auto",
        "textMode": "auto",
        "colorMode": "background",
        "graphMode": "none",
        "justifyMode": "auto"
      },
      "fieldConfig": {
        "defaults": {
          "unit": "short",
          "color": {"mode": "thresholds"},
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {"color": "green", "value": null},
              {"color": "yellow", "value": 50},
              {"color": "red", "value": 200}
            ]
          }
        },
        "overrides": []
      }
    },
    {
      "id": 2,
      "type": "stat",
      "title": "Critical Alerts (level 12+)",
      "gridPos": {"h": 4, "w": 6, "x": 6, "y": 1},
      "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
      "targets": [{
        "refId": "A",
        "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
        "query": "rule.level:[12 TO *]",
        "alias": "Critical",
        "metrics": [{"type": "count", "id": "1"}],
        "bucketAggs": [{"type": "date_histogram", "field": "@timestamp", "id": "2", "settings": {"interval": "auto", "min_doc_count": "0"}}],
        "timeField": "@timestamp"
      }],
      "options": {
        "reduceOptions": {"values": false, "calcs": ["sum"]},
        "orientation": "auto",
        "textMode": "auto",
        "colorMode": "background",
        "graphMode": "none",
        "justifyMode": "auto"
      },
      "fieldConfig": {
        "defaults": {
          "unit": "short",
          "color": {"mode": "fixed", "fixedColor": "red"},
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {"color": "green", "value": null},
              {"color": "red", "value": 1}
            ]
          }
        },
        "overrides": []
      }
    },
    {
      "id": 3,
      "type": "stat",
      "title": "High Alerts (level 7-11)",
      "gridPos": {"h": 4, "w": 6, "x": 12, "y": 1},
      "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
      "targets": [{
        "refId": "A",
        "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
        "query": "rule.level:[7 TO 11]",
        "alias": "High",
        "metrics": [{"type": "count", "id": "1"}],
        "bucketAggs": [{"type": "date_histogram", "field": "@timestamp", "id": "2", "settings": {"interval": "auto", "min_doc_count": "0"}}],
        "timeField": "@timestamp"
      }],
      "options": {
        "reduceOptions": {"values": false, "calcs": ["sum"]},
        "orientation": "auto",
        "textMode": "auto",
        "colorMode": "background",
        "graphMode": "none",
        "justifyMode": "auto"
      },
      "fieldConfig": {
        "defaults": {
          "unit": "short",
          "color": {"mode": "fixed", "fixedColor": "orange"},
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {"color": "green", "value": null},
              {"color": "orange", "value": 1}
            ]
          }
        },
        "overrides": []
      }
    },
    {
      "id": 4,
      "type": "stat",
      "title": "Active Agents",
      "gridPos": {"h": 4, "w": 6, "x": 18, "y": 1},
      "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
      "targets": [{
        "refId": "A",
        "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
        "query": "",
        "alias": "Agents",
        "metrics": [{"type": "cardinality", "id": "1", "field": "agent.name.keyword"}],
        "bucketAggs": [{"type": "date_histogram", "field": "@timestamp", "id": "2", "settings": {"interval": "auto", "min_doc_count": "0"}}],
        "timeField": "@timestamp"
      }],
      "options": {
        "reduceOptions": {"values": false, "calcs": ["lastNotNull"]},
        "orientation": "auto",
        "textMode": "auto",
        "colorMode": "background",
        "graphMode": "none",
        "justifyMode": "auto"
      },
      "fieldConfig": {
        "defaults": {
          "unit": "short",
          "color": {"mode": "fixed", "fixedColor": "blue"},
          "thresholds": {
            "mode": "absolute",
            "steps": [{"color": "blue", "value": null}]
          }
        },
        "overrides": []
      }
    },
    {
      "id": 10,
      "type": "timeseries",
      "title": "Alerts Over Time",
      "gridPos": {"h": 8, "w": 24, "x": 0, "y": 5},
      "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
      "targets": [
        {
          "refId": "A",
          "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
          "query": "",
          "alias": "All Alerts",
          "metrics": [{"type": "count", "id": "1"}],
          "bucketAggs": [{"type": "date_histogram", "field": "@timestamp", "id": "2",
            "settings": {"interval": "auto", "min_doc_count": "0", "trimEdges": "0"}}],
          "timeField": "@timestamp"
        },
        {
          "refId": "B",
          "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
          "query": "rule.level:[7 TO *]",
          "alias": "High+Critical",
          "metrics": [{"type": "count", "id": "1"}],
          "bucketAggs": [{"type": "date_histogram", "field": "@timestamp", "id": "2",
            "settings": {"interval": "auto", "min_doc_count": "0", "trimEdges": "0"}}],
          "timeField": "@timestamp"
        }
      ],
      "options": {
        "tooltip": {"mode": "multi", "sort": "none"},
        "legend": {"displayMode": "list", "placement": "bottom", "calcs": []}
      },
      "fieldConfig": {
        "defaults": {
          "color": {"mode": "palette-classic"},
          "custom": {
            "drawStyle": "line",
            "lineInterpolation": "linear",
            "lineWidth": 2,
            "fillOpacity": 10,
            "showPoints": "never",
            "spanNulls": true
          }
        },
        "overrides": [
          {
            "matcher": {"id": "byName", "options": "High+Critical"},
            "properties": [{"id": "color", "value": {"fixedColor": "orange", "mode": "fixed"}}]
          }
        ]
      }
    },
    {
      "type": "row",
      "id": 101,
      "title": "Analysis",
      "collapsed": false,
      "gridPos": {"h": 1, "w": 24, "x": 0, "y": 13}
    },
    {
      "id": 20,
      "type": "table",
      "title": "Top 10 Alert Rules",
      "gridPos": {"h": 8, "w": 12, "x": 0, "y": 14},
      "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
      "targets": [{
        "refId": "A",
        "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
        "query": "",
        "metrics": [{"type": "count", "id": "1"}],
        "bucketAggs": [{"type": "terms", "field": "rule.description.keyword", "id": "2",
          "settings": {"size": "10", "order": "desc", "orderBy": "1", "min_doc_count": "1"}}],
        "timeField": "@timestamp"
      }],
      "options": {"showHeader": true, "footer": {"show": false}},
      "fieldConfig": {
        "defaults": {"custom": {"align": "auto"}},
        "overrides": [
          {"matcher": {"id": "byName", "options": "rule.description.keyword"},
           "properties": [{"id": "displayName", "value": "Rule Description"},
                          {"id": "custom.width", "value": 400}]},
          {"matcher": {"id": "byName", "options": "Count"},
           "properties": [{"id": "displayName", "value": "Count"},
                          {"id": "custom.width", "value": 80}]}
        ]
      },
      "transformations": [{"id": "organize", "options": {
        "renameByName": {"rule.description.keyword": "Rule Description", "Count": "Count"}
      }}]
    },
    {
      "id": 21,
      "type": "table",
      "title": "Top 10 Agents",
      "gridPos": {"h": 8, "w": 12, "x": 12, "y": 14},
      "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
      "targets": [{
        "refId": "A",
        "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
        "query": "",
        "metrics": [{"type": "count", "id": "1"}],
        "bucketAggs": [{"type": "terms", "field": "agent.name.keyword", "id": "2",
          "settings": {"size": "10", "order": "desc", "orderBy": "1", "min_doc_count": "1"}}],
        "timeField": "@timestamp"
      }],
      "options": {"showHeader": true, "footer": {"show": false}},
      "fieldConfig": {
        "defaults": {"custom": {"align": "auto"}},
        "overrides": [
          {"matcher": {"id": "byName", "options": "agent.name.keyword"},
           "properties": [{"id": "displayName", "value": "Agent"},
                          {"id": "custom.width", "value": 250}]},
          {"matcher": {"id": "byName", "options": "Count"},
           "properties": [{"id": "displayName", "value": "Alert Count"},
                          {"id": "custom.width", "value": 100}]}
        ]
      },
      "transformations": [{"id": "organize", "options": {
        "renameByName": {"agent.name.keyword": "Agent", "Count": "Alert Count"}
      }}]
    },
    {
      "type": "row",
      "id": 102,
      "title": "Severity Distribution",
      "collapsed": false,
      "gridPos": {"h": 1, "w": 24, "x": 0, "y": 22}
    },
    {
      "id": 30,
      "type": "piechart",
      "title": "Alert Level Distribution",
      "gridPos": {"h": 8, "w": 10, "x": 0, "y": 23},
      "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
      "targets": [{
        "refId": "A",
        "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
        "query": "",
        "metrics": [{"type": "count", "id": "1"}],
        "bucketAggs": [{"type": "terms", "field": "rule.level", "id": "2",
          "settings": {"size": "15", "order": "desc", "orderBy": "1", "min_doc_count": "1"}}],
        "timeField": "@timestamp"
      }],
      "options": {
        "pieType": "pie",
        "tooltip": {"mode": "single"},
        "legend": {"displayMode": "table", "placement": "right", "calcs": ["sum"]}
      },
      "fieldConfig": {
        "defaults": {"color": {"mode": "palette-classic"}},
        "overrides": []
      }
    },
    {
      "id": 31,
      "type": "bargauge",
      "title": "Alerts by Severity Bucket",
      "gridPos": {"h": 8, "w": 14, "x": 10, "y": 23},
      "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
      "targets": [
        {
          "refId": "A",
          "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
          "query": "rule.level:[1 TO 3]",
          "alias": "Low (1-3)",
          "metrics": [{"type": "count", "id": "1"}],
          "bucketAggs": [{"type": "date_histogram", "field": "@timestamp", "id": "2", "settings": {"interval": "auto", "min_doc_count": "0"}}],
          "timeField": "@timestamp"
        },
        {
          "refId": "B",
          "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
          "query": "rule.level:[4 TO 6]",
          "alias": "Medium (4-6)",
          "metrics": [{"type": "count", "id": "1"}],
          "bucketAggs": [{"type": "date_histogram", "field": "@timestamp", "id": "2", "settings": {"interval": "auto", "min_doc_count": "0"}}],
          "timeField": "@timestamp"
        },
        {
          "refId": "C",
          "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
          "query": "rule.level:[7 TO 11]",
          "alias": "High (7-11)",
          "metrics": [{"type": "count", "id": "1"}],
          "bucketAggs": [{"type": "date_histogram", "field": "@timestamp", "id": "2", "settings": {"interval": "auto", "min_doc_count": "0"}}],
          "timeField": "@timestamp"
        },
        {
          "refId": "D",
          "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
          "query": "rule.level:[12 TO *]",
          "alias": "Critical (12+)",
          "metrics": [{"type": "count", "id": "1"}],
          "bucketAggs": [{"type": "date_histogram", "field": "@timestamp", "id": "2", "settings": {"interval": "auto", "min_doc_count": "0"}}],
          "timeField": "@timestamp"
        }
      ],
      "options": {
        "reduceOptions": {"values": false, "calcs": ["sum"]},
        "orientation": "horizontal",
        "displayMode": "lcd",
        "valueMode": "color",
        "minVizHeight": 10,
        "minVizWidth": 0,
        "namePlacement": "auto"
      },
      "fieldConfig": {
        "defaults": {
          "unit": "short",
          "color": {"mode": "palette-classic"},
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {"color": "blue", "value": null},
              {"color": "green", "value": 1},
              {"color": "yellow", "value": 5},
              {"color": "orange", "value": 20},
              {"color": "red", "value": 50}
            ]
          }
        },
        "overrides": [
          {"matcher": {"id": "byName", "options": "Low (1-3)"},
           "properties": [{"id": "color", "value": {"fixedColor": "green", "mode": "fixed"}}]},
          {"matcher": {"id": "byName", "options": "Medium (4-6)"},
           "properties": [{"id": "color", "value": {"fixedColor": "yellow", "mode": "fixed"}}]},
          {"matcher": {"id": "byName", "options": "High (7-11)"},
           "properties": [{"id": "color", "value": {"fixedColor": "orange", "mode": "fixed"}}]},
          {"matcher": {"id": "byName", "options": "Critical (12+)"},
           "properties": [{"id": "color", "value": {"fixedColor": "red", "mode": "fixed"}}]}
        ]
      }
    },
    {
      "type": "row",
      "id": 103,
      "title": "Recent Alerts",
      "collapsed": false,
      "gridPos": {"h": 1, "w": 24, "x": 0, "y": 31}
    },
    {
      "id": 40,
      "type": "logs",
      "title": "Recent Security Events",
      "gridPos": {"h": 12, "w": 24, "x": 0, "y": 32},
      "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
      "targets": [{
        "refId": "A",
        "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
        "query": "",
        "metrics": [{"type": "logs", "id": "1", "settings": {"limit": "100"}}],
        "bucketAggs": [{"type": "date_histogram", "field": "@timestamp", "id": "2", "settings": {"interval": "auto", "min_doc_count": "0"}}],
        "timeField": "@timestamp"
      }],
      "options": {
        "dedupStrategy": "none",
        "showLabels": false,
        "showTime": true,
        "wrapLogMessage": true,
        "prettifyLogMessage": false,
        "enableLogDetails": true,
        "sortOrder": "Descending"
      }
    }
  ]
}
DASHBOARD_EOF

# ── docker-compose.yml ─────────────────────────────────────────────────────────
cat > /opt/sentinel/docker-compose.yml << 'COMPOSE_EOF'
version: '3.8'

services:

  # ── Elasticsearch (Wazuh alert index queried by Grafana) ────────────────────
  elasticsearch:
    image: elasticsearch:7.17.13
    hostname: elasticsearch
    restart: unless-stopped
    environment:
      discovery.type: "single-node"
      cluster.name: "thp"
      ES_JAVA_OPTS: "-Xms512M -Xmx512M"
      xpack.security.enabled: "false"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - /opt/sentinel/data/elasticsearch:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:9200/_cluster/health?wait_for_status=yellow&timeout=5s || exit 1"]
      interval: 20s
      timeout: 10s
      retries: 15
      start_period: 60s

  # ── Cassandra (TheHive 5 graph storage backend) ──────────────────────────────
  cassandra:
    image: cassandra:4.1
    hostname: cassandra
    restart: unless-stopped
    environment:
      MAX_HEAP_SIZE: "256M"
      HEAP_NEWSIZE: "64M"
      CASSANDRA_CLUSTER_NAME: "thp"
      CASSANDRA_DC: "datacenter1"
      CASSANDRA_ENDPOINT_SNITCH: "GossipingPropertyFileSnitch"
    volumes:
      - cassandra_data:/var/lib/cassandra
    healthcheck:
      test: ["CMD-SHELL", "cqlsh -e 'describe cluster' || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 15
      start_period: 90s

  # ── TheHive 5 (security incident management — Cassandra + ES backend) ─────────
  thehive:
    image: strangebee/thehive:5.4.0
    hostname: thehive
    restart: unless-stopped
    depends_on:
      elasticsearch:
        condition: service_healthy
      cassandra:
        condition: service_healthy
    ports:
      - "9000:9000"
    environment:
      JAVA_OPTS: "-Xms384M -Xmx384M"
    volumes:
      - /opt/sentinel/conf/thehive.conf:/etc/thehive/application.conf:ro
      - thehive_data:/opt/thp/thehive/files
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:9000/thehive/api/status || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 10
      start_period: 180s

  # ── Wazuh Manager (SIEM / EDR) ──────────────────────────────────────────────
  # Agents connect on 1514 (events), 1515 (registration), 55000 (REST API).
  # Alerts are written to /var/ossec/logs/alerts/alerts.json as newline-JSON,
  # then shipped by the manager's bundled filebeat directly to wazuh.indexer.
  wazuh:
    image: wazuh/wazuh-manager:4.9.2
    hostname: wazuh-manager
    restart: unless-stopped
    ports:
      - "1514:1514/tcp"
      - "1514:1514/udp"
      - "1515:1515/tcp"
      - "55000:55000/tcp"
    environment:
      INDEXER_URL: https://wazuh.indexer:9200
      INDEXER_USERNAME: admin
      INDEXER_PASSWORD: WazuhSentinel24
      FILEBEAT_SSL_VERIFICATION_MODE: full
      SSL_CERTIFICATE_AUTHORITIES: /etc/ssl/root-ca.pem
      SSL_CERTIFICATE: /etc/ssl/filebeat.pem
      SSL_KEY: /etc/ssl/filebeat.key
      # Wazuh-manager API user used by the dashboard plugin and our
      # dashboard-api service. The image creates wazuh-wui with default
      # password "wazuh-wui" on first boot; we reset it post-startup
      # via /security/users to the value below (see post-compose-up
      # block further down in this script).
      API_USERNAME: wazuh-wui
      API_PASSWORD: WazuhSentinel24!
    volumes:
      - /opt/sentinel/data/wazuh_data:/var/ossec/data
      - /opt/sentinel/data/wazuh_etc:/var/ossec/etc
      - /opt/sentinel/data/wazuh_logs:/var/ossec/logs
      # Persist API rbac.db so the wazuh-wui password change survives
      # container recreates (otherwise the default "wazuh-wui" password
      # comes back on every fresh container).
      - /opt/sentinel/data/wazuh_api:/var/ossec/api/configuration
      - /opt/sentinel/conf/wazuh-certs/root-ca.pem:/etc/ssl/root-ca.pem:ro
      - /opt/sentinel/conf/wazuh-certs/filebeat.pem:/etc/ssl/filebeat.pem:ro
      - /opt/sentinel/conf/wazuh-certs/filebeat.key:/etc/ssl/filebeat.key:ro

  # ── Wazuh Indexer (OpenSearch fork — stores wazuh-alerts-* indices) ─────────
  wazuh.indexer:
    image: wazuh/wazuh-indexer:4.9.2
    hostname: wazuh.indexer
    restart: unless-stopped
    environment:
      OPENSEARCH_JAVA_OPTS: "-Xms1g -Xmx1g"
    ulimits:
      memlock: { soft: -1, hard: -1 }
      nofile:  { soft: 65536, hard: 65536 }
    volumes:
      - /opt/sentinel/data/wazuh_indexer:/var/lib/wazuh-indexer
      - /opt/sentinel/conf/wazuh-certs/root-ca.pem:/usr/share/wazuh-indexer/certs/root-ca.pem:ro
      - /opt/sentinel/conf/wazuh-certs/wazuh.indexer.pem:/usr/share/wazuh-indexer/certs/wazuh.indexer.pem:ro
      - /opt/sentinel/conf/wazuh-certs/wazuh.indexer.key:/usr/share/wazuh-indexer/certs/wazuh.indexer.key:ro
      - /opt/sentinel/conf/wazuh-certs/admin.pem:/usr/share/wazuh-indexer/certs/admin.pem:ro
      - /opt/sentinel/conf/wazuh-certs/admin.key:/usr/share/wazuh-indexer/certs/admin.key:ro
      - /opt/sentinel/conf/wazuh-indexer/opensearch.yml:/usr/share/wazuh-indexer/opensearch.yml:ro
      - /opt/sentinel/conf/wazuh-indexer/internal_users.yml:/usr/share/wazuh-indexer/opensearch-security/internal_users.yml:ro
      - /opt/sentinel/conf/wazuh-indexer/config.yml:/usr/share/wazuh-indexer/opensearch-security/config.yml:ro
      - /opt/sentinel/conf/wazuh-indexer/roles_mapping.yml:/usr/share/wazuh-indexer/opensearch-security/roles_mapping.yml:ro
    healthcheck:
      # Just probe that the HTTPS port is responding — auth requires the
      # security plugin to be initialized, which we do post-compose-up via
      # securityadmin.sh below. Any HTTP response (200/401/503) is enough
      # to signal "indexer is alive".
      test: ["CMD-SHELL", "curl -sk -o /dev/null -m 3 https://localhost:9200/"]
      interval: 15s
      timeout: 5s
      retries: 30
      start_period: 60s

  # ── Wazuh Dashboard (OpenSearch Dashboards fork w/ wazuh plugin) ────────────
  wazuh-dashboard:
    image: wazuh/wazuh-dashboard:4.9.2
    hostname: wazuh-dashboard
    restart: unless-stopped
    depends_on:
      wazuh.indexer: { condition: service_healthy }
    ports:
      - "5601:5601"
    environment:
      INDEXER_USERNAME: kibanaserver
      INDEXER_PASSWORD: WazuhSentinel24
      WAZUH_API_URL: https://wazuh-manager
      DASHBOARD_USERNAME: kibanaserver
      DASHBOARD_PASSWORD: WazuhSentinel24
    volumes:
      - /opt/sentinel/conf/wazuh-certs/root-ca.pem:/usr/share/wazuh-dashboard/certs/root-ca.pem:ro
      - /opt/sentinel/conf/wazuh-certs/wazuh-dashboard.pem:/usr/share/wazuh-dashboard/certs/wazuh-dashboard.pem:ro
      - /opt/sentinel/conf/wazuh-certs/wazuh-dashboard.key:/usr/share/wazuh-dashboard/certs/wazuh-dashboard.key:ro
      - /opt/sentinel/conf/wazuh-dashboard/opensearch_dashboards.yml:/usr/share/wazuh-dashboard/config/opensearch_dashboards.yml
      - /opt/sentinel/conf/wazuh-dashboard/wazuh.yml:/usr/share/wazuh-dashboard/data/wazuh/config/wazuh.yml:ro

  # ── Filebeat (ships Wazuh alerts → Elasticsearch wazuh-alerts-* index) ──────
  # Must match Elasticsearch major version (7.x here).
  filebeat:
    image: docker.elastic.co/beats/filebeat:7.17.13
    hostname: filebeat
    user: root
    restart: unless-stopped
    depends_on:
      elasticsearch:
        condition: service_healthy
    command: filebeat -e -strict.perms=false
    volumes:
      - /opt/sentinel/conf/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /opt/sentinel/data/wazuh_logs:/var/ossec/logs:ro

  # ── Grafana (dashboards — Wazuh alerts from Elasticsearch) ──────────────────
  grafana:
    image: grafana/grafana:10.4.3
    hostname: grafana
    restart: unless-stopped
    depends_on:
      elasticsearch:
        condition: service_healthy
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_USER: "admin"
      GF_SECURITY_ADMIN_PASSWORD: "sentinel-change-me"
      GF_SERVER_ROOT_URL: "${site_url}/grafana/"
      GF_SERVER_SERVE_FROM_SUB_PATH: "true"
      GF_SECURITY_COOKIE_SECURE: "true"
      GF_SECURITY_COOKIE_SAMESITE: "none"
      GF_AUTH_DISABLE_LOGIN_FORM: "true"
      GF_AUTH_OAUTH_AUTO_LOGIN: "true"
      GF_AUTH_GENERIC_OAUTH_ENABLED: "true"
      GF_AUTH_GENERIC_OAUTH_NAME: "SentinelNet"
      GF_AUTH_GENERIC_OAUTH_CLIENT_ID: "${soc_client_id}"
      GF_AUTH_GENERIC_OAUTH_CLIENT_SECRET: "${soc_client_secret}"
      GF_AUTH_GENERIC_OAUTH_SCOPES: "openid email profile"
      GF_AUTH_GENERIC_OAUTH_AUTH_URL: "${cognito_domain_url}/oauth2/authorize"
      GF_AUTH_GENERIC_OAUTH_TOKEN_URL: "${cognito_domain_url}/oauth2/token"
      GF_AUTH_GENERIC_OAUTH_API_URL: "${cognito_domain_url}/oauth2/userInfo"
      GF_AUTH_GENERIC_OAUTH_ALLOW_SIGN_UP: "true"
      # Restrict to Admins/Analysts only — viewers don't get into Grafana.
      GF_AUTH_GENERIC_OAUTH_ALLOWED_GROUPS: "SentinelNetAdmins SentinelNetAnalysts"
      GF_AUTH_GENERIC_OAUTH_GROUPS_ATTRIBUTE_PATH: "\"cognito:groups\""
      GF_AUTH_GENERIC_OAUTH_ROLE_ATTRIBUTE_STRICT: "true"
      GF_AUTH_GENERIC_OAUTH_ROLE_ATTRIBUTE_PATH: "contains(\"cognito:groups\", 'SentinelNetAdmins') && 'Admin' || contains(\"cognito:groups\", 'SentinelNetAnalysts') && 'Editor'"
      GF_FEATURE_TOGGLES_ENABLE: ""
      GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS: ""
    volumes:
      - grafana_data:/var/lib/grafana
      - /opt/sentinel/conf/grafana/provisioning:/etc/grafana/provisioning:ro
      - /opt/sentinel/conf/grafana/dashboards:/etc/grafana/dashboards:ro

volumes:
  thehive_data:
  cassandra_data:
  grafana_data:
COMPOSE_EOF

# ── Dashboard API container source ─────────────────────────────────────────────
# Pulled from S3 (uploaded by Terraform via aws_s3_object.dashboard_api_app).
# Inlining the Python source pushed user_data over the 25,600-byte limit, so
# we externalize it. The EC2 IAM role grants s3:GetObject on _artifacts/*.
mkdir -p /opt/sentinel/dashboard_api
cat > /opt/sentinel/dashboard_api/Dockerfile << 'DASH_DF_EOF'
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir flask==3.0.3 pyjwt[crypto]==2.9.0 cryptography==43.0.1
COPY app.py .
EXPOSE 8090
CMD ["python", "-u", "app.py"]
DASH_DF_EOF
aws s3 cp ${dashboard_api_s3_uri} /opt/sentinel/dashboard_api/app.py --region ${aws_region}

# ── Start all services ─────────────────────────────────────────────────────────
cd /opt/sentinel
/usr/local/bin/docker-compose pull --quiet
/usr/local/bin/docker-compose up -d

# ── Initialize OpenSearch security plugin (one-time) ──────────────────────────
# wazuh.indexer ships without the .opendistro_security index; until it's
# bootstrapped, the indexer rejects all auth and the dashboard can't connect.
# Run securityadmin.sh once after the indexer responds; idempotent on re-runs.
for i in $(seq 1 60); do
  if docker exec sentinel-wazuh.indexer-1 curl -sk -o /dev/null -m 3 https://localhost:9200/ 2>/dev/null; then
    break
  fi
  sleep 5
done
docker exec -e OPENSEARCH_JAVA_HOME=/usr/share/wazuh-indexer/jdk sentinel-wazuh.indexer-1 \
  /usr/share/wazuh-indexer/plugins/opensearch-security/tools/securityadmin.sh \
  -cd /usr/share/wazuh-indexer/opensearch-security/ \
  -nhnv \
  -cacert /usr/share/wazuh-indexer/certs/root-ca.pem \
  -cert /usr/share/wazuh-indexer/certs/admin.pem \
  -key /usr/share/wazuh-indexer/certs/admin.key \
  -h localhost 2>&1 | tail -10 || echo "[security-init] failed (will retry on next boot)" >> /var/log/sentinel-bootstrap.log

# ── Reset wazuh-manager API password (one-time, idempotent) ───────────────────
# wazuh-manager's rbac.db creates wazuh-wui with the default password
# "wazuh-wui" on first boot, regardless of API_PASSWORD env. We log in with
# the default, then PUT the desired password. If the password is already
# changed (re-runs), the default login fails and we just skip — that's fine.
(
  for i in $(seq 1 60); do
    code=$(docker exec sentinel-wazuh-1 sh -c 'curl -sk -o /dev/null -w "%%{http_code}" -u wazuh-wui:wazuh-wui -X POST https://wazuh-manager:55000/security/user/authenticate' 2>/dev/null || echo 000)
    if [ "$code" = "200" ]; then
      TOK=$(docker exec sentinel-wazuh-1 sh -c 'curl -sk -u wazuh-wui:wazuh-wui -X POST https://wazuh-manager:55000/security/user/authenticate' \
        | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["token"])')
      docker exec sentinel-wazuh-1 sh -c "curl -sk -X PUT -H 'Authorization: Bearer $TOK' -H 'Content-Type: application/json' 'https://wazuh-manager:55000/security/users/2' -d '{\"password\": \"WazuhSentinel24!\"}'" >/dev/null
      echo "[wazuh-manager] api password reset" >> /var/log/sentinel-bootstrap.log
      break
    fi
    if [ $i -ge 30 ]; then
      # Already changed — that's fine, password is already what we want.
      echo "[wazuh-manager] default password no longer accepted (already reset)" >> /var/log/sentinel-bootstrap.log
      break
    fi
    sleep 5
  done
) &

# ── Wazuh dashboard index patterns (one-time) ────────────────────────────────
# A fresh wazuh.indexer has no saved index-pattern docs in .kibana, which makes
# the wazuh app's home check throw `resp.saved_objects.map of undefined`. We
# create the three standard patterns once after the indexer + dashboard are
# both up. Using basic auth header (the OIDC config disables /auth/login).
(
  for i in $(seq 1 90); do
    code=$(curl -sk -o /dev/null -w '%%{http_code}' http://localhost:5601/wazuh/api/status 2>/dev/null || echo 000)
    [ "$code" = "200" ] || [ "$code" = "401" ] && break
    sleep 5
  done
  for pat in wazuh-alerts wazuh-monitoring wazuh-statistics; do
    FIELDS=$(docker exec sentinel-wazuh-dashboard-1 sh -c "curl -sk -u admin:WazuhSentinel24 'http://localhost:5601/wazuh/api/index_patterns/_fields_for_wildcard?pattern=$pat-*&meta_fields=_source&meta_fields=_id&meta_fields=_type&meta_fields=_index&meta_fields=_score' -H 'osd-xsrf:true'" \
      | python3 -c 'import json,sys; d=json.load(sys.stdin); print(json.dumps(d.get("fields",[])))')
    ESC=$(echo "$FIELDS" | python3 -c 'import json,sys; print(json.dumps(json.dumps(json.load(sys.stdin))))')
    echo "{\"attributes\":{\"title\":\"$pat-*\",\"timeFieldName\":\"timestamp\",\"fields\":$ESC}}" > /tmp/p.json
    docker cp /tmp/p.json sentinel-wazuh-dashboard-1:/tmp/p.json 2>/dev/null
    docker exec sentinel-wazuh-dashboard-1 sh -c "curl -sk -u admin:WazuhSentinel24 -X POST 'http://localhost:5601/wazuh/api/saved_objects/index-pattern/$pat-*?overwrite=true' -H 'osd-xsrf:true' -H 'Content-Type:application/json' --data @/tmp/p.json" >/dev/null
  done
  docker exec sentinel-wazuh-dashboard-1 sh -c "curl -sk -u admin:WazuhSentinel24 -X POST 'http://localhost:5601/wazuh/api/opensearch-dashboards/settings/defaultIndex' -H 'osd-xsrf:true' -H 'Content-Type:application/json' -d '{\"value\":\"wazuh-alerts-*\"}'" >/dev/null
  echo "[wazuh-dashboard] index patterns created" >> /var/log/sentinel-bootstrap.log
) &

# ── Bootstrap dashboard-api after TheHive is reachable ────────────────────────
# Runs in the background so the rest of cloud-init completes promptly. Waits
# for TheHive's login endpoint, generates an API key for admin@thehive.local,
# writes a compose override with the necessary env vars, and brings up the
# dashboard-api container. Port 8090 is exposed on the EC2 primary interface
# so the ALB can reach it (SG restricts ingress to the ALB's SG only).
(
  # 180 × 5s = 15 min. TheHive can take 5–10 min on a cold boot (Cassandra
  # warmup + janusgraph schema migration) — give it generous headroom so a
  # slow boot doesn't strand dashboard-api.
  for i in $(seq 1 180); do
    code=$(curl -sk -o /dev/null -w '%%{http_code}' -X POST http://localhost:9000/thehive/api/login \
      -H 'Content-Type: application/json' \
      -d '{"user":"admin@thehive.local","password":"secret"}' 2>/dev/null || echo 000)
    if [ "$code" = "200" ]; then break; fi
    sleep 5
  done

  rm -f /tmp/th.cookie
  curl -sk -c /tmp/th.cookie -X POST http://localhost:9000/thehive/api/login \
    -H 'Content-Type: application/json' \
    -d '{"user":"admin@thehive.local","password":"secret"}' >/dev/null
  TH_KEY=$(curl -sk -b /tmp/th.cookie -X POST 'http://localhost:9000/thehive/api/v1/user/admin@thehive.local/key/renew')

  if [ -n "$TH_KEY" ] && [ "$${#TH_KEY}" -ge 16 ]; then
    echo "$TH_KEY" > /opt/sentinel/.dashboard_api_thehive_key
    chmod 600 /opt/sentinel/.dashboard_api_thehive_key

    # Create the default organisation that OIDC-authenticated users land in
    # (matches auth.sso.defaultOrganisation in thehive.conf). 201 on success,
    # 400 if it already exists — both are fine.
    curl -sk -X POST 'http://localhost:9000/thehive/api/v1/organisation' \
      -H "Authorization: Bearer $TH_KEY" \
      -H 'Content-Type: application/json' \
      -d '{"name":"SentinelNet","description":"Default org for Cognito SSO users"}' >/dev/null || true

    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

    cat > /opt/sentinel/docker-compose.dashapi.yml << DASH_OVERRIDE_EOF
services:
  dashboard-api:
    build: /opt/sentinel/dashboard_api
    image: sentinel-dashboard-api:latest
    hostname: dashboard-api
    restart: unless-stopped
    depends_on:
      - thehive
    ports:
      - "8090:8090"
    environment:
      COGNITO_REGION: ${aws_region}
      COGNITO_USER_POOL_ID: ${cognito_user_pool_id}
      COGNITO_CLIENT_ID: ${cognito_web_client_id}
      ALLOWED_GROUPS: ${admin_group_name},${analyst_group_name},${viewer_group_name}
      INDEXER_URL: https://wazuh.indexer:9200
      INDEXER_USER: admin
      INDEXER_PASS: WazuhSentinel24
      THEHIVE_URL: http://thehive:9000
      THEHIVE_API_KEY: $TH_KEY
      WAZUH_MANAGER_URL: https://wazuh-manager:55000
      WAZUH_MANAGER_USER: wazuh-wui
      WAZUH_MANAGER_PASS: WazuhSentinel24!
      GRAFANA_URL: http://grafana:3000
      WAZUH_DASHBOARD_URL: http://wazuh-dashboard:5601
      ELASTICSEARCH_URL: http://elasticsearch:9200
      MANAGER_PUBLIC_IP: $PUBLIC_IP
DASH_OVERRIDE_EOF

    cd /opt/sentinel && /usr/local/bin/docker-compose \
      -f docker-compose.yml \
      -f docker-compose.dashapi.yml \
      up -d --build dashboard-api
    echo "[dashboard-api] bootstrap complete" >> /var/log/sentinel-bootstrap.log
  else
    echo "[dashboard-api] FAILED: could not get TheHive API key" >> /var/log/sentinel-bootstrap.log
  fi
) &

# ── Wazuh → SQS forwarder ─────────────────────────────────────────────────────
# Tails alerts.json and sends each alert as a message to SQS.
# The Lambda function (wazuh_ingest) reads SQS and writes to the S3 data lake.
pip3 install boto3 --quiet

cat > /usr/local/bin/wazuh_to_sqs.py << 'PY_EOF'
#!/usr/bin/env python3
"""Wazuh alerts.json -> SQS forwarder. Runs as a systemd service."""
import json
import os
import time
import boto3
from botocore.exceptions import ClientError

REGION = os.environ.get('AWS_REGION', 'us-east-1')
QUEUE_URL = os.environ['QUEUE_URL']
ALERTS_PATH = '/opt/sentinel/data/wazuh_logs/alerts/alerts.json'

sqs = boto3.client('sqs', region_name=REGION)

def send(alert_json: str):
    try:
        sqs.send_message(QueueUrl=QUEUE_URL, MessageBody=alert_json)
    except ClientError as exc:
        print(f'[wazuh_to_sqs] SQS error: {exc}')

def tail():
    print(f'[wazuh_to_sqs] waiting for {ALERTS_PATH}')
    while not os.path.exists(ALERTS_PATH):
        time.sleep(5)
    print('[wazuh_to_sqs] file found, starting tail')
    with open(ALERTS_PATH, 'r') as fh:
        fh.seek(0, 2)  # jump to end — skip historical alerts
        while True:
            line = fh.readline()
            if not line:
                time.sleep(0.5)
                continue
            line = line.strip()
            if not line:
                continue
            try:
                json.loads(line)  # validate JSON before sending
                send(line)
            except json.JSONDecodeError:
                pass  # partial write, skip

if __name__ == '__main__':
    tail()
PY_EOF

chmod +x /usr/local/bin/wazuh_to_sqs.py

cat > /etc/systemd/system/wazuh-forwarder.service << SERVICE_EOF
[Unit]
Description=Wazuh -> SQS Alert Forwarder
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=simple
Environment=QUEUE_URL=${sqs_queue_url}
Environment=AWS_REGION=${aws_region}
ExecStart=/usr/bin/python3 /usr/local/bin/wazuh_to_sqs.py
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
SERVICE_EOF

systemctl enable wazuh-forwarder
systemctl start wazuh-forwarder

# ── CloudWatch log aggregation ─────────────────────────────────────────────────
touch /var/log/sentinel_errors.log
chmod 666 /var/log/sentinel_errors.log

cat > /usr/local/bin/sentinel_log_filter.sh << 'FILTER_EOF'
#!/bin/bash
# Aggregate ERROR/CRITICAL lines from all sources into one log for CloudWatch
journalctl -f -u docker 2>/dev/null | \
  grep --line-buffered -Ei 'error|critical|fail' >> /var/log/sentinel_errors.log &
tail -F /opt/sentinel/data/wazuh_logs/alerts/alerts.json 2>/dev/null | \
  grep --line-buffered '"level":1[2-9]' >> /var/log/sentinel_errors.log &
wait
FILTER_EOF
chmod +x /usr/local/bin/sentinel_log_filter.sh

cat > /etc/systemd/system/sentinel-log-filter.service << SERVICE_EOF
[Unit]
Description=SentinelNet Log Error Filter
After=docker.service

[Service]
Type=simple
ExecStart=/bin/bash /usr/local/bin/sentinel_log_filter.sh
Restart=always
User=root

[Install]
WantedBy=multi-user.target
SERVICE_EOF

systemctl enable sentinel-log-filter
systemctl start sentinel-log-filter

cat > /opt/aws/amazon-cloudwatch-agent/bin/config.json << 'CW_EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/sentinel_errors.log",
            "log_group_name": "/sentinelnet/soc/errors",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 7
          }
        ]
      }
    }
  }
}
CW_EOF

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json -s

echo "[sentinel-bootstrap] Bootstrap complete at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
