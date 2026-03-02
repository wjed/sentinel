#!/usr/bin/env python3
"""
SentinelNet - stacks: website, user data, network, backend.

Deploy:
  cdk deploy SentinelNet-Website
  cdk deploy SentinelNet-UserData
  cdk deploy SentinelNet-Network
  cdk deploy SentinelNet-Backend

Use AWS credentials via env or aws configure.
"""

import os

import aws_cdk as cdk

from stacks.backend_stack import BackendStack
from stacks.network_stack import NetworkStack
from stacks.user_data_stack import UserDataStack
from stacks.website_stack import WebsiteStack

app = cdk.App()

env = cdk.Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION"),
)

user_data_stack = UserDataStack(app, "SentinelNet-UserData", env=env)
WebsiteStack(app, "SentinelNet-Website", env=env, user_data_stack=user_data_stack)

network_stack = NetworkStack(app, "SentinelNet-Network", env=env)
backend_stack = BackendStack(
    app,
    "SentinelNet-Backend",
    env=env,
    vpc=network_stack.vpc,
    private_subnet_ids=network_stack.private_subnet_ids,
    internal_subnet_ids=network_stack.internal_subnet_ids,
)
backend_stack.add_dependency(network_stack)

app.synth()
