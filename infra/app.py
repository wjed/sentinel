#!/usr/bin/env python3
"""
SentinelNet - CDK Application Entry Point.

Defines all stacks. The website stack (S3 + CloudFront) is deployable;
other stacks are placeholders. Use AWS credentials via env or aws configure.
"""

import os
import aws_cdk as cdk

from stacks.network_stack import NetworkStack
from stacks.identity_stack import IdentityStack
from stacks.data_stack import DataStack
from stacks.backend_stack import BackendStack
# NOTE: WebsiteStack is intentionally not imported while the backend team
# is iterating on infrastructure that does not depend on the built
# frontend assets (frontend/dist). Re-enable this import when the
# website deployment flow is ready again.
# from stacks.website_stack import WebsiteStack

app = cdk.App()

# Use default account/region from environment (e.g. AWS_PROFILE or AWS_ACCESS_KEY_ID)
env = cdk.Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION"),
)

# Placeholder stacks (empty)
NetworkStack(app, "SentinelNet-Network", env=env)
IdentityStack(app, "SentinelNet-Identity", env=env)
DataStack(app, "SentinelNet-Data", env=env)
BackendStack(app, "SentinelNet-Backend", env=env)

# Deployable: S3 + CloudFront for the frontend. Deploy with: cdk deploy SentinelNet-Website
# WebsiteStack(app, "SentinelNet-Website", env=env)

app.synth()
