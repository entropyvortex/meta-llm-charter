import { tableExists } from './schema.js';

type Row = Record<string, unknown>;

const tables = new Map<string, Row[]>();

export function insert<T extends Row>(table: string, row: T): T {
  if (!tableExists(table)) {
    throw new Error(`Table '${table}' does not exist`);
  }
  if (!tables.has(table)) {
    tables.set(table, []);
  }
  tables.get(table)!.push(row);
  return row;
}

export function select<T extends Row>(table: string, predicate?: (row: T) => boolean): T[] {
  if (!tableExists(table)) {
    throw new Error(`Table '${table}' does not exist`);
  }
  const rows = (tables.get(table) ?? []) as T[];
  if (!predicate) {
    return rows.slice();
  }
  return rows.filter(predicate);
}

export function _resetForTests(): void {
  tables.clear();
}
