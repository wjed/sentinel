"""
Website Stack — S3 + CloudFront hosting for the SentinelNet frontend.

Deploys the built React app (frontend/dist) to an S3 bucket with CloudFront
in front for HTTPS and caching. SPA routing: 403/404 return index.html.
"""

from pathlib import Path

from aws_cdk import CfnOutput, Stack, RemovalPolicy
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_s3_deployment as s3_deploy
from aws_cdk import aws_cloudfront as cloudfront
from aws_cdk.aws_cloudfront_origins import S3BucketOrigin
from constructs import Construct


class WebsiteStack(Stack):
    """S3 bucket + CloudFront distribution hosting the frontend static site."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Path to built frontend (must run `npm run build` in frontend/ first)
        repo_root = Path(__file__).resolve().parents[2]
        frontend_dist = str(repo_root / "frontend" / "dist")

        bucket = s3.Bucket(
            self,
            "WebsiteBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

        origin = S3BucketOrigin.with_origin_access_control(bucket)

        self.distribution = cloudfront.Distribution(
            self,
            "Distribution",
            default_behavior=cloudfront.BehaviorOptions(origin=origin),
            default_root_object="index.html",
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path="/index.html",
                ),
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html",
                ),
            ],
        )

        # Deploy frontend build to bucket. Run `npm run build` in frontend/ first.
        # We do not pass distribution/distribution_paths here: the CDK custom resource would wait for
        # CloudFront invalidation to complete and often times out ("Waiter InvalidationCompleted failed").
        # After deploy, run: aws cloudfront create-invalidation --distribution-id <DistributionId> --paths "/*"
        s3_deploy.BucketDeployment(
            self,
            "DeployWebsite",
            sources=[s3_deploy.Source.asset(frontend_dist)],
            destination_bucket=bucket,
        )

        # Outputs so the URL shows in CloudFormation and `cdk deploy` output
        CfnOutput(
            self,
            "DistributionId",
            value=self.distribution.distribution_id,
            description="CloudFront distribution ID (use for create-invalidation after deploy)",
            export_name="SentinelNetWebsiteDistributionId",
        )
        CfnOutput(
            self,
            "DistributionDomainName",
            value=self.distribution.distribution_domain_name,
            description="CloudFront distribution domain name",
            export_name="SentinelNetWebsiteDomain",
        )
        CfnOutput(
            self,
            "WebsiteURL",
            value=f"https://{self.distribution.distribution_domain_name}",
            description="URL of the SentinelNet dashboard",
            export_name="SentinelNetWebsiteURL",
        )
