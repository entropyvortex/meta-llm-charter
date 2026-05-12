// Fake data source for the export CLI.
// In production this is backed by a database query; here it's static.

export interface OrderItem {
  sku: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  customer: string;
  total: number;
  currency: string;
  items: OrderItem[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  orders: number;
}

export function loadOrders(): Order[] {
  return [
    {
      id: 'ord-001',
      customer: 'Alice',
      total: 129.5,
      currency: 'USD',
      items: [
        { sku: 'A1', qty: 2, price: 49.5 },
        { sku: 'B7', qty: 1, price: 30.5 },
      ],
    },
    {
      id: 'ord-002',
      customer: 'Bob',
      total: 89.0,
      currency: 'EUR',
      items: [{ sku: 'C3', qty: 1, price: 89.0 }],
    },
    {
      id: 'ord-003',
      customer: 'Carol',
      total: 1500,
      currency: 'JPY',
      items: [{ sku: 'D9', qty: 3, price: 500 }],
    },
  ];
}

export function loadCustomers(): Customer[] {
  return [
    { id: 'cus-1', name: 'Alice', email: 'alice@example.com', orders: 12 },
    { id: 'cus-2', name: 'Bob', email: 'bob@example.com', orders: 4 },
    { id: 'cus-3', name: 'Carol', email: 'carol@example.com', orders: 27 },
  ];
}
