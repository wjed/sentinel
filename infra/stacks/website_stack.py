"""
Website Stack - S3 + CloudFront + Cognito client for SentinelNet.

Uses the Cognito user pool from UserDataStack (no circular deps).
Deploy with: cdk deploy SentinelNet-Website --exclusively
"""

import json
import os
from pathlib import Path
from typing import Optional

from aws_cdk import CfnOutput, RemovalPolicy, Stack, Tags
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_s3_deployment as s3_deploy
from aws_cdk import aws_cloudfront as cloudfront
from aws_cdk.aws_cloudfront_origins import S3BucketOrigin
from aws_cdk import aws_cognito as cognito
from aws_cdk import aws_lambda as lambda_
from aws_cdk import aws_apigatewayv2 as apigwv2
from aws_cdk.aws_apigatewayv2_integrations import HttpLambdaIntegration
from aws_cdk.aws_apigatewayv2_authorizers import HttpJwtAuthorizer
from constructs import Construct

if False:
    from .backend_stack import BackendStack


class WebsiteStack(Stack):
    """S3 + CloudFront + Cognito app client. Profile API when user_data_stack provided."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        user_data_stack: Stack,
        backend_stack: Stack,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        Tags.of(self).add("Project", "SentinelNet")

        repo_root = Path(__file__).resolve().parents[2]
        frontend_dist = str(repo_root / "frontend" / "dist")
        profile_lambda_dir = str(repo_root / "infra" / "lambda" / "profile_api_py")

        # Pull Cognito from UserDataStack
        user_pool = user_data_stack.user_pool

        # ── S3 bucket ─────────────────────────────────────────────────────────
        bucket = s3.Bucket(
            self, "WebsiteBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

        # ── CloudFront ────────────────────────────────────────────────────────
        spa_rewrite = cloudfront.Function(
            self, "SpaRewrite",
            code=cloudfront.FunctionCode.from_inline(
                "function handler(event) {"
                "  var r = event.request;"
                "  if (r.uri.endsWith('/')) r.uri += 'index.html';"
                "  else if (!r.uri.includes('.') && r.uri.indexOf('/assets/') !== 0)"
                "    r.uri = '/index.html';"
                "  return r;"
                "}"
            ),
            runtime=cloudfront.FunctionRuntime.JS_2_0,
        )

        self.distribution = cloudfront.Distribution(
            self, "Distribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=S3BucketOrigin.with_origin_access_control(bucket),
                function_associations=[
                    cloudfront.FunctionAssociation(
                        function=spa_rewrite,
                        event_type=cloudfront.FunctionEventType.VIEWER_REQUEST,
                    )
                ],
            ),
            default_root_object="index.html",
        )

        website_url = f"https://{self.distribution.distribution_domain_name}"
        callback_url = f"{website_url}/"
        region = self.region

        # ── Cognito app client (for website) ──────────────────────────────────
        # Use L1 CfnUserPoolClient to avoid cross-stack circular dependency.
        # user_pool.add_client() would create a ref from UserData -> Website.
        self._web_client_cfn = cognito.CfnUserPoolClient(
            self, "WebClient",
            user_pool_id=user_pool.user_pool_id,
            explicit_auth_flows=["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
            generate_secret=False,
            allowed_o_auth_flows=["code"],
            allowed_o_auth_flows_user_pool_client=True,
            allowed_o_auth_scopes=["openid", "email"],
            callback_ur_ls=[callback_url, "http://localhost:5173/", "http://localhost:3000/"],
            logout_ur_ls=[callback_url, "http://localhost:5173/", "http://localhost:3000/"],
            supported_identity_providers=["COGNITO"],
        )
        web_client_id = self._web_client_cfn.ref

        cognito_domain_url = f"https://sentinelnet.auth.{region}.amazoncognito.com"

        # ── Profile API (optional) ────────────────────────────────────────────
        api_base_url = None
        if hasattr(user_data_stack, "profiles_table"):
            profile_fn = lambda_.Function(
                self, "ProfileApi",
                runtime=lambda_.Runtime.PYTHON_3_12,
                handler="handler.handler",
                code=lambda_.Code.from_asset(profile_lambda_dir),
                environment={"TABLE_NAME": user_data_stack.profiles_table.table_name},
            )
            user_data_stack.profiles_table.grant_read_write_data(profile_fn)

            issuer = f"https://cognito-idp.{region}.amazonaws.com/{user_pool.user_pool_id}"
            http_api = apigwv2.HttpApi(
                self, "ProfileHttpApi",
                cors_preflight=apigwv2.CorsPreflightOptions(
                    allow_origins=["*"],
                    allow_methods=[
                        apigwv2.CorsHttpMethod.GET,
                        apigwv2.CorsHttpMethod.PATCH,
                        apigwv2.CorsHttpMethod.OPTIONS,
                    ],
                    allow_headers=["Authorization", "Content-Type"],
                ),
                default_authorizer=HttpJwtAuthorizer(
                    "CognitoAuth", issuer,
                    jwt_audience=[web_client_id],
                ),
            )
            http_api.add_routes(
                path="/profile",
                methods=[apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH],
                integration=HttpLambdaIntegration("ProfileIntegration", profile_fn),
            )
            api_base_url = http_api.api_endpoint

        # ── Runtime config.json ───────────────────────────────────────────────
        config = {
            "authority": f"https://cognito-idp.{region}.amazonaws.com/{user_pool.user_pool_id}",
            "clientId": web_client_id,
            "redirectUri": callback_url,
            "logoutUri": callback_url,
            "cognitoDomain": cognito_domain_url,
            "scope": "openid email",
        }
        if api_base_url:
            config["profileApiUrl"] = api_base_url.rstrip("/")

        if hasattr(backend_stack, "telemetry_api"):
            config["telemetryApiUrl"] = backend_stack.telemetry_api.api_endpoint.rstrip("/")

        # ── Deploy frontend ───────────────────────────────────────────────────
        if os.path.isdir(frontend_dist):
            s3_deploy.BucketDeployment(
                self, "DeployWebsite",
                sources=[
                    s3_deploy.Source.asset(frontend_dist),
                    s3_deploy.Source.data("config.json", json.dumps(config, indent=2)),
                ],
                destination_bucket=bucket,
                distribution=self.distribution,
                distribution_paths=["/*"],
                prune=True,
            )

        # ── Outputs ───────────────────────────────────────────────────────────
        CfnOutput(self, "WebsiteURL", value=website_url,
                  export_name="SentinelNetWebsiteURL")
        CfnOutput(self, "DistributionId", value=self.distribution.distribution_id,
                  export_name="SentinelNetWebsiteDistributionId")
        CfnOutput(self, "CognitoClientId", value=web_client_id,
                  export_name="SentinelNetCognitoClientId")
        if api_base_url:
            CfnOutput(self, "ProfileApiUrl", value=api_base_url,
                      export_name="SentinelNetProfileApiUrl")
