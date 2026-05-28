---
name: brain-setup
description: "Use this skill for first-time BrainBox setup. Installs the CLI, creates the API key, writes .env, and initializes the project. Invoke for: set up BrainBox, get started with BrainBox, I don't have an API key yet, initialize a BrainBox project."
tools: Bash, Read, Write
---

# brain-setup — First-Time BrainBox Setup

Use this skill when BrainBox has not been set up in the current project. Walks through installation, credentials, and project initialization in order.

---

## Step 1 — Check the CLI

```bash
brainbox --version
```

If that fails, install it:

```bash
npm install -g @brainbox-labs/cli
brainbox --version
```

---

## Step 2 — Resolve or create credentials

Check if `.env` already exists and has `BRAINBOX_API_KEY`:

```bash
grep -s BRAINBOX_API_KEY .env
```

If the key is missing, ask the user to:

1. Sign in at https://ctx.brainbox-ai.app
2. Go to **Settings → API Keys → Create key**
3. Copy the key (shown only once, starts with `bb_`)

Also ask for their **org slug** (shown in the URL after login: `ctx.brainbox-ai.app/orgs/<slug>`).

---

## Step 3 — Write `.env`

Check if `.env` exists:

```bash
ls .env 2>/dev/null && echo "exists" || echo "missing"
```

If it exists, append only the missing vars. If it doesn't exist, create it:

```
BRAINBOX_API_KEY=bb_xxxxxxxxxxxxxxxxxxxx
BRAINBOX_ORG=<org-slug>
BRAINBOX_PROJECT=<project-name>
```

`BRAINBOX_PROJECT` should be a short slug for this codebase (e.g. `analytics`, `erp-prod`). The user can choose — it will be created on the server in the next step.

Ensure `.env` is in `.gitignore`:

```bash
grep -q '^\.env$' .gitignore 2>/dev/null || echo ".env" >> .gitignore
```

---

## Step 4 — Initialize the project

If `.brainbox/` already exists, skip this step and tell the user the project is already initialized.

```bash
brainbox repo init
```

This reads `BRAINBOX_ORG` and `BRAINBOX_PROJECT` from `.env` and creates `.brainbox/config.json`.

If the project already exists on the server, clone instead:

```bash
brainbox repo clone <project-name>
```

---

## Step 5 — Verify

```bash
brainbox repo log
```

A clean output (empty history is fine) confirms credentials are valid and the project is reachable. A `401` means the API key is wrong. A `403` means the org slug doesn't match the key.

---

## Done

Tell the user:
- Setup is complete
- Next step: use `brain-learn` to ingest their first data source
- The `.env` file holds their credentials — keep it out of version control
