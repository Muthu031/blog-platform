#!/usr/bin/env node
const { spawn } = require('child_process');
const readline = require('readline');

/*
 * scripts/prefix.js
 * -----------------
 * Small wrapper that runs a command and prefixes each output line with
 * a colored label indicating the process `NAME` and a severity `LEVEL`.
 * It detects `error`, `warn` and `info` keywords to tag lines.
 *
 * Usage:
 *   node ./scripts/prefix.js NAME <command> [args...]
 *
 * Example (used in this repo):
 *   node ./scripts/prefix.js BACKEND npm --prefix backend run dev
 *
 * This is intended to be used with `concurrently --raw` so the wrapper
 * controls the prefixes and colors instead of concurrently's numeric tags.
 *
 * Signal handling:
 * - Forwards `SIGINT`, `SIGTERM`, and `SIGHUP` to the child so Ctrl+C
 *   in the terminal cleanly stops the child process instead of killing
 *   only the wrapper.
 */


function color(text, code) {
  return `\u001b[${code}m${text}\u001b[0m`;
}

function getNameColored(name) {
  if (name === 'BACKEND') return color(name, '1;34');
  if (name === 'FRONTEND') return color(name, '1;32');
  return color(name, '1;37');
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node scripts/prefix.js NAME COMMAND [ARGS...]');
  process.exit(1);
}

const name = args[0];
const command = args.slice(1).join(' ');

const child = spawn(command, { shell: true, env: process.env });

let forwardedSignal = null;

function forwardSignal(sig) {
  if (forwardedSignal) return;
  forwardedSignal = sig;
  try {
    child.kill(sig);
    const msg = `[${getNameColored(name)}][FORWARD] forwarded ${sig}`;
    process.stdout.write(color(msg, '2;37') + '\n');
  } catch (e) {
    // ignore
  }
}

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));
process.on('SIGHUP', () => forwardSignal('SIGHUP'));

function handleStream(stream) {
  const rl = readline.createInterface({ input: stream });
  rl.on('line', line => {
    const isError = /\b(error|err)\b/i.test(line);
    const isWarn = /\b(warn|warning)\b/i.test(line);
    const isInfo = /\b(info)\b/i.test(line);

    let level = 'LOG';
    let levelColored = 'LOG';
    let lineColored = line;

    if (isError) {
      level = 'ERROR';
      levelColored = color(level, '1;31');
      lineColored = color(line, '31');
    } else if (isWarn) {
      level = 'WARN';
      levelColored = color(level, '1;33');
      lineColored = color(line, '33');
    } else if (isInfo) {
      level = 'INFO';
      levelColored = color(level, '36');
      lineColored = color(line, '36');
    } else {
      levelColored = color(level, '37');
    }

    const nameColored = getNameColored(name);
    const out = `[${nameColored}][${levelColored}] ${lineColored}`;
    process.stdout.write(out + '\n');
  });
}

handleStream(child.stdout);
handleStream(child.stderr);

// Use 'close' so we wait for stdio to be drained. Exit with child's code.
child.on('close', (code, signal) => {
  const nameColored = getNameColored(name);
  const msg = `[${nameColored}][EXIT] Process exited with code ${code}${signal ? ' signal ' + signal : ''}`;
  process.stdout.write(color(msg, '2;37') + '\n');
  // If we forwarded a signal, keep that behavior and exit accordingly.
  if (forwardedSignal) {
    process.exit(code == null ? 0 : code);
  }
  process.exit(code == null ? 0 : code);
});
