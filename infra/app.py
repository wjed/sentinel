#!/usr/bin/env python3
"""
SentinelNet — one stack: website on CloudFront.

Deploy with: cdk deploy SentinelNet-Website
Use AWS credentials via env or aws configure.
"""

import os
import aws_cdk as cdk

from stacks.website_stack import WebsiteStack

app = cdk.App()

env = cdk.Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION"),
)

WebsiteStack(app, "SentinelNet-Website", env=env)

app.synth()
