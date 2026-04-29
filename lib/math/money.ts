// Money helpers. Internal representation is BigInt cents — never floats.

const CENTS_PER_DOLLAR = 100n;

/**
 * Parse a user-entered currency string into BigInt cents.
 * Accepts "$1,234.56", "1234.5", "0", " 7 ".
 * Rejects anything with non-numeric characters beyond $ , . and whitespace.
 * More than 2 decimals is rejected to avoid silent rounding.
 */
export function toCents(input: string | number): bigint {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error("Non-finite number");
    return toCents(input.toFixed(2));
  }
  const trimmed = input.trim().replace(/[$,\s]/g, "");
  if (trimmed === "" || trimmed === "-") return 0n;
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error(`Invalid currency input: "${input}"`);
  }
  const negative = trimmed.startsWith("-");
  const body = negative ? trimmed.slice(1) : trimmed;
  const [whole, frac = ""] = body.split(".");
  const fracPadded = (frac + "00").slice(0, 2);
  const cents = BigInt(whole ?? "0") * CENTS_PER_DOLLAR + BigInt(fracPadded);
  return negative ? -cents : cents;
}

/** Convert cents to a plain "1234.56" decimal string (no formatting). */
export function fromCents(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const whole = abs / CENTS_PER_DOLLAR;
  const frac = abs % CENTS_PER_DOLLAR;
  return `${negative ? "-" : ""}${whole}.${frac.toString().padStart(2, "0")}`;
}

/** Format cents as "$1,234.56" for display. */
export function formatUSD(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const whole = (abs / CENTS_PER_DOLLAR).toString();
  const frac = (abs % CENTS_PER_DOLLAR).toString().padStart(2, "0");
  // Insert thousands separators in the integer part.
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${grouped}.${frac}`;
}

/** Sum a list of cents safely. */
export function sumCents(values: Array<bigint | null | undefined>): bigint {
  let total = 0n;
  for (const v of values) if (typeof v === "bigint") total += v;
  return total;
}
