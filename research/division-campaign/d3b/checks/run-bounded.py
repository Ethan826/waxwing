"""Run an oracle command with a fixed wall-clock limit; preserve output."""
import subprocess
import sys
import time
from pathlib import Path

limit = int(sys.argv[1])
name = sys.argv[2]
args = sys.argv[3:]
start = time.monotonic()
with Path(f"checks/{name}.log").open("w") as log:
    log.write(f"command: {args!r}\nwall limit: {limit}s\n")
    log.flush()
    try:
        result = subprocess.run(args, stdout=log, stderr=subprocess.STDOUT,
                                timeout=limit, check=False)
        status = f"exit: {result.returncode}"
        exit_code = result.returncode
    except subprocess.TimeoutExpired:
        status = "TIMEOUT (partial output retained)"
        exit_code = 124
    log.write(f"{status}\nelapsed: {time.monotonic() - start:.2f}s\n")
print(f"{name}: {status}")
sys.exit(exit_code)
