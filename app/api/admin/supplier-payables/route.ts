import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const purchases = await prisma.purchase.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        supplier: true,
      },
    });

    const rows = [];

    for (const purchase of purchases) {
      const payments = await prisma.supplierPayment.findMany({
        where: {
          purchaseId: purchase.id,
          status: "POSTED",
          reversedAt: null,
        },
      });

      const paidPaise = payments.reduce(
        (sum, payment) => sum + payment.amountPaise,
        0
      );

      const totalPaise = purchase.totalPaise;

      const outstandingPaise = Math.max(
        totalPaise - paidPaise,
        0
      );

      rows.push({
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        supplierId: purchase.supplierId,
        supplierName:
          purchase.supplier?.name ?? purchase.supplierId,
        purchaseDate: purchase.createdAt,
        totalPaise,
        paidPaise,
        outstandingPaise,
        paymentStatus:
          outstandingPaise === 0
            ? "PAID"
            : paidPaise > 0
              ? "PARTIALLY_PAID"
              : "UNPAID",
      });
    }

    return NextResponse.json({
      success: true,
      rows,
    });
  } catch (error) {
    console.error("Supplier payable error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load supplier payables.",
      },
      { status: 500 }
    );
  }
}