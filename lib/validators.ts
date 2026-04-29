import { z } from "zod";
import { ACCOUNT_CATEGORIES, ACCOUNT_TYPES, TYPE_TO_CATEGORY } from "@/lib/constants";
import { toCents } from "@/lib/math/money";

// Coerce a string from a form input into BigInt cents. Stays a string in flight
// because BigInt has no JSON literal representation; converted server-side.
export const moneyString = z
  .string()
  .min(1, "Required")
  .refine((s) => {
    try {
      toCents(s);
      return true;
    } catch {
      return false;
    }
  }, "Invalid currency value");

export const ssnLast4 = z
  .string()
  .regex(/^\d{4}$/, "Must be exactly 4 digits");

export const personSchema = z.object({
  spouseIndex: z.union([z.literal(1), z.literal(2)]),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  dateOfBirth: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date"),
  ssnLast4,
});

export const deductibleSchema = z.object({
  label: z.string().min(1).max(40),
  amountCents: z.string().min(1), // serialized BigInt
});

export const accountInputSchema = z
  .object({
    type: z.enum(ACCOUNT_TYPES),
    custodian: z.string().max(80).optional().nullable(),
    accountNumberLast4: z.string().regex(/^\d{0,4}$/).optional().nullable(),
    displayLabel: z.string().min(1).max(120),
    ownerSpouseIndex: z.union([z.literal(1), z.literal(2), z.literal(0)]).optional(), // 0 = joint
    interestRateBps: z.coerce.number().int().min(0).max(50000).optional().nullable(),
    propertyAddress: z.string().max(200).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    const cat = TYPE_TO_CATEGORY[val.type];
    if (cat === "liability" && (val.interestRateBps == null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["interestRateBps"],
        message: "Interest rate required for liability accounts",
      });
    }
    if (val.type === "trust_residence" && !val.propertyAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["propertyAddress"],
        message: "Property address required for trust residence",
      });
    }
  });

export const createClientSchema = z
  .object({
    householdName: z.string().min(1).max(120),
    isMarried: z.boolean(),
    persons: z.array(personSchema).min(1).max(2),
    monthlyInflow: moneyString,
    monthlyOutflow: moneyString,
    floor: moneyString.optional(),
    insuranceDeductibles: z.array(deductibleSchema).default([]),
    accounts: z.array(accountInputSchema).default([]),
  })
  .superRefine((val, ctx) => {
    if (val.isMarried && val.persons.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["persons"],
        message: "Married households must have two persons",
      });
    }
    if (!val.isMarried && val.persons.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["persons"],
        message: "Single households must have exactly one person",
      });
    }
    const indices = val.persons.map((p) => p.spouseIndex).sort();
    if (indices.length === 2 && (indices[0] !== 1 || indices[1] !== 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["persons"],
        message: "Persons must be spouseIndex 1 and 2",
      });
    }
  });
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const createSnapshotSchema = z.object({
  clientId: z.string().min(1),
  meetingDate: z.string().refine((s) => !Number.isNaN(Date.parse(s))),
  fiscalYear: z.coerce.number().int().min(2000).max(2100),
  fiscalQuarter: z.coerce.number().int().min(1).max(4),
});
export type CreateSnapshotInput = z.infer<typeof createSnapshotSchema>;

export const updateSnapshotSchema = z.object({
  inflow: moneyString,
  outflow: moneyString,
  privateReserveBalance: moneyString,
  schwabInvestmentBalance: moneyString.optional(),
  balances: z
    .array(
      z.object({
        accountId: z.string().min(1),
        balance: moneyString,
        cashBalance: moneyString.optional(),
      }),
    )
    .default([]),
  trustValues: z
    .array(
      z.object({
        accountId: z.string().min(1),
        zillowValue: moneyString,
      }),
    )
    .default([]),
});
export type UpdateSnapshotInput = z.infer<typeof updateSnapshotSchema>;
