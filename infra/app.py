#!/usr/bin/env python3
"""
SentinelNet — CDK app: Network, UserData, Website, Backend.

Deploy order: Network -> UserData -> Website (--exclusively) -> Backend.
Backend does not deploy Network; it depends on Network (VPC + private subnets).
Use infra/deploy-all.sh to deploy all, or infra/fix-network-export-conflict.sh
if Network fails with "export in use by SentinelNet-Backend".


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

user_data_stack = UserDataStack(app, "SentinelNet-UserData", env=env)
website_stack = WebsiteStack(app, "SentinelNet-Website", env=env, user_data_stack=user_data_stack)
network_stack = NetworkStack(app, "SentinelNet-Network", env=env)
backend_stack = BackendStack(
    app,
    "SentinelNet-Backend",
    env=env,
    vpc=network_stack.vpc,
    private_subnet_ids=network_stack.private_subnet_ids,
    internal_subnet_ids=network_stack.internal_subnet_ids,
    public_subnet_ids=network_stack.public_subnet_ids,
)

# --- Cost Allocation Tags ---
cdk.Tags.of(app).add("Project", "SentinelNet")
cdk.Tags.of(app).add("Environment", "Dev")
cdk.Tags.of(app).add("Tenant", "Shared")

cdk.Tags.of(website_stack).add("Service", "Frontend")
cdk.Tags.of(backend_stack).add("Service", "Backend")
cdk.Tags.of(user_data_stack).add("Service", "Backend")
cdk.Tags.of(network_stack).add("Service", "Infra")

app.synth()
