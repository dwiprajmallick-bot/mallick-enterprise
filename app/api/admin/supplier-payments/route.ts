import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeSupplierPaymentNumber } from "@/lib/supplier-payment";

export async function GET(request: NextRequest) {
  try {
    const supplierId =
      request.nextUrl.searchParams.get("supplierId");

    const purchaseId =
      request.nextUrl.searchParams.get("purchaseId");

    const status =
      request.nextUrl.searchParams.get("status");

    const payments = await prisma.supplierPayment.findMany({
      where: {
        ...(supplierId ? { supplierId } : {}),
        ...(purchaseId ? { purchaseId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load supplier payments.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const supplierId = String(body.supplierId ?? "").trim();
    const purchaseId =
      body.purchaseId
        ? String(body.purchaseId).trim()
        : null;

    const amountPaise = Number(body.amountPaise);
    const paymentMethod =
      String(body.paymentMethod ?? "").trim();

    const transactionReference =
      body.transactionReference
        ? String(body.transactionReference).trim()
        : null;

    const notes =
      body.notes
        ? String(body.notes).trim()
        : null;

    const paymentDate = body.paymentDate
      ? new Date(body.paymentDate)
      : new Date();

    if (!supplierId) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier is required.",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment amount must be greater than zero.",
        },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment method is required.",
        },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.findUnique({
      where: {
        id: supplierId,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier not found.",
        },
        { status: 404 }
      );
    }

    let purchase = null;

    if (purchaseId) {
      purchase = await prisma.purchase.findUnique({
        where: {
          id: purchaseId,
        },
      });

      if (!purchase) {
        return NextResponse.json(
          {
            success: false,
            error: "Purchase not found.",
          },
          { status: 404 }
        );
      }

      if (purchase.supplierId !== supplierId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Selected purchase does not belong to the selected supplier.",
          },
          { status: 400 }
        );
      }

      const postedPayments =
        await prisma.supplierPayment.findMany({
          where: {
            purchaseId,
            status: "POSTED",
            reversedAt: null,
          },
        });

      const alreadyPaid = postedPayments.reduce(
        (sum, payment) =>
          sum + payment.amountPaise,
        0
      );

      const outstanding =
        purchase.totalPaise - alreadyPaid;

      if (amountPaise > outstanding) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Overpayment blocked. Payment exceeds purchase outstanding.",
            outstandingPaise: Math.max(
              outstanding,
              0
            ),
          },
          { status: 400 }
        );
      }
    }

    const paymentNumber =
      await makeSupplierPaymentNumber();

    const payment =
      await prisma.supplierPayment.create({
        data: {
          paymentNumber,
          supplierId,
          purchaseId,
          amountPaise,
          paymentMethod,
          transactionReference,
          paymentDate,
          status: "DRAFT",
          notes,
        },
      });

    if (purchaseId) {
      await prisma.supplierPaymentAllocation.create({
        data: {
          supplierPaymentId: payment.id,
          purchaseId,
          amountPaise,
        },
      });
    }

    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error(
      "Create supplier payment error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create supplier payment.",
      },
      { status: 500 }
    );
  }
}