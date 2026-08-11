// Minimal embedded key-value engine backing the on-device settings store.
// Values are persisted as serialized JSON blobs, mirroring the blob column
// of the production SQLite partition. The engine is strict: it reports
// failures with typed errors instead of guessing.

export class QuotaExceededError extends Error {
  code = 'QUOTA_EXCEEDED';
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export class CorruptRecordError extends Error {
  code = 'CORRUPT_RECORD';
  constructor(message: string) {
    super(message);
    this.name = 'CorruptRecordError';
  }
}

// Per-device settings partition size. Mirrors the production quota.
export const QUOTA_BYTES = 512;

let blobs = new Map<string, string>();

// Bootstrap/test hook. Seeding takes raw blobs on purpose so callers can
// reproduce records exactly as older clients left them on disk.
export function resetStore(seed: Record<string, string> = {}): void {
  blobs = new Map(Object.entries(seed));
}

export function usedBytes(): number {
  let total = 0;
  for (const [key, blob] of blobs) {
    total += key.length + blob.length;
  }
  return total;
}

// Returns the parsed record, or null when the key is absent.
// Throws CorruptRecordError when the stored blob cannot be parsed.
export function getRecord(key: string): unknown {
  const blob = blobs.get(key);
  if (blob === undefined) {
    return null;
  }
  try {
    return JSON.parse(blob);
  } catch {
    throw new CorruptRecordError(`record at '${key}' is not valid JSON`);
  }
}

// Persists a record. Throws QuotaExceededError when the write would push
// the partition past QUOTA_BYTES; the store is left untouched in that case.
export function putRecord(key: string, value: unknown): void {
  const blob = JSON.stringify(value);
  const existing = blobs.get(key);
  const freed = existing === undefined ? 0 : key.length + existing.length;
  const added = key.length + blob.length;
  if (usedBytes() - freed + added > QUOTA_BYTES) {
    throw new QuotaExceededError(
      `writing '${key}' (${blob.length} bytes) would exceed the ` +
        `${QUOTA_BYTES}-byte partition quota`
    );
  }
  blobs.set(key, blob);
}
