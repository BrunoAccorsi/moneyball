const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatCad(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(cents));
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  const grouped = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${grouped}.${remainder.toString().padStart(2, "0")}`;
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  const monthIndex = Number(month) - 1;
  return `${MONTHS_SHORT[monthIndex] ?? month} ${Number(day)}, ${year}`;
}

export function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  return `${MONTHS[Number(m) - 1] ?? month} ${year}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const index = year * 12 + (m - 1) + delta;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return `${nextYear}-${nextMonth.toString().padStart(2, "0")}`;
}

export function dollarsToCents(value: string): number {
  const cleaned = value.trim().replace(/[$,\s]/g, "");
  if (!cleaned) {
    throw new Error("Amount is empty");
  }
  const negative = cleaned.startsWith("-") || cleaned.startsWith("(");
  const unsigned = cleaned.replace(/^-/, "").replace(/[()]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(unsigned)) {
    throw new Error(`Cannot read amount "${value}"`);
  }
  const [whole, frac = ""] = unsigned.split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  return negative ? -cents : cents;
}

export function collapseSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
