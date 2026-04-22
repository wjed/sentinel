import importlib
import importlib.util
import os
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import MagicMock


class AdminAccessHandlerTests(unittest.TestCase):
    def setUp(self):
        os.environ["USER_POOL_ID"] = "pool-123"
        os.environ["ADMIN_GROUP_NAME"] = "SentinelNetAdmins"
        os.environ["ANALYST_GROUP_NAME"] = "SentinelNetAnalysts"
        os.environ["VIEWER_GROUP_NAME"] = "SentinelNetViewers"

        fake_boto3 = types.ModuleType("boto3")
        fake_boto3.client = MagicMock(return_value=MagicMock())
        fake_botocore = types.ModuleType("botocore")
        fake_botocore_exceptions = types.ModuleType("botocore.exceptions")

        class FakeClientError(Exception):
            def __init__(self, response, operation_name=None):
                super().__init__(response)
                self.response = response
                self.operation_name = operation_name

        fake_botocore_exceptions.ClientError = FakeClientError

        self._previous_boto3 = sys.modules.get("boto3")
        self._previous_botocore = sys.modules.get("botocore")
        self._previous_botocore_exceptions = sys.modules.get("botocore.exceptions")
        sys.modules["boto3"] = fake_boto3
        sys.modules["botocore"] = fake_botocore
        sys.modules["botocore.exceptions"] = fake_botocore_exceptions
        self.addCleanup(self.restore_modules)

        module_name = "admin_access_api_handler_test"
        module_path = Path(__file__).resolve().parents[1] / "lambda" / "admin_access_api_py" / "handler.py"
        if module_name in importlib.sys.modules:
            del importlib.sys.modules[module_name]
        spec = importlib.util.spec_from_file_location(module_name, module_path)
        self.module = importlib.util.module_from_spec(spec)
        assert spec and spec.loader
        spec.loader.exec_module(self.module)

    def restore_modules(self):
        for name, previous in [
            ("boto3", self._previous_boto3),
            ("botocore", self._previous_botocore),
            ("botocore.exceptions", self._previous_botocore_exceptions),
        ]:
            if previous is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = previous

    def make_event(self, method="GET", path="/admin/access/groups", groups=None, body=None):
        claims = {
            "sub": "admin-1",
            "email": "admin@example.com",
            "cognito:username": "admin@example.com",
        }
        if groups is not None:
            claims["cognito:groups"] = groups
        return {
            "requestContext": {
                "http": {"method": method, "path": path},
                "authorizer": {"jwt": {"claims": claims}},
            },
            "rawPath": path,
            "body": body,
        }

    def test_requires_authorizer_context(self):
        response = self.module.handler({"rawPath": "/admin/access/groups", "requestContext": {"http": {"method": "GET"}}}, None)
        self.assertEqual(response["statusCode"], 401)

    def test_rejects_non_admins(self):
        response = self.module.handler(self.make_event(groups=["SentinelNetAnalysts"]), None)
        self.assertEqual(response["statusCode"], 403)

    def test_returns_groups_for_admin(self):
        response = self.module.handler(self.make_event(groups=["SentinelNetAdmins"]), None)
        self.assertEqual(response["statusCode"], 200)
        self.assertIn("SentinelNetAdmins", response["body"])

    def test_rejects_invalid_group_on_grant(self):
        response = self.module.handler(
            self.make_event(
                method="POST",
                path="/admin/access/grant",
                groups=["SentinelNetAdmins"],
                body='{"identifier":"user@example.com","group":"Owners"}',
            ),
            None,
        )
        self.assertEqual(response["statusCode"], 400)
        self.assertIn("Invalid group", response["body"])


if __name__ == "__main__":
    unittest.main()
