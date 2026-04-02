"""
Website Stack — S3 + CloudFront + Cognito for SentinelNet.

Deploys the React app to S3/CloudFront, creates a Cognito user pool
with Hosted UI, and optionally wires a profile API if UserDataStack
is provided. Writes config.json so the frontend picks up Cognito IDs.

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


class WebsiteStack(Stack):
    """S3 + CloudFront + Cognito. Profile API when user_data_stack is provided."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        user_data_stack: Optional[Stack] = None,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        Tags.of(self).add("Project", "SentinelNet")

        repo_root = Path(__file__).resolve().parents[2]
        frontend_dist = str(repo_root / "frontend" / "dist")
        profile_lambda_dir = str(repo_root / "infra" / "lambda" / "profile_api_py")

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

        # ── Cognito ───────────────────────────────────────────────────────────
        user_pool = cognito.UserPool(
            self, "UserPool",
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(email=True),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            removal_policy=RemovalPolicy.DESTROY,
        )

        user_pool.add_domain(
            "Domain",
            cognito_domain=cognito.CognitoDomainOptions(domain_prefix="sentinelnet"),
        )

        app_client = user_pool.add_client(
            "WebClient",
            auth_flows=cognito.AuthFlow(user_srp=True),
            generate_secret=False,
            o_auth=cognito.OAuthSettings(
                flows=cognito.OAuthFlows(authorization_code_grant=True),
                scopes=[cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL],
                callback_urls=[callback_url],
                logout_urls=[callback_url],
            ),
            supported_identity_providers=[
                cognito.UserPoolClientIdentityProvider.COGNITO
            ],
        )

        region = self.region
        cognito_domain_url = f"https://sentinelnet.auth.{region}.amazoncognito.com"

        # ── Profile API (optional) ────────────────────────────────────────────
        api_base_url = None
        if user_data_stack and hasattr(user_data_stack, "profiles_table"):
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
                    jwt_audience=[app_client.user_pool_client_id],
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
            "clientId": app_client.user_pool_client_id,
            "redirectUri": callback_url,
            "logoutUri": callback_url,
            "cognitoDomain": cognito_domain_url,
            "scope": "openid email",
        }
        if api_base_url:
            config["profileApiUrl"] = api_base_url.rstrip("/")

        # ── Deploy frontend (skip if dist/ not built yet) ─────────────────────
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
        CfnOutput(self, "CognitoUserPoolId", value=user_pool.user_pool_id,
                  export_name="SentinelNetCognitoUserPoolId")
        CfnOutput(self, "CognitoClientId", value=app_client.user_pool_client_id,
                  export_name="SentinelNetCognitoClientId")
        if api_base_url:
            CfnOutput(self, "ProfileApiUrl", value=api_base_url,
                      export_name="SentinelNetProfileApiUrl")
