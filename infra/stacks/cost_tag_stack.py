"""
Helpers for applying standardized tags to CDK constructs and stacks.

This module centralizes tagging patterns so multiple stacks can call into
the same helpers. Comments below explain the intent and important
behavioral details so future maintainers can safely adjust scope and
which constructs receive tags.

Tagging notes:
- `Tags.of(x).add(k, v)` applies the tag to the construct `x` and all of
    its child constructs. Using the application root or a parent construct
    will therefore spread tags widely. To constrain tags to a single stack
    use `Tags.of(self)` inside the stack implementation.
- Choose whether helpers apply tags globally (across the app) or locally
    (only to a particular stack) by deciding the `resource_scope` you pass
    to the helper functions.
"""

from aws_cdk import Stack, Tags
from constructs import Construct


class CostTagStack(Stack):
        """A small stack that demonstrates standardized tagging helpers.

        Intended usage patterns:
        - Instantiating this `CostTagStack` will apply the `global_tags` to
            the provided `scope`. If the caller passed the application root
            (`App`) as `scope`, the tags will be applied app-wide. If a
            stack-level construct is passed, tagging will be limited to that
            construct's subtree.

        - Use the `tag_internal_resources` and `tag_public_resources` static
            helpers to tag specific resource groups (for example, call
            `CostTagStack.tag_internal_resources(self)` inside `DataStack` to
            apply the internal-data tags to that stack's constructs).
        """

        def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
                super().__init__(scope, construct_id, **kwargs)

                # 1. Global Project Tags (Applied to the provided scope)
                # - If `scope` is the App, these tags become global for the app.
                # - If you want them limited to *this* stack only, replace
                #   `Tags.of(scope)` with `Tags.of(self)`.
                global_tags = {
                        "Project": "SentinelNet",
                        "Environment": "Dev"
                }
                for key, value in global_tags.items():
                        Tags.of(scope).add(key, value)

        @staticmethod
        def tag_internal_resources(resource_scope: Construct):
                """Apply tags used for data-facing / private resources.

                Usage: call this from the stack that creates private/internal
                resources (for example the data stack or private subnet
                construct). `resource_scope` should be the construct that owns the
                resources to be tagged.
                """
                Tags.of(resource_scope).add("Tier", "Internal-Private")
                Tags.of(resource_scope).add("DataSensitivity", "High")
                Tags.of(resource_scope).add("Service", "Database-Storage")

        @staticmethod
        def tag_public_resources(resource_scope: Construct):
                """Apply tags used for public-facing / network resources.

                Usage: call this from the stack or construct that contains network
                gateway / public ingress resources. Providing the correct
                `resource_scope` ensures tags are applied only to the intended
                resources and their children.
                """
                Tags.of(resource_scope).add("Tier", "Public-Ingress")
                Tags.of(resource_scope).add("Service", "Network-Gateway")
