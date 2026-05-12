import { loadOrders, loadCustomers, Order, Customer } from './data.js';

export type Section = 'orders' | 'customers';
export type Format = 'json' | 'yaml';

export interface BuildOpts {
  include?: Section[];
}

export interface Payload {
  generatedAt: string;
  counts: Partial<Record<Section, number>>;
  orders?: Order[];
  customers?: Customer[];
}

// Build the full export payload from data sources.
export function buildPayload(opts?: BuildOpts): Payload {
  const include = opts?.include ?? ['orders', 'customers'];
  const payload: Payload = {
    generatedAt: new Date(0).toISOString(), // deterministic for tests
    counts: {},
  };
  if (include.includes('orders')) {
    const orders = loadOrders();
    payload.orders = orders;
    payload.counts.orders = orders.length;
  }
  if (include.includes('customers')) {
    const customers = loadCustomers();
    payload.customers = customers;
    payload.counts.customers = customers.length;
  }
  return payload;
}

// Serialize the payload to a string in the requested format.
// Supported: 'json'. Add 'yaml' here.
export function serialize(payload: Payload, format?: Format): string {
  const fmt: Format = format ?? 'json';
  if (fmt === 'json') {
    return JSON.stringify(payload, null, 2);
  }
  if (fmt === 'yaml') {
    throw new Error('yaml format not yet implemented');
  }
  throw new Error(`unknown format: ${fmt}`);
}
