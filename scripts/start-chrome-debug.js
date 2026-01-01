const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const url = process.argv[2] || 'http://localhost:8080';
const remotePort = process.argv[3] || '9222';
const userDataDir = path.join(os.tmpdir(), 'chrome-debug-profile');

function candidates() {
  const platform = process.platform;
  if (platform === 'win32') {
    return [
      process.env.PROGRAMFILES + '\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
      process.env['PROGRAMFILES(X86)'] + '\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
    ].filter(Boolean);
  }
  if (platform === 'darwin') {
    return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  }
  // linux
  return ['google-chrome', 'chrome', 'chromium', 'chromium-browser'];
}

function trySpawn(cmd, args) {
  try {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    child.unref();
    console.log('Launched Chrome with remote debugging on port', remotePort);
    return true;
  } catch (e) {
    return false;
  }
}

(async () => {
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  const args = [`--remote-debugging-port=${remotePort}`, `--user-data-dir=${userDataDir}`, url];
  for (const c of candidates()) {
    if (trySpawn(c, args)) return;
  }

  console.log('Could not automatically launch Chrome. Run the following command manually:');
  if (process.platform === 'win32') {
    console.log(`"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=${remotePort} --user-data-dir="${userDataDir}" ${url}`);
  } else {
    console.log(`google-chrome --remote-debugging-port=${remotePort} --user-data-dir="${userDataDir}" ${url}`);
  }
})();
