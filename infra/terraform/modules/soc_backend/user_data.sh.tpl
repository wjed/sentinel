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
mkdir -p /opt/sentinel/data/{elasticsearch,wazuh_data,wazuh_etc,wazuh_logs/alerts}
mkdir -p /opt/sentinel/conf/grafana/provisioning/{datasources,dashboards}
mkdir -p /opt/sentinel/conf/grafana/dashboards

# Elasticsearch writes as UID 1000 inside the container
chown -R 1000:1000 /opt/sentinel/data/elasticsearch
# Wazuh writes alerts as root inside the container
chmod 777 /opt/sentinel/data/wazuh_logs/alerts

# ── TheHive configuration ──────────────────────────────────────────────────────
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

auth.multi = true
auth.methods {
  oidc {
    name = "SentinelNet"
    clientId = "${soc_client_id}"
    clientSecret = "${soc_client_secret}"
    redirectUri = "${site_url}/thehive/"
    responseType = "code"
    scope = ["openid", "email", "profile"]
    authorizationUrl = "${cognito_domain_url}/oauth2/authorize"
    tokenUrl = "${cognito_domain_url}/oauth2/token"
    userinfoUrl = "${cognito_domain_url}/oauth2/userInfo"
    userIdField = "email"
  }
}
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
      timeField: "timestamp"
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
        "bucketAggs": [],
        "timeField": "timestamp"
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
        "bucketAggs": [],
        "timeField": "timestamp"
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
        "bucketAggs": [],
        "timeField": "timestamp"
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
        "bucketAggs": [],
        "timeField": "timestamp"
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
          "bucketAggs": [{"type": "date_histogram", "field": "timestamp", "id": "2",
            "settings": {"interval": "auto", "min_doc_count": "0", "trimEdges": "0"}}],
          "timeField": "timestamp"
        },
        {
          "refId": "B",
          "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
          "query": "rule.level:[7 TO *]",
          "alias": "High+Critical",
          "metrics": [{"type": "count", "id": "1"}],
          "bucketAggs": [{"type": "date_histogram", "field": "timestamp", "id": "2",
            "settings": {"interval": "auto", "min_doc_count": "0", "trimEdges": "0"}}],
          "timeField": "timestamp"
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
        "timeField": "timestamp"
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
        "timeField": "timestamp"
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
        "timeField": "timestamp"
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
          "bucketAggs": [],
          "timeField": "timestamp"
        },
        {
          "refId": "B",
          "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
          "query": "rule.level:[4 TO 6]",
          "alias": "Medium (4-6)",
          "metrics": [{"type": "count", "id": "1"}],
          "bucketAggs": [],
          "timeField": "timestamp"
        },
        {
          "refId": "C",
          "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
          "query": "rule.level:[7 TO 11]",
          "alias": "High (7-11)",
          "metrics": [{"type": "count", "id": "1"}],
          "bucketAggs": [],
          "timeField": "timestamp"
        },
        {
          "refId": "D",
          "datasource": {"type": "elasticsearch", "uid": "wazuh-es"},
          "query": "rule.level:[12 TO *]",
          "alias": "Critical (12+)",
          "metrics": [{"type": "count", "id": "1"}],
          "bucketAggs": [],
          "timeField": "timestamp"
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
        "bucketAggs": [],
        "timeField": "timestamp"
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
  # Alerts are written to /var/ossec/logs/alerts/alerts.json as newline-JSON.
  wazuh:
    image: wazuh/wazuh-manager:4.9.2
    hostname: wazuh-manager
    restart: unless-stopped
    ports:
      - "1514:1514/tcp"
      - "1514:1514/udp"
      - "1515:1515/tcp"
      - "55000:55000/tcp"
    volumes:
      - /opt/sentinel/data/wazuh_data:/var/ossec/data
      - /opt/sentinel/data/wazuh_etc:/var/ossec/etc
      - /opt/sentinel/data/wazuh_logs:/var/ossec/logs

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
      GF_AUTH_GENERIC_OAUTH_ENABLED: "true"
      GF_AUTH_GENERIC_OAUTH_NAME: "SentinelNet"
      GF_AUTH_GENERIC_OAUTH_CLIENT_ID: "${soc_client_id}"
      GF_AUTH_GENERIC_OAUTH_CLIENT_SECRET: "${soc_client_secret}"
      GF_AUTH_GENERIC_OAUTH_SCOPES: "openid email profile"
      GF_AUTH_GENERIC_OAUTH_AUTH_URL: "${cognito_domain_url}/oauth2/authorize"
      GF_AUTH_GENERIC_OAUTH_TOKEN_URL: "${cognito_domain_url}/oauth2/token"
      GF_AUTH_GENERIC_OAUTH_API_URL: "${cognito_domain_url}/oauth2/userInfo"
      GF_AUTH_GENERIC_OAUTH_ALLOW_SIGN_UP: "true"
      GF_AUTH_GENERIC_OAUTH_ROLE_ATTRIBUTE_PATH: "contains(\"cognito:groups\", 'SentinelNetAdmins') && 'Admin' || contains(\"cognito:groups\", 'SentinelNetAnalysts') && 'Editor' || 'Viewer'"
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

# ── Start all services ─────────────────────────────────────────────────────────
cd /opt/sentinel
/usr/local/bin/docker-compose pull --quiet
/usr/local/bin/docker-compose up -d

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
