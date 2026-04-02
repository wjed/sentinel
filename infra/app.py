#!/usr/bin/env python3
"""
SentinelNet — CDK app: Network, UserData, Website, Backend.

Deploy order: Network -> UserData -> Website (--exclusively) -> Backend.
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

# 1. Network — VPC (everything else depends on this)
network_stack = NetworkStack(app, "SentinelNet-Network", env=env)

# 2. User data — DynamoDB profiles + S3 profile pics
user_data_stack = UserDataStack(app, "SentinelNet-UserData", env=env)

# 3. Website — S3 + CloudFront + Cognito
website_stack = WebsiteStack(
    app, "SentinelNet-Website", env=env, user_data_stack=user_data_stack
)

# 4. Backend — ECS Cluster + base SG (lightweight POC)
backend_stack = BackendStack(
    app,
    "SentinelNet-Backend",
    env=env,
    vpc=network_stack.vpc,
)

app.synth()
