import { prisma } from "@/lib/prisma";

export async function makeSupplierPaymentNumber() {
  const prefix = "SP-" + new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const last = await prisma.supplierPayment.findFirst({
    where: {
      paymentNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  let sequence = 1;

  if (last) {
    const match = last.paymentNumber.match(/-(\d+)$/);

    if (match) {
      sequence = Number(match[1]) + 1;
    }
  }

  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

export function calculatePaymentStatus(
  totalPaise: number,
  paidPaise: number
) {
  if (paidPaise <= 0) {
    return "UNPAID";
  }

  if (paidPaise >= totalPaise) {
    return "PAID";
  }

  return "PARTIALLY_PAID";
}