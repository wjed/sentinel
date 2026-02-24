"""
User Data Stack — DynamoDB table for user profiles + S3 bucket for profile pictures.

Table: partition key userId (string) = Cognito sub. Each item can have:
  - displayName, profilePictureUrl (S3 key or full URL), email (copy from Cognito if desired),
  - updatedAt, or any other attributes you add later (DynamoDB is schemaless per item).

Profile pictures: upload to the S3 bucket (e.g. via presigned URL from a Lambda);
store the key or a public/signed URL in profilePictureUrl.
"""

from aws_cdk import CfnOutput, RemovalPolicy, Stack
from aws_cdk import aws_dynamodb as dynamodb
from aws_cdk import aws_s3 as s3
from constructs import Construct


class UserDataStack(Stack):
    """DynamoDB table for user profiles and S3 bucket for profile picture uploads."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # --- DynamoDB: one row per user (keyed by Cognito sub) ---
        self.profiles_table = dynamodb.Table(
            self,
            "UserProfilesTable",
            partition_key=dynamodb.Attribute(
                name="userId",
                type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # Optional: enable point-in-time recovery for production
        # self.profiles_table.node.default_child.point_in_time_recovery = True

        # --- S3: profile picture uploads ---
        self.profile_pictures_bucket = s3.Bucket(
            self,
            "ProfilePicturesBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            cors=[
                s3.CorsRule(
                    allowed_methods=[
                        s3.HttpMethods.GET,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.HEAD,
                    ],
                    allowed_origins=["*"],  # Restrict to your CloudFront/domain in production
                    allowed_headers=["*"],
                    exposed_headers=["ETag"],
                )
            ],
        )

        # --- Outputs ---
        CfnOutput(
            self,
            "ProfilesTableName",
            value=self.profiles_table.table_name,
            description="DynamoDB table for user profiles (userId = Cognito sub).",
            export_name="SentinelNetProfilesTableName",
        )
        CfnOutput(
            self,
            "ProfilesTableArn",
            value=self.profiles_table.table_arn,
            description="ARN of the user profiles table (for IAM).",
            export_name="SentinelNetProfilesTableArn",
        )
        CfnOutput(
            self,
            "ProfilePicturesBucketName",
            value=self.profile_pictures_bucket.bucket_name,
            description="S3 bucket for profile picture uploads.",
            export_name="SentinelNetProfilePicturesBucketName",
        )
