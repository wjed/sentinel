"""
SentinelNet shared module.

Common constants and reusable constructs used across stacks.
No AWS resources are created here in the scaffolding phase.
"""

from shared.constants import (
    APP_NAME,
    STACK_PREFIX,
)

__all__ = [
    "APP_NAME",
    "STACK_PREFIX",
]
