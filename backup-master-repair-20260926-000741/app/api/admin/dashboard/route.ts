import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireCurrentAdminUser } from "@/lib/admin-auth";
import {
  AUDIT_ACTIONS,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

export async function GET(request: Request) {
  const adminUser =
    await requireCurrentAdminUser();

  if (!adminUser) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    const [
      totalProducts,
      activeProducts,
      totalCustomers,
      totalOrders,
      pendingOrders,
      totalQuotes,
      newQuotes,
      salesData,
      profitData,
    ] = await Promise.all([
      prisma.product.count(),

      prisma.product.count({
        where: {
          active: true,
        },
      }),

      prisma.customer.count(),

      prisma.order.count(),

      prisma.order.count({
        where: {
          orderStatus: "PENDING",
        },
      }),

      prisma.quoteRequest.count(),

      prisma.quoteRequest.count({
        where: {
          status: "NEW",
        },
      }),

      prisma.order.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          paymentStatus: {
            in: ["PAID", "CONFIRMED"],
          },
        },
      }),

      prisma.orderItem.findMany({
        select: {
          quantity: true,
          purchasePrice: true,
          sellingPrice: true,
        },
      }),
    ]);

    const totalSales = salesData._sum.totalAmount || 0;

    const totalProfit = profitData.reduce(
      (sum, item) =>
        sum +
        (item.sellingPrice - item.purchasePrice) * item.quantity,
      0
    );

    const meta = getRequestAuditMeta(request);

    await writeAuditLog({
      ...meta,
      actorRole: "ADMIN",
      action: AUDIT_ACTIONS.VIEW,
      entityType: "Dashboard",
      description: "Viewed admin dashboard.",
      newValues: {
        totalProducts,
        activeProducts,
        totalCustomers,
        totalOrders,
        pendingOrders,
        totalQuotes,
        newQuotes,
        totalSales,
        totalProfit,
      },
      referenceType: "Dashboard",
      referenceId: "admin",
    });

    return NextResponse.json({
      success: true,
      data: {
        products: {
          total: totalProducts,
          active: activeProducts,
        },
        customers: {
          total: totalCustomers,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
        },
        quotes: {
          total: totalQuotes,
          new: newQuotes,
        },
        finance: {
          totalSales,
          totalProfit,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load dashboard data.",
      },
      { status: 500 }
    );
  }
}