import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import boto3
except ImportError:  # pragma: no cover - supports offline tests without boto3 installed
    boto3 = None

DEFAULT_ALERTS_FILE = "/var/ossec/logs/alerts/alerts.json"
DEFAULT_STATE_FILE = "/var/lib/sentinel/wazuh-forwarder-state.json"
DEFAULT_BATCH_SIZE = 10
DEFAULT_POLL_INTERVAL_SECONDS = 2.0
MAX_SQS_BATCH_SIZE = 10
MAX_SQS_MESSAGE_BYTES = 256 * 1024


@dataclass(frozen=True)
class OffsetState:
    inode: int | None = None
    offset: int = 0


@dataclass(frozen=True)
class AlertEntry:
    body: str
    end_offset: int


@dataclass(frozen=True)
class CollectedBatch:
    entries: list[AlertEntry]
    retry_state: OffsetState
    checkpoint_state: OffsetState


@dataclass(frozen=True)
class ForwarderConfig:
    queue_url: str
    alerts_file: Path
    state_file: Path
    batch_size: int = DEFAULT_BATCH_SIZE
    poll_interval_seconds: float = DEFAULT_POLL_INTERVAL_SECONDS


def build_config_from_env() -> ForwarderConfig:
    queue_url = os.environ["WAZUH_ALERT_QUEUE_URL"].strip()
    batch_size = int(os.environ.get("WAZUH_BATCH_SIZE", str(DEFAULT_BATCH_SIZE)))
    if batch_size < 1 or batch_size > MAX_SQS_BATCH_SIZE:
        raise ValueError(
            f"WAZUH_BATCH_SIZE must be between 1 and {MAX_SQS_BATCH_SIZE}"
        )

    return ForwarderConfig(
        queue_url=queue_url,
        alerts_file=Path(os.environ.get("WAZUH_ALERTS_FILE", DEFAULT_ALERTS_FILE)),
        state_file=Path(os.environ.get("WAZUH_STATE_FILE", DEFAULT_STATE_FILE)),
        batch_size=batch_size,
        poll_interval_seconds=float(
            os.environ.get(
                "WAZUH_POLL_INTERVAL_SECONDS",
                str(DEFAULT_POLL_INTERVAL_SECONDS),
            )
        ),
    )


def load_state(state_file: Path) -> OffsetState:
    if not state_file.exists():
        return OffsetState()

    try:
        payload = json.loads(state_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        print(f"State file {state_file} is invalid JSON; resetting checkpoint")
        return OffsetState()

    inode_value = payload.get("inode")
    offset_value = payload.get("offset", 0)
    inode = int(inode_value) if inode_value is not None else None
    offset = max(0, int(offset_value))
    return OffsetState(inode=inode, offset=offset)


def save_state(state_file: Path, state: OffsetState) -> None:
    state_file.parent.mkdir(parents=True, exist_ok=True)
    state_file.write_text(
        json.dumps({"inode": state.inode, "offset": state.offset}),
        encoding="utf-8",
    )


def collect_batch(
    alerts_file: Path,
    current_state: OffsetState,
    max_batch_size: int,
) -> CollectedBatch:
    if not alerts_file.exists():
        return CollectedBatch(
            entries=[],
            retry_state=current_state,
            checkpoint_state=current_state,
        )

    file_stat = alerts_file.stat()
    state = current_state
    if state.inode != file_stat.st_ino or file_stat.st_size < state.offset:
        state = OffsetState(inode=file_stat.st_ino, offset=0)

    entries: list[AlertEntry] = []
    retry_state = state
    checkpoint_state = state
    found_valid_entry = False

    with alerts_file.open("r", encoding="utf-8") as handle:
        handle.seek(state.offset)

        while len(entries) < max_batch_size:
            line_start_offset = handle.tell()
            raw_line = handle.readline()
            if not raw_line:
                break

            line_end_offset = handle.tell()
            checkpoint_state = OffsetState(
                inode=file_stat.st_ino,
                offset=line_end_offset,
            )
            stripped_line = raw_line.strip()

            if not stripped_line:
                if not found_valid_entry:
                    retry_state = checkpoint_state
                continue

            if not is_valid_alert_json(stripped_line):
                print(
                    f"Skipping malformed Wazuh alert line at offset "
                    f"{line_start_offset} in {alerts_file}"
                )
                if not found_valid_entry:
                    retry_state = checkpoint_state
                continue

            if len(stripped_line.encode("utf-8")) > MAX_SQS_MESSAGE_BYTES:
                print(
                    f"Skipping oversized Wazuh alert at offset "
                    f"{line_start_offset} in {alerts_file}"
                )
                if not found_valid_entry:
                    retry_state = checkpoint_state
                continue

            if not found_valid_entry:
                retry_state = OffsetState(
                    inode=file_stat.st_ino,
                    offset=line_start_offset,
                )
                found_valid_entry = True

            entries.append(
                AlertEntry(
                    body=stripped_line,
                    end_offset=line_end_offset,
                )
            )

    return CollectedBatch(
        entries=entries,
        retry_state=retry_state,
        checkpoint_state=checkpoint_state,
    )


def is_valid_alert_json(raw_line: str) -> bool:
    try:
        payload = json.loads(raw_line)
    except json.JSONDecodeError:
        return False
    return isinstance(payload, dict)


def send_entries(
    sqs_client: Any,
    queue_url: str,
    entries: list[AlertEntry],
) -> bool:
    if not entries:
        return True

    batch_entries = [
        {"Id": f"alert-{index}", "MessageBody": entry.body}
        for index, entry in enumerate(entries)
    ]
    response = sqs_client.send_message_batch(
        QueueUrl=queue_url,
        Entries=batch_entries,
    )

    failed_entries = response.get("Failed", [])
    if failed_entries:
        failed_ids = ", ".join(
            failure.get("Id", "unknown")
            for failure in failed_entries
        )
        print(f"Failed to send SQS batch entries: {failed_ids}")
        return False

    print(f"Forwarded {len(entries)} Wazuh alerts to SQS")
    return True


def run_once(config: ForwarderConfig, sqs_client: Any) -> bool:
    current_state = load_state(config.state_file)
    batch = collect_batch(
        alerts_file=config.alerts_file,
        current_state=current_state,
        max_batch_size=config.batch_size,
    )

    if not batch.entries:
        if batch.checkpoint_state != current_state:
            save_state(config.state_file, batch.checkpoint_state)
        return False

    if send_entries(
        sqs_client=sqs_client,
        queue_url=config.queue_url,
        entries=batch.entries,
    ):
        save_state(config.state_file, batch.checkpoint_state)
        return True

    save_state(config.state_file, batch.retry_state)
    return False


def main() -> None:
    if boto3 is None:
        raise RuntimeError("boto3 is required to run the Wazuh forwarder")

    config = build_config_from_env()
    sqs_client = boto3.client("sqs")

    while True:
        did_forward = run_once(config=config, sqs_client=sqs_client)
        if not did_forward:
            time.sleep(config.poll_interval_seconds)


if __name__ == "__main__":
    main()
