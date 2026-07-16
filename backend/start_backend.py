"""Start the Django web server and database-backed automation worker together."""

from __future__ import annotations

import os
import signal
import socket
import subprocess
import sys
import time


PYTHON = sys.executable
children: list[subprocess.Popen] = []
stopping = False


def run_setup(command: str) -> None:
    subprocess.run([PYTHON, "manage.py", command], check=True)


def stop_children(*_args) -> None:
    global stopping
    stopping = True
    for process in children:
        if process.poll() is None:
            process.terminate()


def wait_for_shutdown() -> int:
    while True:
        for process in children:
            return_code = process.poll()
            if return_code is None:
                continue
            if stopping:
                return 0

            name = "automation worker" if process is children[0] else "Gunicorn"
            print(
                f"{name} exited unexpectedly with code {return_code}; "
                "stopping backend so Railway can restart it.",
                flush=True,
            )
            stop_children()
            return return_code or 1
        time.sleep(1)


def main() -> int:
    run_setup("migrate")
    run_setup("seed_rbac")
    run_setup("ensure_superuser")

    worker_id = os.getenv("AUTOMATION_WORKER_ID") or f"railway-{socket.gethostname()}"
    poll_seconds = os.getenv("AUTOMATION_POLL_SECONDS", "60")
    port = os.getenv("PORT", "8000")

    children.extend(
        [
            subprocess.Popen(
                [
                    PYTHON,
                    "manage.py",
                    "process_automation_queue",
                    "--watch",
                    "--worker-id",
                    worker_id,
                    "--poll-seconds",
                    poll_seconds,
                ]
            ),
            subprocess.Popen(
                [
                    "gunicorn",
                    "config.wsgi:application",
                    "--bind",
                    f"0.0.0.0:{port}",
                    "--workers",
                    os.getenv("GUNICORN_WORKERS", "1"),
                    "--worker-class",
                    "gthread",
                    "--threads",
                    os.getenv("GUNICORN_THREADS", "4"),
                    "--max-requests",
                    os.getenv("GUNICORN_MAX_REQUESTS", "1000"),
                    "--max-requests-jitter",
                    "100",
                    "--timeout",
                    os.getenv("GUNICORN_TIMEOUT", "120"),
                ]
            ),
        ]
    )

    signal.signal(signal.SIGTERM, stop_children)
    signal.signal(signal.SIGINT, stop_children)
    return wait_for_shutdown()


if __name__ == "__main__":
    raise SystemExit(main())
