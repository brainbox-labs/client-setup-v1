---
name: brain-status
description: "Use this skill to get a quick health snapshot of the current BrainBox project — active layer version, tool count, local commits, dev server state, and any in-progress context drafts. Invoke for: brain status, is BrainBox set up?, what version is active?, is the dev server running?, quick check before I start."
tools: Bash, Read
---

# brain-status — Health Snapshot

Runs a quick read-only check of the current BrainBox project. Use this before any other skill to confirm the environment is ready.

---

## Check order

Run these in sequence. Stop and report the first failure — don't continue past a broken step.

### 1. CLI installed

```bash
brainbox --version
```

Fail: direct the user to `brain-setup`.

### 2. Project initialized

```bash
cat .brainbox/config.json
```

Shows org, project, and API URL. Fail (file missing): direct the user to `brain-setup` or `brainbox repo init`.

### 3. Connectivity + local history

```bash
brainbox repo log
```

Prints local commits and remote version history. A `401`/`403` means a credentials problem — check `.env`. An empty log is fine for a new project.

### 4. Dev server

```bash
cat .brainbox/dev.pid 2>/dev/null && echo "running (PID $(cat .brainbox/dev.pid))" || echo "not running"
```

Not running is fine unless the user is about to run a workflow — note it but don't treat it as a failure.

### 5. Active layer (optional, only if connectivity succeeded)

```bash
LAYER_FILE=$(mktemp /tmp/brainbox-layer-XXXXXX.json)
brainbox repo pull --out "$LAYER_FILE" 2>&1 && \
  F="$LAYER_FILE" node -e "const l=require(process.env.F); console.log('version:', l.version, '| tools:', (l.tools||[]).length)" 2>/dev/null || \
  echo "no active layer"
rm -f "$LAYER_FILE"
```

Reports the active layer version and tool count. "No active layer" means `brain-learn` hasn't been run yet, or no draft has been approved.

### 6. Pending draft (optional, only if connectivity succeeded)

```bash
brainbox repo meta status
```

Reports whether a context draft is `processing`, `ready`, or `failed`. Skip if `repo log` showed no in-progress context. A `processing` draft means generation is still running — poll again in a minute. A `failed` draft means the LLM run errored — rerun `brainbox repo meta create`.

---

## Output to show the user

Summarize in a short table:

```
CLI             ✓ v0.3.1
Project         acme / analytics
Connectivity    ✓ (3 remote versions)
Dev server      not running
Active layer    v3 — 12 tools
```

If anything is broken, tell the user which skill fixes it:

| Problem | Fix |
|---|---|
| CLI missing | `brain-setup` |
| No `.brainbox/` | `brain-setup` |
| `401` / `403` | Check `.env`, or `brain-setup` |
| No active layer | `brain-learn` to ingest and approve |
| Dev server not running | `brain-workflow` starts it on demand |
