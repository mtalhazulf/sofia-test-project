import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin1234", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    create: {
      email: "admin@example.com",
      name: "Maryann (Admin)",
      passwordHash,
      role: "admin",
    },
    update: { passwordHash },
  });

  // Sample client to demonstrate every account category.
  const existing = await prisma.client.findFirst({ where: { householdName: "The Sample Family" } });
  if (existing) {
    console.log("Sample client already exists; skipping insert.");
    console.log(`Admin user: admin@example.com / admin1234 (id=${admin.id})`);
    return;
  }

  const client = await prisma.client.create({
    data: {
      householdName: "The Sample Family",
      isMarried: true,
      persons: {
        create: [
          {
            spouseIndex: 1,
            firstName: "Alex",
            lastName: "Sample",
            dateOfBirth: new Date("1972-05-14"),
            ssnLast4: "1234",
          },
          {
            spouseIndex: 2,
            firstName: "Jordan",
            lastName: "Sample",
            dateOfBirth: new Date("1974-09-22"),
            ssnLast4: "5678",
          },
        ],
      },
      staticProfile: {
        create: {
          monthlyInflowCents: 1_500_000n, // $15,000
          monthlyOutflowCents: 1_000_000n, // $10,000
          insuranceDeductibles: JSON.stringify([
            { label: "Auto", amountCents: "100000" },
            { label: "Home", amountCents: "250000" },
          ]),
          floorCents: 100_000n,
        },
      },
    },
    include: { persons: true },
  });

  const s1 = client.persons.find((p) => p.spouseIndex === 1)!;
  const s2 = client.persons.find((p) => p.spouseIndex === 2)!;

  await prisma.account.createMany({
    data: [
      {
        clientId: client.id,
        ownerPersonId: s1.id,
        category: "retirement",
        type: "retirement_roth_ira",
        custodian: "Schwab",
        accountNumberLast4: "9001",
        displayLabel: "Roth IRA — Alex",
      },
      {
        clientId: client.id,
        ownerPersonId: s1.id,
        category: "retirement",
        type: "retirement_401k",
        custodian: "Fidelity",
        accountNumberLast4: "9002",
        displayLabel: "401(k) — Alex",
      },
      {
        clientId: client.id,
        ownerPersonId: s2.id,
        category: "retirement",
        type: "retirement_ira",
        custodian: "Schwab",
        accountNumberLast4: "9003",
        displayLabel: "IRA — Jordan",
      },
      {
        clientId: client.id,
        ownerPersonId: null,
        category: "non_retirement",
        type: "non_retirement_joint",
        custodian: "Schwab",
        accountNumberLast4: "9100",
        displayLabel: "Joint Brokerage",
      },
      {
        clientId: client.id,
        ownerPersonId: null,
        category: "trust",
        type: "trust_residence",
        displayLabel: "Primary Residence (Trust)",
        propertyAddress: "1 Peachtree St, Atlanta GA",
      },
      {
        clientId: client.id,
        ownerPersonId: null,
        category: "liability",
        type: "liability_mortgage",
        custodian: "Pinnacle Bank",
        accountNumberLast4: "9200",
        displayLabel: "Mortgage — Primary",
        interestRateBps: 525, // 5.25%
      },
    ],
  });

  console.log(`Seeded admin (admin@example.com / admin1234) and sample client ${client.id}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
