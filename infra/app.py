#!/usr/bin/env python3
"""
SentinelNet — stacks: website, user data, network (VPC).

Deploy:
  cdk deploy SentinelNet-Website
  cdk deploy SentinelNet-UserData
  cdk deploy SentinelNet-Network   # VPC for center/backend team

Use AWS credentials via env or aws configure.
"""

import os
import aws_cdk as cdk

from stacks.website_stack import WebsiteStack
from stacks.user_data_stack import UserDataStack
from stacks.network_stack import NetworkStack

app = cdk.App()

env = cdk.Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION"),
)

user_data_stack = UserDataStack(app, "SentinelNet-UserData", env=env)
WebsiteStack(app, "SentinelNet-Website", env=env, user_data_stack=user_data_stack)
NetworkStack(app, "SentinelNet-Network", env=env)

app.synth()
