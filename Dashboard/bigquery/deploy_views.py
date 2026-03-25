"""Deploy all CREATE OR REPLACE statements from pipeline_dashboard_v7.sql to BigQuery."""
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

BQ_CMD = (
    Path(os.environ.get("LOCALAPPDATA", ""))
    / "Google" / "Cloud SDK" / "google-cloud-sdk" / "bin" / "bq.cmd"
)
PROJECT = "data-aileron-482822-d0"
SQL_FILE = Path(__file__).parent / "pipeline_dashboard_v7.sql"


def main():
    sql = SQL_FILE.read_text(encoding="utf-8")
    stmts = re.split(r"(?=CREATE\s+OR\s+REPLACE)", sql, flags=re.IGNORECASE)
    stmts = [s.strip() for s in stmts if s.strip()]

    ok = fail = 0
    for i, stmt in enumerate(stmts):
        m = re.search(r"(VIEW|FUNCTION)\s+`[^`]+\.(\w+)`", stmt)
        name = m.group(2) if m else f"stmt_{i}"
        kind = m.group(1) if m else "STMT"

        # Write statement to temp file to avoid encoding/command-line issues
        tmp = Path(tempfile.gettempdir()) / "bq_deploy_stmt.sql"
        tmp.write_text(stmt, encoding="utf-8")

        # Use PYTHONUTF8=1 so bq's Python reads stdin as UTF-8
        env = {**os.environ, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"}
        proc = subprocess.run(
            [str(BQ_CMD), "query", "--use_legacy_sql=false", f"--project_id={PROJECT}"],
            input=stmt.encode("utf-8"),
            capture_output=True, timeout=120,
            env=env,
        )
        if proc.returncode == 0:
            ok += 1
            print(f"[{i+1}/{len(stmts)}] {kind} {name}: OK")
        else:
            fail += 1
            err = (proc.stderr.decode("utf-8", errors="replace") + proc.stdout.decode("utf-8", errors="replace")).strip()
            print(f"[{i+1}/{len(stmts)}] {kind} {name}: FAIL")
            print(f"  {err[:400]}")

    print(f"\nDone: {ok} OK, {fail} FAIL")
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()
