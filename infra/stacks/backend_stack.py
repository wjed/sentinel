"""
Backend Stack — SentinelNet (backend team ownership).

High-level purpose
------------------
This CDK stack is where the **backend team** defines AWS resources that
support the SentinelNet backend: data stores, APIs, queues, Lambdas, etc.

The center/infra team owns the lower-level networking (VPC, subnets,
security groups) in their own stacks. The backend team plugs into that
infrastructure by defining higher-level application resources here.

Current responsibility
----------------------
Right now this stack focuses on a **single responsibility**:

    Define a multi-tenant DynamoDB table that will store Wazuh logs
    (and related SOC events) in a way that is:
        - safe-by-default for multiple tenants
        - flexible for future log formats
        - cheap to run during prototyping

Nothing is actually created in AWS until someone runs ``cdk deploy``.
Running ``cdk synth`` is safe and free; it only generates a template
locally so we can review what this stack would create.
"""

from aws_cdk import (
    Stack,
    aws_dynamodb as dynamodb,
)
from constructs import Construct


class BackendStack(Stack):
    """
    Backend/API layer resources (owned by the backend team).

    Over time this stack will grow to include backend-facing resources like:

    - Lambda functions that process Wazuh events
    - API Gateway / HTTP APIs that expose data to the frontend
    - Queues or streams that connect ingestion → triage → notification

    To keep responsibilities clear, the **first artifact** we define here
    is the ``wazuh_logs`` DynamoDB table. Other backend components will
    be wired to read/write this table as the project evolves.
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        """
        Initialise the Backend stack.

        Parameters
        ----------
        scope:
            CDK construct scope (provided by the root app).
        construct_id:
            Logical identifier for this stack within the app.
        **kwargs:
            Additional Stack configuration (env, tags, etc.).
        """
        super().__init__(scope, construct_id, **kwargs)

        # ------------------------------------------------------------------
        # Multi-tenant DynamoDB event store for Wazuh logs
        # ------------------------------------------------------------------
        #
        # Table name
        #   wazuh_logs
        #
        # Key design
        #   - partition_key: tenant_id  (string)
        #       Groups all events for a single customer / tenant together.
        #
        #   - sort_key: event_time_event_id (string)
        #       Combines an ISO8601 timestamp with a UUID, for example:
        #           "2026-02-23T19:14:22Z#550e8400-e29b-41d4-a716-446655440000"
        #
        #       This makes it easy to query:
        #         - "all events for tenant X in a time range"
        #         - "latest events for tenant X"
        #
        # Billing mode
        #   PAY_PER_REQUEST (on-demand) so we do not need to guess
        #   read/write capacity up front. This is ideal for a student
        #   project and early-stage experimentation; it avoids cost
        #   surprises when traffic is low or bursty.
        #
        # Data model (stored attributes)
        #   At minimum we expect to store:
        #     - tenant_id               (PK)
        #     - event_time_event_id     (SK)
        #     - event_time              (ISO8601 string)
        #     - event_id                (UUID or Wazuh id)
        #     - agent_id / agent_name   (from Wazuh agent)
        #     - rule_id / rule_level    (from Wazuh detection rule)
        #     - source                  ("wazuh", "cowrie", "openvas", ...)
        #     - wazuh_event             (raw JSON payload, where size allows)
        #
        #   DynamoDB is schemaless at the attribute level, so individual
        #   ingestion components can add more fields over time without
        #   needing to change this table definition.
        #
        # NOTE: This definition is *only* the logical table; permissions,
        # Lambda functions, and API routes that use it will be added later.
        #
        self.wazuh_logs_table = dynamodb.Table(
            self,
            "WazuhLogsTable",
            table_name="wazuh_logs",
            partition_key=dynamodb.Attribute(
                name="tenant_id",
                type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="event_time_event_id",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
        )
