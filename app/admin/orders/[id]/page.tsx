import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  AUDIT_ACTIONS,
  getRequestAuditMeta,
  writeAuditLog,
} from "@/lib/audit";

type CartItem = {
  id: string;
  quantity: number;
};

type OrderItemCreate = {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  totalPrice: number;
}
type ReturnHistoryItem = {
  id: string;
  returnNumber: string;
  status?: string | null;
  reason?: string | null;
  totalAmount?: number;
  refundStatus?: string | null;
  refundAmount?: number;
  createdAt?: string;
};;

function generateOrderNumber() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const random = Math.floor(100000 + Math.random() * 900000);

  return `OK-${year}${month}${day}-${random}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const customerName = String(body.customerName || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();
    const companyName = String(body.companyName || "").trim();
    const gstin = String(body.gstin || "").trim();

    const shippingName = String(body.shippingName || "").trim();
    const shippingPhone = String(body.shippingPhone || "").trim();
    const shippingAddress = String(body.shippingAddress || "").trim();
    const shippingCity = String(body.shippingCity || "").trim();
    const shippingState = String(body.shippingState || "").trim();
    const shippingPincode = String(body.shippingPincode || "").trim();

    const paymentMethod = String(body.paymentMethod || "COD").trim();
    const notes = String(body.notes || "").trim();

    const cart: CartItem[] = Array.isArray(body.cart)
      ? body.cart
      : [];

    if (!customerName) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer name is required.",
        },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone number is required.",
        },
        { status: 400 }
      );
    }

    if (!shippingAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Shipping address is required.",
        },
        { status: 400 }
      );
    }

    if (!shippingCity || !shippingState || !shippingPincode) {
      return NextResponse.json(
        {
          success: false,
          message: "Complete shipping address is required.",
        },
        { status: 400 }
      );
    }

    if (cart.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Cart is empty.",
        },
        { status: 400 }
      );
    }

    for (const item of cart) {
      if (
        !item.id ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid cart item.",
          },
          { status: 400 }
        );
      }
    }

    const productIds = [...new Set(cart.map((item) => item.id))];

    const { ipAddress, userAgent } =
      getRequestAuditMeta(request);

    const order = await prisma.$transaction(async (tx) => {
      let customer = await tx.customer.findFirst({
        where: {
          phone,
        },
      });

      const customerBefore = customer
        ? {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            companyName: customer.companyName,
            gstin: customer.gstin,
          }
        : null;

      if (customer) {
        customer = await tx.customer.update({
          where: {
            id: customer.id,
          },
          data: {
            name: customerName,
            email: email || customer.email,
            companyName: companyName || customer.companyName,
            gstin: gstin || customer.gstin,
          },
        });

        const customerChanged =
          customerBefore?.name !== customer.name ||
          customerBefore?.email !== customer.email ||
          customerBefore?.companyName !== customer.companyName ||
          customerBefore?.gstin !== customer.gstin;

        if (customerChanged) {
          await writeAuditLog({
            db: tx,
            actorRole: "CUSTOMER",
            action: AUDIT_ACTIONS.UPDATE,
            entityType: "Customer",
            entityId: customer.id,
            description:
              "Customer details updated during order creation.",
            oldValues: customerBefore,
            newValues: {
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
              companyName: customer.companyName,
              gstin: customer.gstin,
            },
            reason: "Customer information synchronized from order.",
            referenceType: "Order",
            ipAddress,
            userAgent,
          });
        }
      } else {
        customer = await tx.customer.create({
          data: {
            name: customerName,
            phone,
            email: email || null,
            companyName: companyName || null,
            gstin: gstin || null,
          },
        });

        await writeAuditLog({
          db: tx,
          actorRole: "CUSTOMER",
          action: AUDIT_ACTIONS.CREATE,
          entityType: "Customer",
          entityId: customer.id,
          description:
            "Customer created during order creation.",
          newValues: {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            companyName: customer.companyName,
            gstin: customer.gstin,
          },
          referenceType: "Order",
          ipAddress,
          userAgent,
        });
      }

      const products = await tx.product.findMany({
        where: {
          id: {
            in: productIds,
          },
          active: true,
        },
      });

      if (products.length !== productIds.length) {
        throw new Error("PRODUCTS_UNAVAILABLE");
      }

      const productMap = new Map(
        products.map((product) => [product.id, product])
      );

      let subtotal = 0;

      const orderItems: OrderItemCreate[] = [];

      for (const cartItem of cart) {
        const product = productMap.get(cartItem.id);

        if (!product) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        if (cartItem.quantity > product.stock) {
          throw new Error(
            `INSUFFICIENT_STOCK:${product.name}:${product.stock}:${product.unit}`
          );
        }

        const totalPrice =
          product.sellingPrice * cartItem.quantity;

        subtotal += totalPrice;

        orderItems.push({
          productId: product.id,
          productName: product.name,
          quantity: cartItem.quantity,
          unit: product.unit,
          purchasePrice: product.purchasePrice,
          sellingPrice: product.sellingPrice,
          totalPrice,
        });
      }

      const deliveryCharge =
        subtotal >= 2000 ? 0 : 80;

      const gstAmount = Number(
        ((subtotal + deliveryCharge) * 0.18).toFixed(2)
      );

      const totalAmount = Number(
        (
          subtotal +
          deliveryCharge +
          gstAmount
        ).toFixed(2)
      );

      const orderNumber = generateOrderNumber();

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,

          subtotal,
          deliveryCharge,
          gstAmount,
          totalAmount,

          paymentStatus: "PENDING",
          orderStatus: "PENDING",
          paymentMethod,

          shippingName:
            shippingName || customerName,
          shippingPhone:
            shippingPhone || phone,
          shippingAddress,
          shippingCity,
          shippingState,
          shippingPincode,

          notes: notes || null,

          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
        },
      });

      await writeAuditLog({
        db: tx,
        actorRole: "CUSTOMER",
        action: AUDIT_ACTIONS.CREATE,
        entityType: "Order",
        entityId: createdOrder.id,
        description:
          "Customer order created successfully.",
        newValues: {
          id: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          customerId: createdOrder.customerId,
          subtotal: createdOrder.subtotal,
          deliveryCharge:
            createdOrder.deliveryCharge,
          gstAmount: createdOrder.gstAmount,
          totalAmount: createdOrder.totalAmount,
          paymentStatus:
            createdOrder.paymentStatus,
          orderStatus:
            createdOrder.orderStatus,
          paymentMethod:
            createdOrder.paymentMethod,
          items: createdOrder.items.map(
            (item) => ({
              id: item.id,
              productId: item.productId,
              quantity: item.quantity,
              unit: item.unit,
              sellingPrice: item.sellingPrice,
              totalPrice: item.totalPrice,
            })
          ),
        },
        referenceType: "Customer",
        referenceId: customer.id,
        ipAddress,
        userAgent,
      });

      await writeAuditLog({
        db: tx,
        actorRole: "CUSTOMER",
        action: AUDIT_ACTIONS.GST_CREATE,
        entityType: "Order",
        entityId: createdOrder.id,
        description:
          "GST calculated and recorded for customer order.",
        newValues: {
          taxableAmount:
            subtotal + deliveryCharge,
          gstRate: 18,
          gstAmount,
          totalAmount,
        },
        referenceType: "Order",
        referenceId: createdOrder.id,
        ipAddress,
        userAgent,
      });

      for (const cartItem of cart) {
        const product = productMap.get(cartItem.id);

        if (!product) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        const previousStock = product.stock;
        const newStock =
          previousStock - cartItem.quantity;

        const updated = await tx.product.updateMany({
          where: {
            id: product.id,
            stock: {
              gte: cartItem.quantity,
            },
          },
          data: {
            stock: {
              decrement: cartItem.quantity,
            },
          },
        });

        if (updated.count !== 1) {
          throw new Error(
            `STOCK_CHANGED:${product.name}`
          );
        }

        const movement =
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              type: "SALE",
              quantity: -cartItem.quantity,
              previousStock,
              newStock,
              note: `Order ${createdOrder.orderNumber}`,
              orderId: createdOrder.id,
            },
          });

        await writeAuditLog({
          db: tx,
          actorRole: "CUSTOMER",
          action: AUDIT_ACTIONS.STOCK_OUT,
          entityType: "Product",
          entityId: product.id,
          description:
            "Stock reduced because of customer sale.",
          oldValues: {
            stock: previousStock,
          },
          newValues: {
            stock: newStock,
          },
          reason:
            `Sale against order ${createdOrder.orderNumber}.`,
          referenceType: "StockMovement",
          referenceId: movement.id,
          ipAddress,
          userAgent,
        });

        await writeAuditLog({
          db: tx,
          actorRole: "CUSTOMER",
          action: AUDIT_ACTIONS.SALE,
          entityType: "Product",
          entityId: product.id,
          description:
            "Product sold through customer order.",
          newValues: {
            productId: product.id,
            productName: product.name,
            quantity: cartItem.quantity,
            unit: product.unit,
            sellingPrice:
              product.sellingPrice,
            totalPrice:
              product.sellingPrice *
              cartItem.quantity,
          },
          referenceType: "Order",
          referenceId: createdOrder.id,
          ipAddress,
          userAgent,
        });
      }

      return createdOrder;
    });

    return NextResponse.json({
      success: true,
      message: "Order created successfully.",
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        subtotal: order.subtotal,
        deliveryCharge: order.deliveryCharge,
        gstAmount: order.gstAmount,
        totalAmount: order.totalAmount,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        items: order.items,
      },
    });
  } catch (error) {
    console.error(
      "ORDER_CREATE_ERROR",
      error
    );

    if (error instanceof Error) {
      if (
        error.message ===
        "PRODUCTS_UNAVAILABLE"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "One or more products are unavailable.",
          },
          { status: 400 }
        );
      }

      if (
        error.message ===
        "PRODUCT_NOT_FOUND"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Product not found.",
          },
          { status: 400 }
        );
      }

      if (
        error.message.startsWith(
          "INSUFFICIENT_STOCK:"
        )
      ) {
        const parts =
          error.message.split(":");

        const productName =
          parts[1] || "Product";

        const available =
          parts[2] || "0";

        const unit =
          parts[3] || "pcs";

        return NextResponse.json(
          {
            success: false,
            message:
              `${productName} has only ${available} ${unit} available.`,
          },
          { status: 400 }
        );
      }

      if (
        error.message.startsWith(
          "STOCK_CHANGED:"
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Stock changed while creating the order. Please try again.",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to create order.",
      },
      { status: 500 }
    );
  }
}
