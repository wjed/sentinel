#!/usr/bin/env python3
"""
SentinelNet — CDK app: Network, UserData, Website, Backend.

Deploy order: Network -> UserData -> Website (--exclusively) -> Backend.
Backend does not deploy Network; it depends on Network (VPC + private subnets).
Use infra/deploy-all.sh to deploy all, or infra/fix-network-export-conflict.sh
if Network fails with "export in use by SentinelNet-Backend".

All stacks are registered under the "SentinelNet" AWS AppRegistry Application,
visible in AWS Console -> Systems Manager -> Application Manager.
"""

import os
import aws_cdk as cdk
from aws_cdk import aws_servicecatalogappregistry as appregistry

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

# --- AWS AppRegistry Application ---
# CfnApplication is a CFn L1 resource and must live inside a Stack.
# We use a small dedicated stack so the other stacks stay clean.
appregistry_stack = cdk.Stack(app, "SentinelNet-AppRegistry", env=env)
sentinel_cfn_app = appregistry.CfnApplication(
    appregistry_stack,
    "SentinelNetApplication",
    name="SentinelNet",
    description="SentinelNet Security Platform - network monitoring and SIEM",
)

# Associate each member stack with the application.
# CfnResourceAssociation is placed inside each member stack and references
# the AppRegistry application by its logical name (plain string — no circular dep).
_app_registry_stack_name = "SentinelNet-AppRegistry"
for _stack in [network_stack, user_data_stack, website_stack, backend_stack]:
    appregistry.CfnResourceAssociation(
        _stack,
        "AppRegistryAssociation",
        application=_app_registry_stack_name,
        resource_type="CFN_STACK",
        resource=_stack.stack_name,
    )

app.synth()
