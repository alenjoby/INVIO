# Invio Vault: Automated Snapshot & Recovery System

## Goal
The Invio Vault is a local automated backup system designed to capture "Golden States" of the INVIO project. It allows the developer to save a snapshot of working core files (Studio, Checkout, Templates) and restore them instantly if a future update or repository revert causes regressions.

## User Review Required
> [!IMPORTANT]
> The vault is stored LOCALLY in `.invio-vault`. This folder is excluded from Git to prevent repository bloat. You must not delete this folder if you want to keep your backups.

## Proposed Changes

### 1. Configuration (`scripts/vault-config.json`) [NEW]
A configuration file listing the critical files to be tracked.
- `pages/studio/studio.js`
- `pages/studio/index.html`
- `pages/checkout/checkout.js`
- `pages/checkout/checkout.css`
- `pages/checkout/index.html`
- `js/templates.js`
- `templates/` (recursive)

### 2. The Vault Script (`scripts/vault.js`) [NEW]
A Node.js script that handles the logic for both `snapshot` and `restore`.

#### `npm run snapshot`
- Creates a timestamped folder: `.invio-vault/snapshot_YYYYMMDD_HHMMSS/`
- Copies all files from the config list into the folder.
- Creates a `manifest.json` with metadata.
- Updates a `latest` pointer for easy access.

#### `npm run restore`
- Detects existing snapshots.
- (Interactive) Lists snapshots and asks for choice.
- **Safety Step**: Backs up current files to `.invio-vault/emergency_backup/` before overwriting.
- Restores files from the selected snapshot.

### 3. Project Integration (`package.json`) [MODIFY]
Add script entries:
- `"snapshot": "node scripts/vault.js --action=snapshot"`
- `"restore": "node scripts/vault.js --action=restore"`

### 4. Git Ignore (`.gitignore`) [MODIFY]
- Add `.invio-vault/` to ensure backups stay local.

## Verification Plan

### Manual Verification
1. Run `npm run snapshot` and verify the `.invio-vault` folder is created with the correct files.
2. Make a "bad" change to `studio.js`.
3. Run `npm run restore`, select the snapshot, and verify `studio.js` is back to its original state.
