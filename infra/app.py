#!/usr/bin/env python3
"""
SentinelNet - CDK app.

Deploy order: Network -> UserData -> Website (--exclusively) -> Backend.
Cognito lives in UserData so both Website and Backend can reference it.
"""

import os
import aws_cdk as cdk

from stacks.website_stack import WebsiteStack
from stacks.user_data_stack import UserDataStack
from stacks.network_stack import NetworkStack
from stacks.backend_stack import BackendStack

app = cdk.App()

env = cdk.Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION"),
)

# 1. Network - VPC
network_stack = NetworkStack(app, "SentinelNet-Network", env=env)

# 2. User data - DynamoDB + S3 + Cognito (shared)
user_data_stack = UserDataStack(app, "SentinelNet-UserData", env=env)

# 3. Website - S3 + CloudFront + Cognito client
website_stack = WebsiteStack(
    app, "SentinelNet-Website", env=env, user_data_stack=user_data_stack
)

# 4. Backend - EC2 + ALB + Cognito auth + alert pipeline
backend_stack = BackendStack(
    app,
    "SentinelNet-Backend",
    env=env,
    vpc=network_stack.vpc,
    user_pool=user_data_stack.user_pool,
    user_pool_domain=user_data_stack.user_pool_domain,
)

app.synth()
