import json
import unittest
from pathlib import Path
import shutil
import sys
import uuid

CURRENT_DIR = Path(__file__).resolve().parent
TEST_TMP_DIR = CURRENT_DIR / ".tmp"
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

import wazuh_to_sqs as forwarder  # noqa: E402


class FakeSqsClient:
    def __init__(self, failed_ids: list[str] | None = None) -> None:
        self.failed_ids = failed_ids or []
        self.calls: list[dict] = []

    def send_message_batch(self, QueueUrl: str, Entries: list[dict]) -> dict:
        self.calls.append({"QueueUrl": QueueUrl, "Entries": Entries})
        return {
            "Successful": [
                {"Id": entry["Id"]}
                for entry in Entries
                if entry["Id"] not in self.failed_ids
            ],
            "Failed": [
                {"Id": entry["Id"]}
                for entry in Entries
                if entry["Id"] in self.failed_ids
            ],
        }


class WazuhForwarderTests(unittest.TestCase):
    def make_case_dir(self) -> Path:
        TEST_TMP_DIR.mkdir(exist_ok=True)
        case_dir = TEST_TMP_DIR / str(uuid.uuid4())
        case_dir.mkdir()
        self.addCleanup(lambda: shutil.rmtree(case_dir, ignore_errors=True))
        return case_dir

    def test_collect_batch_skips_invalid_lines_before_valid_entries(self) -> None:
        case_dir = self.make_case_dir()
        alerts_path = case_dir / "alerts.json"
        alerts_path.write_text(
            "\n"
            "not-json\n"
            '{"agent":{"id":"001"},"rule":{"level":5},"timestamp":"2026-03-09T10:00:00Z"}\n'
            '{"agent":{"id":"002"},"rule":{"level":7},"timestamp":"2026-03-09T10:01:00Z"}\n',
            encoding="utf-8",
            newline="\n",
        )

        batch = forwarder.collect_batch(
            alerts_file=alerts_path,
            current_state=forwarder.OffsetState(),
            max_batch_size=10,
        )

        self.assertEqual(len(batch.entries), 2)
        self.assertEqual(
            json.loads(batch.entries[0].body)["agent"]["id"],
            "001",
        )
        self.assertEqual(batch.retry_state.offset, len("\nnot-json\n"))
        self.assertEqual(
            batch.checkpoint_state.offset,
            alerts_path.stat().st_size,
        )

    def test_run_once_sends_batch_and_updates_checkpoint(self) -> None:
        case_dir = self.make_case_dir()
        alerts_path = case_dir / "alerts.json"
        state_path = case_dir / "state.json"
        alerts_path.write_text(
            '{"agent":{"id":"001"},"rule":{"level":5},"timestamp":"2026-03-09T10:00:00Z"}\n'
            '{"agent":{"id":"002"},"rule":{"level":7},"timestamp":"2026-03-09T10:01:00Z"}\n',
            encoding="utf-8",
            newline="\n",
        )
        config = forwarder.ForwarderConfig(
            queue_url="https://example.com/queue",
            alerts_file=alerts_path,
            state_file=state_path,
            batch_size=10,
            poll_interval_seconds=0.01,
        )
        fake_sqs = FakeSqsClient()

        did_forward = forwarder.run_once(config=config, sqs_client=fake_sqs)

        self.assertTrue(did_forward)
        self.assertEqual(len(fake_sqs.calls), 1)
        self.assertEqual(fake_sqs.calls[0]["QueueUrl"], config.queue_url)
        self.assertEqual(len(fake_sqs.calls[0]["Entries"]), 2)
        saved_state = forwarder.load_state(state_path)
        self.assertEqual(saved_state.offset, alerts_path.stat().st_size)

    def test_run_once_rewinds_to_first_valid_entry_after_send_failure(self) -> None:
        case_dir = self.make_case_dir()
        alerts_path = case_dir / "alerts.json"
        state_path = case_dir / "state.json"
        prefix = "\nnot-json\n"
        body = (
            prefix
            + '{"agent":{"id":"001"},"rule":{"level":5},"timestamp":"2026-03-09T10:00:00Z"}\n'
        )
        alerts_path.write_text(body, encoding="utf-8", newline="\n")
        config = forwarder.ForwarderConfig(
            queue_url="https://example.com/queue",
            alerts_file=alerts_path,
            state_file=state_path,
            batch_size=10,
            poll_interval_seconds=0.01,
        )
        fake_sqs = FakeSqsClient(failed_ids=["alert-0"])

        did_forward = forwarder.run_once(config=config, sqs_client=fake_sqs)

        self.assertFalse(did_forward)
        saved_state = forwarder.load_state(state_path)
        self.assertEqual(saved_state.offset, len(prefix))


if __name__ == "__main__":
    unittest.main()
