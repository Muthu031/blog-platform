import crypto from 'crypto';

function randomIndex(maxExclusive: number) {
  const buf = crypto.randomBytes(4);
  return buf.readUInt32BE(0) % maxExclusive;
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates a temporary password that is reasonably strong while still being
 * easy to type/read (avoids ambiguous characters like 0/O and 1/l).
 */
export function generateTemporaryPassword(length = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';

  const all = upper + lower + digits;
  const required = [
    upper[randomIndex(upper.length)],
    lower[randomIndex(lower.length)],
    digits[randomIndex(digits.length)],
  ];

  const remaining = Math.max(0, length - required.length);
  const rest = Array.from({ length: remaining }, () => all[randomIndex(all.length)]);

  return shuffle([...required, ...rest]).join('');
}

