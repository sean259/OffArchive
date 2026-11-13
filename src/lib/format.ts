const pesoFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

/** 1200 → "₱1,200" */
export const peso = (n: number) => pesoFormat.format(n);

/** 5 → "05" */
export const pad = (n: number, len = 2) => String(n).padStart(len, '0');

const dateFormat = new Intl.DateTimeFormat('en-PH', { day: '2-digit', month: 'short', year: 'numeric' });
/** → "08 Nov 2026" */
export const shortDate = (d: Date) => dateFormat.format(d);
