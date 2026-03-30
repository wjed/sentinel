#!/usr/bin/env python3
"""
SentinelNet - CDK app: Network, UserData, Website, Backend.

Deploy order: Network -> UserData -> Website (--exclusively) -> Backend.
Backend does not deploy Network; it depends on Network (VPC + private subnets).
Use infra/deploy-all.sh to deploy all, or infra/fix-network-export-conflict.sh
if Network fails with "export in use by SentinelNet-Backend".

AppRegistry support is configurable:
- default: create/manage an application named "SentinelNet"
- set SENTINEL_EXISTING_APPREGISTRY_APPLICATION to reuse an existing app by name or ID
- set SENTINEL_APPREGISTRY_ENABLED=false to disable AppRegistry entirely
"""

import os

import aws_cdk as cdk
from aws_cdk import aws_servicecatalogappregistry as appregistry

from stacks.backend_stack import BackendStack
from stacks.network_stack import NetworkStack
from stacks.user_data_stack import UserDataStack
from stacks.website_stack import WebsiteStack


def env_or_context(app: cdk.App, context_key: str, env_key: str, default: str) -> str:
    value = app.node.try_get_context(context_key)
    if value is not None:
        return str(value).strip()
    return os.environ.get(env_key, default).strip()


app = cdk.App()

env = cdk.Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION"),
)

user_data_stack = UserDataStack(app, "SentinelNet-UserData", env=env)
website_stack = WebsiteStack(
    app,
    "SentinelNet-Website",
    env=env,
    user_data_stack=user_data_stack,
)
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

appregistry_enabled = (
    env_or_context(
        app,
        context_key="appregistryEnabled",
        env_key="SENTINEL_APPREGISTRY_ENABLED",
        default="true",
    ).lower()
    not in {"0", "false", "no", "off"}
)
appregistry_name = env_or_context(
    app,
    context_key="appregistryName",
    env_key="SENTINEL_APPREGISTRY_NAME",
    default="SentinelNet",
)
existing_appregistry_application = env_or_context(
    app,
    context_key="existingAppRegistryApplication",
    env_key="SENTINEL_EXISTING_APPREGISTRY_APPLICATION",
    default="",
)

if appregistry_enabled:
    appregistry_dependency_stack: cdk.Stack | None = None
    appregistry_identifier = existing_appregistry_application or appregistry_name

    if not existing_appregistry_application:
        appregistry_dependency_stack = cdk.Stack(
            app,
            "SentinelNet-AppRegistry",
            env=env,
        )
        appregistry.CfnApplication(
            appregistry_dependency_stack,
            "SentinelNetApplication",
            name=appregistry_name,
            description="SentinelNet Security Platform - network monitoring and SIEM",
        )

    for stack in [network_stack, user_data_stack, website_stack, backend_stack]:
        if appregistry_dependency_stack is not None:
            stack.add_dependency(appregistry_dependency_stack)
        appregistry.CfnResourceAssociation(
            stack,
            "AppRegistryAssociation",
            application=appregistry_identifier,
            resource_type="CFN_STACK",
            resource=stack.stack_name,
        )

app.synth()
