// Demo mode data — exactly matching the original project

export const DEMO_USER = {
  id: 0,
  name: 'דמו',
  email: 'demo@mandeles.co.il',
  phone: '+972500000000',
  balance: 500,
  provider: 'demo',
};

export const DEMO_SETS = Array.from({ length: 200 }, (_, i) => {
  const pool = Array.from({ length: 37 }, (_, j) => j + 1);
  // deterministic shuffle based on index
  let seed = i * 1234567 + 891011;
  const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
  for (let j = pool.length - 1; j > 0; j--) { const k = Math.floor(rand() * (j + 1)); [pool[j], pool[k]] = [pool[k], pool[j]]; }
  const nums = pool.slice(0, 6).sort((a, b) => a - b);
  return {
    set_index: i + 1,
    n1: nums[0], n2: nums[1], n3: nums[2],
    n4: nums[3], n5: nums[4], n6: nums[5],
    strong: (i % 7) + 1,
    draw_date: new Date().toISOString().slice(0, 10),
  };
});

export const DEMO_TRANSACTIONS = [
  { id: 1, type: 'deposit', description: 'טעינת דמו', amountIls: 500, amount_ils: 500, createdAt: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 2, type: 'charge', description: 'מנוי חודשי', amountIls: -50, amount_ils: -50, createdAt: new Date().toISOString(), created_at: new Date().toISOString() },
];

export const DEMO_ORDERS = [
  {
    id: 1,
    orderNumber: 'DEMO-001',
    tablesCount: 3,
    totalIls: 22.5,
    status: 'completed',
    drawDate: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    sets: [
      { set_index: 1, nums: [3, 7, 12, 25, 33, 36], strong: 5, display: '3 7 12 25 33 36 | 5' },
      { set_index: 2, nums: [1, 8, 14, 20, 29, 37], strong: 3, display: '1 8 14 20 29 37 | 3' },
      { set_index: 3, nums: [5, 11, 18, 22, 30, 35], strong: 7, display: '5 11 18 22 30 35 | 7' },
    ],
    isDouble: false,
    lotteryId: null,
    hasScan: true,
    hasInvoice: true,
    invoiceDocNumber: 'DEMO-1001',
    invoicePdfLink: '',
    invoiceIssuedAt: new Date().toISOString(),
    printedAt: new Date().toISOString(),
    scannedAt: new Date().toISOString(),
  },
];

export const DEMO_ORDER = {
  order_number: 'DEMO-001',
  customer_name: 'חשבון דמו',
  draw_date: new Date().toISOString().slice(0, 10),
  sets: DEMO_SETS,
  total_ils: '500.00',
  status: 'paid',
};

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('demo_mode') === '1';
}

export function getDemoToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token') || localStorage.getItem('fb_token');
}