#!/usr/bin/env python3
"""
SentinelNet - CDK Application Entry Point.
"""

import os
import aws_cdk as cdk

from stacks.network_stack import NetworkStack
from stacks.identity_stack import IdentityStack
from stacks.data_stack import DataStack
from stacks.backend_stack import BackendStack
from stacks.website_stack import WebsiteStack
from stacks.cost_tag_stack import CostTagStack  # Import your tagging stack

app = cdk.App()

env = cdk.Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION"),
)

# 1. Apply GLOBAL Tags to the entire App (Project-wide)
# This ensures even if you forget to tag a specific stack, it's still labeled SentinelNet.
CostTagStack(app, "SentinelNet-GlobalTags")

# 2. Instantiate Stacks
network = NetworkStack(app, "SentinelNet-Network", env=env)
identity = IdentityStack(app, "SentinelNet-Identity", env=env)
data = DataStack(app, "SentinelNet-Data", env=env)
backend = BackendStack(app, "SentinelNet-Backend", env=env)
website = WebsiteStack(app, "SentinelNet-Website", env=env)

# 3. Apply SPECIFIC Tier Tags
# Tagging our internal infrastructure and data layer
CostTagStack.tag_internal_resources(network)
CostTagStack.tag_internal_resources(data)
CostTagStack.tag_internal_resources(backend)

# Tagging our public-facing website
CostTagStack.tag_public_resources(website)

app.synth()