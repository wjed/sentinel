#!/usr/bin/env python3
"""
SentinelNet - CDK Application Entry Point (Scaffolding Only).

This file defines the CDK app and instantiates placeholder stacks.
NO DEPLOYMENT CONFIGURATION IS INCLUDED.
The stacks are intentionally empty and define no AWS resources.

Use this repository to understand structure and collaborate;
do not run `cdk deploy` — no stacks are configured for deployment.
"""

import aws_cdk as cdk

from stacks.network_stack import NetworkStack
from stacks.identity_stack import IdentityStack
from stacks.data_stack import DataStack
from stacks.backend_stack import BackendStack

app = cdk.App()

# ---------------------------------------------------------------------------
# Placeholder stacks — intentionally empty, no resources defined.
# Each stack is owned by a team and will be implemented in later phases.
# ---------------------------------------------------------------------------

NetworkStack(app, "SentinelNet-Network")
IdentityStack(app, "SentinelNet-Identity")
DataStack(app, "SentinelNet-Data")
BackendStack(app, "SentinelNet-Backend")

# No environment, account, or region is set — this app is not meant to deploy.
app.synth()
