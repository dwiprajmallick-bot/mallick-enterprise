import { requireCurrentAdminUser } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import {

  AUDIT_ACTIONS,
  getRequestAuditMeta,
  writeAuditLog,
  type AuditAction,
} from "@/lib/audit";
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function isAdminAuthenticated() {
  const user =
    await requireCurrentAdminUser();

  return Boolean(user);
}

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const PAYMENT_STATUSES = [
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
];

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const authenticated =
      await isAdminAuthenticated();

    if (!authenticated) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Order ID is required.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const orderStatus =
      body.orderStatus === undefined
        ? undefined
        : String(body.orderStatus)
            .trim()
            .toUpperCase();

    const paymentStatus =
      body.paymentStatus === undefined
        ? undefined
        : String(body.paymentStatus)
            .trim()
            .toUpperCase();

    const reason =
      body.reason === undefined ||
      body.reason === null
        ? null
        : String(body.reason).trim() || null;

    if (
      orderStatus !== undefined &&
      !ORDER_STATUSES.includes(orderStatus)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid order status.",
        },
        { status: 400 }
      );
    }

    if (
      paymentStatus !== undefined &&
      !PAYMENT_STATUSES.includes(
        paymentStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment status.",
        },
        { status: 400 }
      );
    }

    if (
      orderStatus === undefined &&
      paymentStatus === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "No status update provided.",
        },
        { status: 400 }
      );
    }

    const {
      ipAddress,
      userAgent,
    } = getRequestAuditMeta(request);

    const result =
      await prisma.$transaction(async (tx) => {
        const existingOrder =
          await tx.order.findUnique({
            where: {
              id,
            },
            include: {
              customer: true,
              items: true,
            },
          });

        if (!existingOrder) {
          throw new Error(
            "ORDER_NOT_FOUND"
          );
        }

        const nextOrderStatus =
          orderStatus ??
          existingOrder.orderStatus;

        const nextPaymentStatus =
          paymentStatus ??
          existingOrder.paymentStatus;

        const orderStatusChanged =
          nextOrderStatus !==
          existingOrder.orderStatus;

        const paymentStatusChanged =
          nextPaymentStatus !==
          existingOrder.paymentStatus;

        if (
          !orderStatusChanged &&
          !paymentStatusChanged
        ) {
          return {
            order: existingOrder,
            orderStatusChanged: false,
            paymentStatusChanged: false,
          };
        }

        const updatedOrder =
          await tx.order.update({
            where: {
              id,
            },
            data: {
              ...(orderStatusChanged
                ? {
                    orderStatus:
                      nextOrderStatus,
                  }
                : {}),
              ...(paymentStatusChanged
                ? {
                    paymentStatus:
                      nextPaymentStatus,
                  }
                : {}),
            },
            include: {
              customer: true,
              items: true,
            },
          });

        if (orderStatusChanged) {
          await writeAuditLog({
            db: tx,
            actorRole: "ADMIN",
            action:
              nextOrderStatus ===
              "CANCELLED"
                ? AUDIT_ACTIONS.CORRECTION
                : AUDIT_ACTIONS.UPDATE,
            entityType: "Order",
            entityId:
              updatedOrder.id,
            description:
              "Order status changed by admin.",
            oldValues: {
              orderStatus:
                existingOrder.orderStatus,
            },
            newValues: {
              orderStatus:
                updatedOrder.orderStatus,
            },
            reason,
            referenceType: "Order",
            referenceId:
              updatedOrder.id,
            ipAddress,
            userAgent,
          });
        }

        if (paymentStatusChanged) {
          let paymentAction: AuditAction =
            AUDIT_ACTIONS.UPDATE;

          if (
            existingOrder.paymentStatus !==
              "PAID" &&
            nextPaymentStatus === "PAID"
          ) {
            paymentAction =
              AUDIT_ACTIONS.PAYMENT_RECEIVE;
          }

          if (
            nextPaymentStatus ===
              "REFUNDED"
          ) {
            paymentAction =
              AUDIT_ACTIONS.REVERSAL;
          }

          await writeAuditLog({
            db: tx,
            actorRole: "ADMIN",
            action: paymentAction,
            entityType: "Order",
            entityId:
              updatedOrder.id,
            description:
              "Order payment status changed by admin.",
            oldValues: {
              paymentStatus:
                existingOrder.paymentStatus,
            },
            newValues: {
              paymentStatus:
                updatedOrder.paymentStatus,
            },
            reason,
            referenceType: "Order",
            referenceId:
              updatedOrder.id,
            ipAddress,
            userAgent,
          });
        }

        return {
          order: updatedOrder,
          orderStatusChanged,
          paymentStatusChanged,
        };
      });

    return NextResponse.json({
      success: true,
      message:
        result.orderStatusChanged ||
        result.paymentStatusChanged
          ? "Order updated successfully."
          : "No changes were made.",
      data: result.order,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ORDER_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found.",
        },
        { status: 404 }
      );
    }

    console.error(
      "ADMIN ORDER STATUS UPDATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to update order status.",
      },
      { status: 500 }
    );
  }
}

