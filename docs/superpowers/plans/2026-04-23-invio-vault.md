# Invio Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a local automated backup and restore system for INVIO core files.

**Architecture:** A Node.js utility script that uses a JSON config to identify files, copy them into timestamped snapshot folders, and provide a recovery mechanism.

**Tech Stack:** Node.js (fs, path, readline).

---

### Task 1: Foundation and Configuration

**Files:**
- Create: `scripts/vault-config.json`
- Modify: `.gitignore`
- Modify: `package.json`

- [ ] **Step 1: Create the config file**
Create `scripts/vault-config.json` with the following content:
```json
{
  "criticalFiles": [
    "pages/studio/studio.js",
    "pages/studio/index.html",
    "pages/checkout/checkout.js",
    "pages/checkout/checkout.css",
    "pages/checkout/index.html",
    "js/templates.js"
  ],
  "criticalDirs": [
    "templates"
  ]
}
```

- [ ] **Step 2: Update .gitignore**
Add `.invio-vault/` to the end of `.gitignore`.

- [ ] **Step 3: Add npm scripts**
Modify `package.json` to add:
```json
"scripts": {
  "snapshot": "node scripts/vault.js --action=snapshot",
  "restore": "node scripts/vault.js --action=restore"
}
```

- [ ] **Step 4: Commit foundation**
```bash
git add scripts/vault-config.json .gitignore package.json
git commit -m "feat: add vault foundation and scripts"
```

---

### Task 2: Implement Snapshot Logic

**Files:**
- Create: `scripts/vault.js`

- [ ] **Step 1: Scaffolding and Snapshot function**
Implement the basic Node.js script structure with the `snapshot` function that copies files.

- [ ] **Step 2: Run snapshot**
Run: `npm run snapshot`
Expected: Folder `.invio-vault/snapshot_<timestamp>` exists with all critical files copied.

- [ ] **Step 3: Commit snapshot logic**
```bash
git add scripts/vault.js
git commit -m "feat: implement vault snapshot logic"
```

---

### Task 3: Implement Restore Logic

**Files:**
- Modify: `scripts/vault.js`

- [ ] **Step 1: Implement Restore function**
Add interactive selection of snapshots and the file copying logic.

- [ ] **Step 2: Run restore test**
1. Run `npm run snapshot`.
2. Delete `js/templates.js`.
3. Run `npm run restore`, select the snapshot.
Expected: `js/templates.js` is restored.

- [ ] **Step 3: Commit restore logic**
```bash
git add scripts/vault.js
git commit -m "feat: implement vault restore logic"
```
