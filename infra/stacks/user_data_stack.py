"""
User Data Stack — DynamoDB + S3 for user profiles.

Deploy with: cdk deploy SentinelNet-UserData
"""

from aws_cdk import CfnOutput, RemovalPolicy, Stack, Tags
from aws_cdk import aws_dynamodb as dynamodb
from aws_cdk import aws_s3 as s3
from constructs import Construct


class UserDataStack(Stack):
    """DynamoDB table (userId) + S3 bucket for profile pictures."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        Tags.of(self).add("Project", "SentinelNet")

        # ── DynamoDB: user profiles ───────────────────────────────────────────
        self.profiles_table = dynamodb.Table(
            self,
            "ProfilesTable",
            partition_key=dynamodb.Attribute(
                name="userId", type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # ── S3: profile picture uploads ───────────────────────────────────────
        self.profile_pictures_bucket = s3.Bucket(
            self,
            "ProfilePictures",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET, s3.HttpMethods.PUT],
                    allowed_origins=["*"],
                    allowed_headers=["*"],
                )
            ],
        )

        # ── Outputs ───────────────────────────────────────────────────────────
        CfnOutput(self, "ProfilesTableName",
                  value=self.profiles_table.table_name,
                  export_name="SentinelNetProfilesTableName")
        CfnOutput(self, "ProfilePicturesBucketName",
                  value=self.profile_pictures_bucket.bucket_name,
                  export_name="SentinelNetProfilePicturesBucketName")
