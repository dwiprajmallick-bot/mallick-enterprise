import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireCurrentAdminUser,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

export async function GET(request: Request) {
  const user = await requireCurrentAdminUser(request);

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    const search =
      searchParams.get("search")?.trim() || "";

    const status =
      searchParams.get("status")?.trim() || "";

    const creditNotes =
      await prisma.creditNote.findMany({
        where: {
          ...(status
            ? {
                status,
              }
            }
            : {}),
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    const salesReturnIds = [
      ...new Set(
        creditNotes.map(
          (creditNote) =>
            creditNote.salesReturnId
        )
      ),
    ];

    const orderIds = [
      ...new Set(
        creditNotes.map(
          (creditNote) =>
            creditNote.orderId
        )
      ),
    ];

    const customerIds = [
      ...new Set(
        creditNotes.map(
          (creditNote) =>
            creditNote.customerId
        )
      ),
    ];

    const [
      salesReturns,
      orders,
      customers,
    ] = await Promise.all([
      salesReturnIds.length
        ? prisma.salesReturn.findMany({
            where: {
              id: {
                in: salesReturnIds,
              },
            },
            select: {
              id: true,
              returnNumber: true,
              reason: true,
              status: true,
              refundStatus: true,
              refundAmount: true,
              createdAt: true,
            },
          })
        : [],

      orderIds.length
        ? prisma.order.findMany({
            where: {
              id: {
                in: orderIds,
              },
            },
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              orderStatus: true,
              paymentStatus: true,
            },
          })
        : [],

      customerIds.length
        ? prisma.customer.findMany({
            where: {
              id: {
                in: customerIds,
              },
            },
            select: {
              id: true,
              name: true,
              companyName: true,
              phone: true,
              gstin: true,
            },
          })
        : [],
    ]);

    const salesReturnMap = new Map(
      salesReturns.map((item) => [
        item.id,
        item,
      ])
    );

    const orderMap = new Map(
      orders.map((item) => [
        item.id,
        item,
      ])
    );

    const customerMap = new Map(
      customers.map((item) => [
        item.id,
        item,
      ])
    );

    let result = creditNotes.map(
      (creditNote) => ({
        ...creditNote,
        salesReturn:
          salesReturnMap.get(
            creditNote.salesReturnId
          ) || null,
        order:
          orderMap.get(
            creditNote.orderId
          ) || null,
        customer:
          customerMap.get(
            creditNote.customerId
          ) || null,
      })
    );

    if (search) {
      const q = search.toLowerCase();

      result = result.filter(
        (creditNote) =>
          creditNote.creditNoteNumber
            .toLowerCase()
            .includes(q) ||
          creditNote.salesReturn?.returnNumber
            ?.toLowerCase()
            .includes(q) ||
          creditNote.order?.orderNumber
            ?.toLowerCase()
            .includes(q) ||
          creditNote.customer?.name
            ?.toLowerCase()
            .includes(q) ||
          creditNote.customer?.companyName
            ?.toLowerCase()
            .includes(q) ||
          creditNote.customer?.phone
            ?.toLowerCase()
            .includes(q) ||
          creditNote.customer?.gstin
            ?.toLowerCase()
            .includes(q)
      );
    }

    const summary = result.reduce(
      (acc, creditNote) => {
        acc.count += 1;

        acc.taxablePaise +=
          creditNote.taxableAmountPaise;

        acc.gstPaise +=
          creditNote.totalGstPaise;

        acc.totalPaise +=
          creditNote.totalAmountPaise;

        return acc;
      },
      {
        count: 0,
        taxablePaise: 0,
        gstPaise: 0,
        totalPaise: 0,
      }
    );

    await writeAuditLog({
      db: prisma,
      actorUserId: user.id,
      actorRole: user.role,
      ...getRequestAuditMeta(request),
      action: "CREDIT_NOTE_LIST_VIEW",
      entityType: "CreditNote",
      entityId: null,
      description:
        "Credit Note list viewed.",
      oldValues: null,
      newValues: {
        search,
        status,
        count: result.length,
      },
      reason: "Credit Note list view",
    });

    return NextResponse.json({
      success: true,
      creditNotes: result,
      count: result.length,
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Credit Notes.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}