"""
Placeholder for shared CDK constructs.

Future purpose:
  Reusable constructs (e.g. tagged buckets, standard security groups)
  that multiple stacks can use. Kept empty in this scaffolding.

This module does not define any AWS resources.
"""

from constructs import Construct

# When adding constructs, inherit from Construct and accept scope/id.
# Example (do not uncomment for deployment):
#
# class ExampleConstruct(Construct):
#     def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
#         super().__init__(scope, construct_id, **kwargs)
#         # Add child constructs here
#         pass
