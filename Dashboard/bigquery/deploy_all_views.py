"""Deploy only stg_monitoramento view to BigQuery."""
import os, re, subprocess, sys, tempfile
from pathlib import Path

BQ = Path(os.environ.get("LOCALAPPDATA","")) / "Google/Cloud SDK/google-cloud-sdk/bin/bq.cmd"
SQL = Path(r"C:\Users\lucas.batista\Documents\Projetos\Dashboard\bigquery\pipeline_dashboard_v7.sql")
OUT = Path(tempfile.gettempdir()) / "deploy_stg_result.txt"

sql = SQL.read_text(encoding="utf-8")
stmts = re.split(r"(?=CREATE\s+OR\s+REPLACE)", sql, flags=re.IGNORECASE)
stmts = [s.strip() for s in stmts if s.strip()]

results = []
for i, stmt in enumerate(stmts):
    m = re.search(r"(VIEW|FUNCTION)\s+`[^`]+\.(\w+)`", stmt)
    if not m:
        results.append(f"[{i+1}] SKIP header")
        continue
    name = m.group(2)
    kind = m.group(1)
    
    # Write to temp file, read as bytes for stdin
    tmp = Path(tempfile.gettempdir()) / "bq_stmt.sql"
    tmp.write_text(stmt, encoding="utf-8")
    
    env = {**os.environ, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"}
    proc = subprocess.run(
        [str(BQ), "query", "--use_legacy_sql=false", "--project_id=data-aileron-482822-d0"],
        input=stmt.encode("utf-8"), capture_output=True, timeout=120, env=env,
    )
    rc = proc.returncode
    status = "OK" if rc == 0 else "FAIL"
    err = ""
    if rc != 0:
        err = (proc.stderr + proc.stdout).decode("utf-8", errors="replace").strip()[-300:]
    results.append(f"[{i+1}/{len(stmts)}] {kind} {name}: {status} {err}")

txt = "\n".join(results)
OUT.write_text(txt, encoding="utf-8")
print(txt)
