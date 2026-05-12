// In-memory user store + a deliberately naive query layer that simulates a
// production SQL bug we hit in a similar shape last year.

export interface User {
  id: string;
  name: string;
  email: string;
}

const USERS = new Map<string, User>([
  ['abc123', { id: 'abc123', name: 'Alice', email: 'alice@example.com' }],
  ['xyz789', { id: 'xyz789', name: 'Bob', email: 'bob@example.com' }],
  ['abc-def', { id: 'abc-def', name: 'Carol', email: 'carol@example.com' }],
  ['user_42', { id: 'user_42', name: 'Dan', email: 'dan@example.com' }],
]);

// Builds a "query" string and "executes" it against the store.
// Mimics a legacy ORM that string-interpolates without quoting bare identifiers
// when they look like simple tokens. If the value contains characters the
// pseudo-parser interprets as operators (e.g. '-'), execution throws.
export function findUserById(id: string): User | null {
  const query = buildSelect('users', id);
  return executeQuery(query);
}

function buildSelect(table: string, idValue: string): string {
  // Note: no quoting around idValue. This is the legacy behavior.
  return `SELECT * FROM ${table} WHERE id = ${idValue}`;
}

function executeQuery(query: string): User | null {
  const m = query.match(/^SELECT \* FROM (\w+) WHERE id = (.+)$/);
  if (!m) {
    throw new QueryError(`malformed query: ${query}`);
  }
  const idExpr = m[2].trim();

  // Pseudo-parser: bare alphanumeric+underscore tokens are treated as the literal id.
  // Anything containing operators is "evaluated" as an arithmetic expression, which
  // throws because identifiers can't be subtracted.
  if (/^[A-Za-z0-9_]+$/.test(idExpr)) {
    return USERS.get(idExpr) ?? null;
  }
  if (idExpr.includes('-')) {
    throw new QueryError(
      `SQL syntax error: cannot evaluate '-' between identifiers in: ${query}`
    );
  }
  return null;
}

export class QueryError extends Error {
  code = 'QUERY_FAILED';
  constructor(message: string) {
    super(message);
    this.name = 'QueryError';
  }
}
