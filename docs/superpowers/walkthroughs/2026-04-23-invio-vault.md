# Invio Vault Implementation Walkthrough

The **Invio Vault** is now fully operational. It provides a local, Git-ignored safety net that allows you to capture "Golden States" of your core files and restore them instantly if a repository regression or accidental corruption occurs.

## 🛠️ Key Features

- **Automated Snapshots**: Captures critical engine files (`studio.js`, `checkout.js`, etc.) and directories (`templates/`) into timestamped folders.
- **Interactive Restoration**: Allows you to pick exactly which snapshot to roll back to via a simple command-line interface.
- **Emergency Backups**: Every time you run a restore, the system automatically creates an `emergency_backup` of your *current* files, ensuring you never lose data during a rollback.
- **Git-Ignored Storage**: All snapshots are stored in `.invio-vault/`, which is excluded from Git to keep your repository clean.

---

## 🚀 How to Use

### 1. Create a Snapshot
Whenever the project is in a "Perfect State", run:
```bash
npm run snapshot
```
*This captures all critical files defined in `scripts/vault-config.json`.*

### 2. Restore to a Previous State
If something breaks and you need to go back, run:
```bash
npm run restore
```
*You will be prompted to select a snapshot by number.*

---

## 📁 Configuration
The files protected by the vault are managed in `scripts/vault-config.json`:
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

---

## ✅ Verification Results

I have verified the system with the following tests:
1. **Snapshot Test**: Verified that `npm run snapshot` correctly creates the `.invio-vault` directory and copies all files.
2. **Restore Test**: Simulated a critical file loss (deleted `js/templates.js`), ran `npm run restore`, and confirmed the file was perfectly recovered.
3. **Emergency Backup**: Confirmed that a backup of the current state was created before the restore proceeded.

The INVIO platform is now protected against future regressions.
