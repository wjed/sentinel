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
from aws_cdk.aws_cloudfront_origins import S3BucketOrigin, HttpOrigin
from aws_cdk import aws_cognito as cognito
from aws_cdk import aws_lambda as lambda_
from aws_cdk import aws_iam as iam
from aws_cdk import aws_apigatewayv2 as apigwv2
from aws_cdk import aws_logs as logs
from aws_cdk.aws_apigatewayv2_integrations import HttpLambdaIntegration
from aws_cdk.aws_apigatewayv2_authorizers import HttpJwtAuthorizer
from aws_cdk import aws_certificatemanager as acm
from aws_cdk import aws_route53 as route53
from aws_cdk import aws_route53_targets as route53_targets
from constructs import Construct

if False:
    from .backend_stack import BackendStack


DOMAIN_NAME = "sentinelnetsolutions.com"
ALT_DOMAIN_NAMES = [f"www.{DOMAIN_NAME}"]
HOSTED_ZONE_ID = "Z02031801QLNS1AIUFNZK"
CERTIFICATE_ARN = (
    "arn:aws:acm:us-east-1:639418629910:certificate/"
    "bf203c8d-de82-4701-869e-114d59a41756"
)


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

        repo_root = Path(__file__).resolve().parents[2]
        frontend_dist = str(repo_root / "frontend" / "dist")
        profile_lambda_dir = str(repo_root / "infra" / "lambda" / "profile_api_py")
        admin_access_lambda_dir = str(repo_root / "infra" / "lambda" / "admin_access_api_py")

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

        # Reuse the existing hosted zone and ACM cert (cert is in us-east-1, as CloudFront requires).
        hosted_zone = route53.HostedZone.from_hosted_zone_attributes(
            self,
            "HostedZone",
            hosted_zone_id=HOSTED_ZONE_ID,
            zone_name=DOMAIN_NAME,
        )
        certificate = acm.Certificate.from_certificate_arn(
            self, "SiteCertificate", CERTIFICATE_ARN
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
            domain_names=[DOMAIN_NAME, *ALT_DOMAIN_NAMES],
            certificate=certificate,
        )

        grafana_origin = HttpOrigin(
            backend_stack.alb.load_balancer_dns_name,
            http_port=3000,
            protocol_policy=cloudfront.OriginProtocolPolicy.HTTP_ONLY
        )

        self.distribution.add_behavior(
            "/grafana",
            origin=grafana_origin,
            viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
            origin_request_policy=cloudfront.OriginRequestPolicy.ALL_VIEWER
        )

        self.distribution.add_behavior(
            "/grafana/*",
            origin=grafana_origin,
            viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
            origin_request_policy=cloudfront.OriginRequestPolicy.ALL_VIEWER
        )

        # Alias apex and www to the CloudFront distribution.
        cloudfront_target = route53.RecordTarget.from_alias(
            route53_targets.CloudFrontTarget(self.distribution)
        )
        route53.ARecord(
            self, "AliasApex", zone=hosted_zone, target=cloudfront_target
        )
        route53.AaaaRecord(
            self, "AliasApexAAAA", zone=hosted_zone, target=cloudfront_target
        )
        route53.ARecord(
            self,
            "AliasWww",
            zone=hosted_zone,
            record_name="www",
            target=cloudfront_target,
        )
        route53.AaaaRecord(
            self,
            "AliasWwwAAAA",
            zone=hosted_zone,
            record_name="www",
            target=cloudfront_target,
        )

        website_url = f"https://{DOMAIN_NAME}"
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
        issuer = f"https://cognito-idp.{region}.amazonaws.com/{user_pool.user_pool_id}"
        allowed_groups = getattr(
            user_data_stack,
            "allowed_console_groups",
            ["SentinelNetAdmins", "SentinelNetAnalysts", "SentinelNetViewers"],
        )
        allowed_groups_csv = ",".join(allowed_groups)

        # ── Profile API (optional) ────────────────────────────────────────────
        api_base_url = None
        if hasattr(user_data_stack, "profiles_table"):
            profile_fn = lambda_.Function(
                self, "ProfileApi",
                runtime=lambda_.Runtime.PYTHON_3_12,
                handler="handler.handler",
                code=lambda_.Code.from_asset(profile_lambda_dir),
                log_retention=logs.RetentionDays.ONE_DAY,
                environment={
                    "TABLE_NAME": user_data_stack.profiles_table.table_name,
                    "ALLOWED_GROUPS": allowed_groups_csv,
                },
            )
            user_data_stack.profiles_table.grant_read_write_data(profile_fn)

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

        admin_access_api_base_url = None
        admin_access_fn = lambda_.Function(
            self, "AdminAccessApi",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=lambda_.Code.from_asset(admin_access_lambda_dir),
            log_retention=logs.RetentionDays.ONE_DAY,
            environment={
                "USER_POOL_ID": user_pool.user_pool_id,
                "ADMIN_GROUP_NAME": allowed_groups[0],
                "ANALYST_GROUP_NAME": allowed_groups[1],
                "VIEWER_GROUP_NAME": allowed_groups[2],
            },
        )
        admin_access_fn.add_to_role_policy(
            iam.PolicyStatement(
                actions=[
                    "cognito-idp:AdminAddUserToGroup",
                    "cognito-idp:AdminRemoveUserFromGroup",
                    "cognito-idp:AdminGetUser",
                    "cognito-idp:AdminListGroupsForUser",
                    "cognito-idp:ListUsers",
                ],
                resources=[user_pool.user_pool_arn],
            )
        )
        admin_access_api = apigwv2.HttpApi(
            self, "AdminAccessHttpApi",
            cors_preflight=apigwv2.CorsPreflightOptions(
                allow_origins=["*"],
                allow_methods=[
                    apigwv2.CorsHttpMethod.GET,
                    apigwv2.CorsHttpMethod.POST,
                    apigwv2.CorsHttpMethod.OPTIONS,
                ],
                allow_headers=["Authorization", "Content-Type"],
            ),
            default_authorizer=HttpJwtAuthorizer(
                "AdminAccessCognitoAuth", issuer,
                jwt_audience=[web_client_id],
            ),
        )
        admin_access_api.add_routes(
            path="/admin/access/groups",
            methods=[apigwv2.HttpMethod.GET],
            integration=HttpLambdaIntegration("AdminAccessGroupsIntegration", admin_access_fn),
        )
        admin_access_api.add_routes(
            path="/admin/access/whoami",
            methods=[apigwv2.HttpMethod.GET],
            integration=HttpLambdaIntegration("AdminAccessWhoamiIntegration", admin_access_fn),
        )
        admin_access_api.add_routes(
            path="/admin/access/users",
            methods=[apigwv2.HttpMethod.GET],
            integration=HttpLambdaIntegration("AdminAccessUsersIntegration", admin_access_fn),
        )
        admin_access_api.add_routes(
            path="/admin/access/users/{identifier}",
            methods=[apigwv2.HttpMethod.GET],
            integration=HttpLambdaIntegration("AdminAccessUserIntegration", admin_access_fn),
        )
        admin_access_api.add_routes(
            path="/admin/access/grant",
            methods=[apigwv2.HttpMethod.POST],
            integration=HttpLambdaIntegration("AdminAccessGrantIntegration", admin_access_fn),
        )
        admin_access_api.add_routes(
            path="/admin/access/revoke",
            methods=[apigwv2.HttpMethod.POST],
            integration=HttpLambdaIntegration("AdminAccessRevokeIntegration", admin_access_fn),
        )
        admin_access_api_base_url = admin_access_api.api_endpoint

        telemetry_api_base_url = None
        if hasattr(backend_stack, "telemetry_api_fn"):
            backend_stack.telemetry_api_fn.add_environment(
                "ALLOWED_GROUPS", allowed_groups_csv
            )
            telemetry_api = apigwv2.HttpApi(
                self, "TelemetryHttpApi",
                cors_preflight=apigwv2.CorsPreflightOptions(
                    allow_origins=["*"],
                    allow_methods=[
                        apigwv2.CorsHttpMethod.GET,
                        apigwv2.CorsHttpMethod.OPTIONS,
                    ],
                    allow_headers=["Authorization", "Content-Type"],
                ),
                default_authorizer=HttpJwtAuthorizer(
                    "TelemetryCognitoAuth", issuer,
                    jwt_audience=[web_client_id],
                ),
            )
            telemetry_api.add_routes(
                path="/alerts",
                methods=[apigwv2.HttpMethod.GET],
                integration=HttpLambdaIntegration(
                    "TelemetryIntegration", backend_stack.telemetry_api_fn),
            )
            telemetry_api_base_url = telemetry_api.api_endpoint

        # ── Runtime config.json ───────────────────────────────────────────────
        config = {
            "authority": f"https://cognito-idp.{region}.amazonaws.com/{user_pool.user_pool_id}",
            "clientId": web_client_id,
            "redirectUri": callback_url,
            "logoutUri": callback_url,
            "cognitoDomain": cognito_domain_url,
            "scope": "openid email",
            "allowedGroups": allowed_groups,
        }
        if api_base_url:
            config["profileApiUrl"] = api_base_url.rstrip("/")

        if telemetry_api_base_url:
            config["telemetryApiUrl"] = telemetry_api_base_url.rstrip("/")
        if admin_access_api_base_url:
            config["adminAccessApiUrl"] = admin_access_api_base_url.rstrip("/")

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
        if telemetry_api_base_url:
            CfnOutput(self, "TelemetryApiUrl", value=telemetry_api_base_url,
                      export_name="SentinelNetTelemetryApiUrl")
        if admin_access_api_base_url:
            CfnOutput(self, "AdminAccessApiUrl", value=admin_access_api_base_url,
                      export_name="SentinelNetAdminAccessApiUrl")
