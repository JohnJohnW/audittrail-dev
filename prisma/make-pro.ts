import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    include: { subscription: true },
  });
  console.log(
    "Orgs found:",
    orgs.map((o) => ({ id: o.id, name: o.name, plan: o.subscription?.plan }))
  );

  for (const org of orgs) {
    if (org.subscription) {
      const updated = await prisma.subscription.update({
        where: { orgId: org.id },
        data: {
          plan: "pro",
          status: "active",
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
      console.log(`✓ Updated "${org.name}" → plan: ${updated.plan}, status: ${updated.status}`);
    } else {
      const created = await prisma.subscription.create({
        data: {
          orgId: org.id,
          plan: "pro",
          status: "active",
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
      console.log(`✓ Created pro subscription for "${org.name}" → id: ${created.id}`);
    }
  }
  console.log("Done - all orgs set to pro");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
