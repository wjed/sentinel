"""
SentinelNet CDK Stacks.

This package contains placeholder stack classes for:
- NetworkStack   — networking and connectivity
- IdentityStack  — IAM and authentication
- DataStack      — data ingestion and storage
- BackendStack   — compute and API

All stacks are intentionally empty (no AWS resources) in this scaffolding.
"""

from stacks.network_stack import NetworkStack
from stacks.identity_stack import IdentityStack
from stacks.data_stack import DataStack
from stacks.backend_stack import BackendStack

__all__ = [
    "NetworkStack",
    "IdentityStack",
    "DataStack",
    "BackendStack",
]
