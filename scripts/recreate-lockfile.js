const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const lockfile = path.resolve(process.cwd(), 'pnpm-lock.yaml');
const backup = path.resolve(process.cwd(), `pnpm-lock.yaml.bak-${Date.now()}`);

if (!fs.existsSync(lockfile)) {
  console.log('No lockfile found, running `pnpm install`...');
  execSync('pnpm install', { stdio: 'inherit' });
  process.exit(0);
}

console.log(`Backing up existing lockfile to ${backup} and recreating it.`);
fs.copyFileSync(lockfile, backup);
fs.unlinkSync(lockfile);

try {
  execSync('pnpm install', { stdio: 'inherit' });
  console.log('\nRecreated lockfile successfully.');
} catch (err) {
  console.error('\nFailed to recreate lockfile. Restoring the backup.');
  fs.copyFileSync(backup, lockfile);
  process.exit(1);
}
