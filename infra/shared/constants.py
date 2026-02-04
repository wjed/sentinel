"""
Shared constants for SentinelNet CDK stacks.
No account IDs, regions, or environment-specific values.
"""

APP_NAME = "SentinelNet"
STACK_PREFIX = "SentinelNet"

STACK_IDS = {
    "network": f"{STACK_PREFIX}-Network",
    "identity": f"{STACK_PREFIX}-Identity",
    "data": f"{STACK_PREFIX}-Data",
    "backend": f"{STACK_PREFIX}-Backend",
}
