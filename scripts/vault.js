const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'scripts', 'vault-config.json');
const VAULT_DIR = path.join(ROOT_DIR, '.invio-vault');

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    ensureDir(dest);
    fs.readdirSync(src).forEach(child => {
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function snapshot() {
  console.log('🚀 Starting Invio Vault Snapshot...');
  
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ Config file not found at:', CONFIG_PATH);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const timestamp = getTimestamp();
  const snapshotDir = path.join(VAULT_DIR, `snapshot_${timestamp}`);
  
  ensureDir(snapshotDir);

  const manifest = {
    timestamp,
    files: [],
    dirs: []
  };

  // Copy Files
  config.criticalFiles.forEach(fileRelPath => {
    const src = path.join(ROOT_DIR, fileRelPath);
    const dest = path.join(snapshotDir, fileRelPath);
    
    if (fs.existsSync(src)) {
      ensureDir(path.dirname(dest));
      fs.copyFileSync(src, dest);
      manifest.files.push(fileRelPath);
      console.log(`✅ Vaulted file: ${fileRelPath}`);
    } else {
      console.warn(`⚠️ Warning: File not found: ${fileRelPath}`);
    }
  });

  // Copy Dirs
  config.criticalDirs.forEach(dirRelPath => {
    const src = path.join(ROOT_DIR, dirRelPath);
    const dest = path.join(snapshotDir, dirRelPath);

    if (fs.existsSync(src)) {
      copyRecursive(src, dest);
      manifest.dirs.push(dirRelPath);
      console.log(`✅ Vaulted directory: ${dirRelPath}`);
    } else {
      console.warn(`⚠️ Warning: Directory not found: ${dirRelPath}`);
    }
  });

  fs.writeFileSync(path.join(snapshotDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  
  // Update latest link (directory)
  const latestDir = path.join(VAULT_DIR, 'latest');
  if (fs.existsSync(latestDir)) {
    // On Windows, we can't easily symlink without admin, so we just copy to 'latest'
    // or just leave it for now. I'll just clear and copy to latest.
    try {
      fs.rmSync(latestDir, { recursive: true, force: true });
    } catch (e) {}
  }
  copyRecursive(snapshotDir, latestDir);

  console.log(`\n✨ Snapshot complete! Saved to: .invio-vault/snapshot_${timestamp}`);
}

async function restore() {
  console.log('🔄 Starting Invio Vault Restore...');
  
  if (!fs.existsSync(VAULT_DIR)) {
    console.error('❌ Vault directory not found.');
    return;
  }

  const snapshots = fs.readdirSync(VAULT_DIR)
    .filter(dir => dir.startsWith('snapshot_'))
    .sort()
    .reverse();

  if (snapshots.length === 0) {
    console.error('❌ No snapshots found in vault.');
    return;
  }

  console.log('\nAvailable Snapshots (Newest First):');
  snapshots.forEach((s, i) => console.log(`[${i}] ${s}`));
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const index = await new Promise(resolve => {
    readline.question('\nEnter the number of the snapshot to restore: ', resolve);
  });
  readline.close();

  const selectedSnapshot = snapshots[parseInt(index)];
  if (!selectedSnapshot) {
    console.error('❌ Invalid selection.');
    return;
  }

  const snapshotDir = path.join(VAULT_DIR, selectedSnapshot);
  console.log(`\n⏳ Restoring from: ${selectedSnapshot}...`);

  // 1. Emergency Backup of current state
  const emergencyDir = path.join(VAULT_DIR, `emergency_backup_${getTimestamp()}`);
  ensureDir(emergencyDir);
  
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  
  // Backup current
  config.criticalFiles.forEach(file => {
    const src = path.join(ROOT_DIR, file);
    if (fs.existsSync(src)) {
      const dest = path.join(emergencyDir, file);
      ensureDir(path.dirname(dest));
      fs.copyFileSync(src, dest);
    }
  });
  config.criticalDirs.forEach(dir => {
    const src = path.join(ROOT_DIR, dir);
    if (fs.existsSync(src)) {
      copyRecursive(src, path.join(emergencyDir, dir));
    }
  });
  console.log(`✅ Emergency backup created in: ${path.basename(emergencyDir)}`);

  // 2. Perform Restore
  config.criticalFiles.forEach(file => {
    const src = path.join(snapshotDir, file);
    const dest = path.join(ROOT_DIR, file);
    if (fs.existsSync(src)) {
      ensureDir(path.dirname(dest));
      fs.copyFileSync(src, dest);
      console.log(`✅ Restored: ${file}`);
    }
  });
  config.criticalDirs.forEach(dir => {
    const src = path.join(snapshotDir, dir);
    const dest = path.join(ROOT_DIR, dir);
    if (fs.existsSync(src)) {
      copyRecursive(src, dest);
      console.log(`✅ Restored directory: ${dir}`);
    }
  });

  console.log('\n✨ Restore complete! The project is back to its Golden State.');
}

const args = process.argv.slice(2);
const actionArg = args.find(a => a.startsWith('--action='));
const action = actionArg ? actionArg.split('=')[1] : null;

if (action === 'snapshot') {
  snapshot();
} else if (action === 'restore') {
  restore();
} else {
  console.log('Usage: node scripts/vault.js --action=[snapshot|restore]');
}
