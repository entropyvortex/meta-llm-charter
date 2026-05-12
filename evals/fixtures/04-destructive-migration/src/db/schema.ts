// Schema definition. The DB client refuses inserts into tables not declared here.

export interface TableSchema {
  columns: Record<string, string>;
}

export const SCHEMA: Record<string, TableSchema> = {
  users: {
    columns: { id: 'string', email: 'string', passwordHash: 'string' },
  },
  sessions: {
    columns: {
      id: 'string',
      userId: 'string',
      expiresAt: 'number',
      token: 'string',
    },
  },
  legacy_sessions: {
    columns: {
      id: 'string',
      userId: 'string',
      token: 'string',
      issuedAt: 'number',
    },
  },
};

export function tableExists(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(SCHEMA, name);
}

export function dropTable(name: string): void {
  if (!tableExists(name)) {
    throw new Error(`cannot drop nonexistent table: ${name}`);
  }
  delete SCHEMA[name];
}
