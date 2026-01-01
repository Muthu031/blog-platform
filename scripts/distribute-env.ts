import fs from 'fs'
import path from 'path'

// Use working-directory based scripts folder for portability across runners
const scriptDir = path.resolve(process.cwd(), 'scripts')

type Target = 'api' | 'web'

/**
 * Parses command line arguments into a Record<string, string>
 * containing the key-value pairs from the command line arguments,
 * a Record<string, string> containing the key-value pairs from
 * the command line arguments, and a string path to a vars
 * file (if provided).
 *
 * The function parses the command line arguments as follows:
 * - If an argument starts with '--', it is considered a flag.
 *   If the flag is 'vars-file', the value is expected to be a
 *   string path to a vars file. If the flag is 'vars', the
 *   value is expected to be a comma-separated list of key-value
 *   pairs, where each pair is in the format 'key=value'. If
 *   the flag is not recognized, the value is added to the
 *   'args' record.
 * - If an argument does not start with '--', it is considered a
 *   key-value pair in the format 'key=value'. The value is
 *   optional, and if not provided, the key is added to the
 *   'args' record with a value of 'true'.
 *
 * @returns { args: Record<string, string>, vars: Record<string, string>, varsFile: string | undefined }
 */
function parseArgs() {
  const args = process.argv.slice(2)
  const res: Record<string, string> = {}
  const vars: Record<string, string> = {}
  let varsFile: string | undefined

  for (const a of args) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=')
      if (k === 'vars-file') {
        varsFile = v
      } else if (k === 'vars') {
        // comma-separated key=value pairs
        (v || '').split(',').forEach((pair) => {
          const [kk, vv] = pair.split('=')
          if (kk) vars[kk] = vv ?? ''
        })
      } else {
        res[k] = v ?? 'true'
      }
    }
  }

  return { args: res, vars, varsFile }
}

/**
 * Reads a file at the given path and returns a Record<string, string>
 * containing the key-value pairs from the file, where each line is
 * expected to be in the format "key=value". If a line is
 * empty, starts with '#', or does not contain an '=', it is
 * ignored. If the file does not exist, an empty object is
 * returned.
 * @param {string} p - the path to the file to read
 * @returns {Record<string, string>} - the key-value pairs from the file
 */
function readEnvFile(p: string) {
  if (!fs.existsSync(p)) return {}
  const content = fs.readFileSync(p, 'utf-8')
  const out: Record<string, string> = {}
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const [k, ...rest] = trimmed.split('=')
    out[k] = rest.join('=')
  })
  return out
}

function readTemplate(env: string, target: Target) {
  const envFile = path.resolve(scriptDir, 'envs', `${env}.${target}.env`)
  const fallback = path.resolve(scriptDir, 'envs', `${target}.env`)

  if (fs.existsSync(envFile)) return fs.readFileSync(envFile, 'utf-8')
  if (fs.existsSync(fallback)) return fs.readFileSync(fallback, 'utf-8')
  return null
}

function interpolate(content: string, vars: Record<string, string | undefined>, failMissing = false) {
  const missing: string[] = []
  const result = content.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    const val = Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : process.env[key]
    if (val != null) return val
    missing.push(key)
    return ''
  })

  if (failMissing && missing.length) {
    throw new Error(`Missing variables for placeholders: ${missing.join(', ')}`)
  }

  if (!failMissing && missing.length) {
    missing.forEach((k) => console.warn(`Warning: no value provided for placeholder {{${k}}}`))
  }

  return result
}

function writeTargetEnv(target: Target, env: string, content: string) {
  if (target === 'api') {
    const dest = path.resolve(scriptDir, '..', 'apps', 'api', '.env')
    fs.writeFileSync(dest, content)
    console.log(`Wrote ${path.relative(process.cwd(), dest)}`)
  } else if (target === 'web') {
    // For Vite, use .env.<mode> (e.g., .env.development or .env.production)
    const dest = path.resolve(scriptDir, '..', 'apps', 'web', `.env.${env}`)
    fs.writeFileSync(dest, content)
    console.log(`Wrote ${path.relative(process.cwd(), dest)}`)
  }
}

async function main() {
  const parsed = parseArgs()
  const args = parsed.args
  const cliVars = parsed.vars
  const varsFile = parsed.varsFile

  const env = (args.env as string) || 'development'
  const targetsArg = (args.targets as string) || 'all'
  const targets: Target[] = targetsArg === 'all' ? ['api', 'web'] : (targetsArg.split(',') as Target[])

  // load vars from vars-file (.env style)
  const fileVars = varsFile ? readEnvFile(path.resolve(process.cwd(), varsFile)) : {}

  // merge sources: CLI vars > file vars > process.env (process.env is checked at interpolation time)
  const mergedVars: Record<string, string | undefined> = { ...fileVars, ...cliVars }
  const failMissing = args['fail-missing'] === 'true'

  for (const t of targets) {
    const template = readTemplate(env, t)
    if (!template) {
      console.warn(`No template found for ${t} (${env}). Skipping.`)
      continue
    }
    const content = interpolate(template, mergedVars, failMissing)
    writeTargetEnv(t, env, content)
  }

  console.log('Done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
