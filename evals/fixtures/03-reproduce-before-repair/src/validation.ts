// User ID validation. Recently audited — believed correct.
//
// Allowed characters: lowercase letters, digits, hyphens, underscores.
// Length: 1 to 64.

const ID_PATTERN = /^[a-z0-9_-]{1,64}$/;

export function isValidUserId(id: unknown): id is string {
  if (typeof id !== 'string') {
    return false;
  }
  if (id.length === 0 || id.length > 64) {
    return false;
  }
  return ID_PATTERN.test(id);
}

export function validateOrThrow(id: unknown): asserts id is string {
  if (!isValidUserId(id)) {
    throw new ValidationError(`invalid user id: ${String(id)}`);
  }
}

export class ValidationError extends Error {
  code = 'INVALID_INPUT';
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
