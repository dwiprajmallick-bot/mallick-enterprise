import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: "file:./officekart.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const customer = await prisma.customer.create({
    data: {
      name: "OfficeKart Test Customer",
      phone: "9000000000",
      email: "test@officekart.local",
      companyName: "OfficeKart Test Office",
      gstin: null,
    },
  });

  const product = await prisma.product.create({
    data: {
      name: "A4 Copy Paper",
      category: "Paper",
      purchasePrice: 180,
      sellingPrice: 220,
      unit: "ream",
      stock: 50,
      active: true,
      description: "Office use A4 copy paper",
    },
  });

  console.log("CUSTOMER CREATED:", customer.id);
  console.log("PRODUCT CREATED:", product.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
