export function formatCurrency(amount: number | null | undefined, currency = "INR"): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatRate(rate: number | null | undefined): string {
  const value = Number(rate ?? 0);
  return `${(value * 100).toFixed(2)}%`;
}

export function toPercentInput(rate: number | null | undefined): string {
  return String(Number(rate ?? 0) * 100);
}

export function fromPercentInput(value: string): number {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed / 100;
}
