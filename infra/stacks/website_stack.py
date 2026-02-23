"""
Website Stack — S3 + CloudFront + Cognito for SentinelNet.

Deploys the built React app to S3/CloudFront and creates a Cognito user pool
with Hosted UI. Writes config.json so the app uses the correct Cognito IDs at runtime.
"""

import json
from pathlib import Path

from aws_cdk import CfnOutput, Stack, RemovalPolicy
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_s3_deployment as s3_deploy
from aws_cdk import aws_cloudfront as cloudfront
from aws_cdk import aws_cognito as cognito
from aws_cdk.aws_cloudfront_origins import S3BucketOrigin
from constructs import Construct


class WebsiteStack(Stack):
    """S3 + CloudFront + Cognito. One deploy: site + sign-in."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        repo_root = Path(__file__).resolve().parents[2]
        frontend_dist = str(repo_root / "frontend" / "dist")

        # --- S3 + CloudFront (order: need distribution URL for Cognito callback) ---
        bucket = s3.Bucket(
            self,
            "WebsiteBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

        origin = S3BucketOrigin.with_origin_access_control(bucket)

        # SPA routing: rewrite only page-like requests to /index.html in a viewer-request function.
        # Do NOT use 403/404 -> index.html error responses, or /assets/*.js would get HTML and break (wrong MIME).
        spa_rewrite_code = """
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    if (uri.endsWith('/')) {
        request.uri = uri + 'index.html';
    } else if (!uri.includes('.') && uri.indexOf('/assets/') !== 0) {
        request.uri = '/index.html';
    }
    return request;
}
"""
        spa_rewrite = cloudfront.Function(
            self,
            "SpaRewrite",
            code=cloudfront.FunctionCode.from_inline(spa_rewrite_code),
            runtime=cloudfront.FunctionRuntime.JS_2_0,
            comment="Rewrite SPA routes to /index.html; leave /assets/* and other static paths unchanged.",
        )

        self.distribution = cloudfront.Distribution(
            self,
            "Distribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origin,
                function_associations=[
                    cloudfront.FunctionAssociation(
                        function=spa_rewrite,
                        event_type=cloudfront.FunctionEventType.VIEWER_REQUEST,
                    ),
                ],
            ),
            default_root_object="index.html",
        )

        website_url = f"https://{self.distribution.distribution_domain_name}"
        callback_url = f"{website_url}/"

        # --- Cognito: user pool + Hosted UI + app client ---
        user_pool = cognito.UserPool(
            self,
            "UserPool",
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(email=True),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            removal_policy=RemovalPolicy.DESTROY,
        )

        domain = user_pool.add_domain(
            "Domain",
            cognito_domain=cognito.CognitoDomainOptions(
                domain_prefix="sentinelnet",
            ),
        )

        app_client = user_pool.add_client(
            "WebClient",
            auth_flows=cognito.AuthFlow(user_srp=True),
            generate_secret=False,
            o_auth=cognito.OAuthSettings(
                flows=cognito.OAuthFlows(authorization_code_grant=True),
                scopes=[
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.PHONE,
                ],
                callback_urls=[callback_url],
                logout_urls=[callback_url],
            ),
            supported_identity_providers=[
                cognito.UserPoolClientIdentityProvider.COGNITO,
            ],
        )

        region = self.region
        cognito_domain_url = f"https://sentinelnet.auth.{region}.amazoncognito.com"

        # Runtime config for the frontend (so it uses this pool, not a hardcoded one)
        runtime_config = {
            "authority": f"https://cognito-idp.{region}.amazonaws.com/{user_pool.user_pool_id}",
            "clientId": app_client.user_pool_client_id,
            "redirectUri": callback_url,
            "logoutUri": callback_url,
            "cognitoDomain": cognito_domain_url,
            "scope": "openid email phone",
        }

        config_json = json.dumps(runtime_config, indent=2)

        # Deploy frontend + config.json. Invalidate CloudFront so clients get new index.html
        # and assets (avoids cached 404 / wrong MIME). Prune so old hashed assets are removed.
        s3_deploy.BucketDeployment(
            self,
            "DeployWebsite",
            sources=[
                s3_deploy.Source.asset(frontend_dist),
                s3_deploy.Source.data("config.json", config_json),
            ],
            destination_bucket=bucket,
            distribution=self.distribution,
            distribution_paths=["/*"],
            prune=True,
        )

        # Outputs
        CfnOutput(
            self,
            "WebsiteURL",
            value=website_url,
            description="Use this URL; add it to Cognito callback URLs (done by stack).",
            export_name="SentinelNetWebsiteURL",
        )
        CfnOutput(
            self,
            "DistributionId",
            value=self.distribution.distribution_id,
            description="For cache invalidation: aws cloudfront create-invalidation --distribution-id <id> --paths '/*'",
            export_name="SentinelNetWebsiteDistributionId",
        )
        CfnOutput(
            self,
            "CognitoUserPoolId",
            value=user_pool.user_pool_id,
            description="Cognito user pool ID (for reference).",
            export_name="SentinelNetCognitoUserPoolId",
        )
        CfnOutput(
            self,
            "CognitoClientId",
            value=app_client.user_pool_client_id,
            description="Cognito app client ID (for reference).",
            export_name="SentinelNetCognitoClientId",
        )
