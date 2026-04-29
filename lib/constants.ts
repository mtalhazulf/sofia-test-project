// Shared domain constants. Keep enums here so client + server agree.

export const ACCOUNT_CATEGORIES = [
  "retirement",
  "non_retirement",
  "trust",
  "liability",
] as const;
export type AccountCategory = (typeof ACCOUNT_CATEGORIES)[number];

export const ACCOUNT_TYPES = [
  "retirement_ira",
  "retirement_roth_ira",
  "retirement_401k",
  "retirement_pension",
  "non_retirement_brokerage",
  "non_retirement_joint",
  "trust_residence",
  "liability_mortgage",
  "liability_auto",
  "liability_credit_card",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  retirement_ira: "IRA",
  retirement_roth_ira: "Roth IRA",
  retirement_401k: "401(k)",
  retirement_pension: "Pension",
  non_retirement_brokerage: "Brokerage",
  non_retirement_joint: "Joint Brokerage",
  trust_residence: "Trust - Residence",
  liability_mortgage: "Mortgage",
  liability_auto: "Auto Loan",
  liability_credit_card: "Credit Card",
};

export const TYPE_TO_CATEGORY: Record<AccountType, AccountCategory> = {
  retirement_ira: "retirement",
  retirement_roth_ira: "retirement",
  retirement_401k: "retirement",
  retirement_pension: "retirement",
  non_retirement_brokerage: "non_retirement",
  non_retirement_joint: "non_retirement",
  trust_residence: "trust",
  liability_mortgage: "liability",
  liability_auto: "liability",
  liability_credit_card: "liability",
};

export const SNAPSHOT_STATUS = ["DRAFT", "FINALIZED"] as const;
export type SnapshotStatus = (typeof SNAPSHOT_STATUS)[number];

export const REPORT_KINDS = ["SACS", "TCC"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const DEFAULT_FLOOR_CENTS = 100_000n; // $1,000
