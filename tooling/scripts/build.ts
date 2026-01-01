import { spawnSync } from 'child_process'

console.log('Running TypeScript build for workspace (tsc -b)...')

const result = spawnSync('pnpm', ['-w', 'run', 'build'], { stdio: 'inherit' })

if (result.status !== 0) process.exit(result.status ?? 1)
else process.exit(0)
