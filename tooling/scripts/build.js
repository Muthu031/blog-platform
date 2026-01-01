const { spawnSync } = require('child_process')

console.log('Running workspace build (tsc -b + package builds)')
const res = spawnSync('pnpm', ['-w', 'run', 'build'], { stdio: 'inherit' })
if (res.status !== 0) process.exit(res.status)
