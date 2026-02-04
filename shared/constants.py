"""
Shared constants for SentinelNet CDK stacks.

Use these for consistent naming and configuration across stacks.
No account IDs, regions, or environment-specific values are included.
"""

# Application identity
APP_NAME = "SentinelNet"
STACK_PREFIX = "SentinelNet"

# Stack IDs (used in app.py) — for reference only
STACK_IDS = {
    "network": f"{STACK_PREFIX}-Network",
    "identity": f"{STACK_PREFIX}-Identity",
    "data": f"{STACK_PREFIX}-Data",
    "backend": f"{STACK_PREFIX}-Backend",
}
