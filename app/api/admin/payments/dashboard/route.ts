import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ColumnInfo = {
  name: string;
};

async function getColumns(tableName: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<ColumnInfo[]>(
    `PRAGMA table_info("${tableName}")`
  );

  return new Set(rows.map((row) => row.name));
}

function pick(
  row: Record<string, unknown>,
  columns: Set<string>,
  names: string[]
) {
  for (const name of names) {
    if (columns.has(name)) {
      return row[name];
    }
  }

  return null;
}

function numberValue(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    return Number(value) || 0;
  }

  return 0;
}

function upper(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function classifyPaymentType(
  row: Record<string, unknown>,
  columns: Set<string>
): string {
  const value = upper(
    pick(row, columns, [
      "type",
      "paymentType",
      "direction",
      "transactionType",
    ])
  );

  if (
    value.includes("REFUND") ||
    value.includes("RETURN")
  ) {
    return "REFUND";
  }

  if (
    value.includes("SUPPLIER") ||
    value.includes("PAYABLE") ||
    value === "PAY" ||
    value === "PAYMENT_OUT"
  ) {
    return "SUPPLIER_PAY";
  }

  return "CUSTOMER_RECEIVE";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const search =
      (url.searchParams.get("search") || "").trim().toLowerCase();

    const status =
      (url.searchParams.get("status") || "")
        .trim()
        .toUpperCase();

    const type =
      (url.searchParams.get("type") || "ALL")
        .trim()
        .toUpperCase();

    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const paymentColumns = await getColumns("Payment");
    const supplierPaymentColumns =
      await getColumns("SupplierPayment");

    const paymentRows =
      paymentColumns.size > 0
        ? await prisma.$queryRawUnsafe<
            Record<string, unknown>[]
          >(
            `SELECT * FROM "Payment" ORDER BY rowid DESC LIMIT 1000`
          )
        : [];

    const supplierPaymentRows =
      supplierPaymentColumns.size > 0
        ? await prisma.$queryRawUnsafe<
            Record<string, unknown>[]
          >(
            `SELECT * FROM "SupplierPayment" ORDER BY rowid DESC LIMIT 1000`
          )
        : [];

    const records: Array<Record<string, unknown>> = [];

    for (const row of paymentRows) {
      const date = pick(row, paymentColumns, [
        "paymentDate",
        "receivedAt",
        "createdAt",
        "date",
      ]);

      const rowStatus = upper(
        pick(row, paymentColumns, [
          "status",
          "paymentStatus",
        ])
      );

      const amountPaise = numberValue(
        pick(row, paymentColumns, [
          "amountPaise",
          "totalPaise",
          "paidPaise",
          "amount",
        ])
      );

      const reference = String(
        pick(row, paymentColumns, [
          "transactionReference",
          "reference",
          "referenceNumber",
          "paymentNumber",
        ]) ?? ""
      );

      const id = String(
        pick(row, paymentColumns, ["id"]) ?? ""
      );

      const paymentType =
        classifyPaymentType(row, paymentColumns);

      records.push({
        id,
        source: "PAYMENT",
        type: paymentType,
        status: rowStatus || "UNKNOWN",
        amountPaise,
        reference,
        date,
        party: String(
          pick(row, paymentColumns, [
            "customerName",
            "supplierName",
            "partyName",
          ]) ?? ""
        ),
        customerId: pick(row, paymentColumns, [
          "customerId",
        ]),
        supplierId: pick(row, paymentColumns, [
          "supplierId",
        ]),
        orderId: pick(row, paymentColumns, [
          "orderId",
        ]),
        purchaseId: pick(row, paymentColumns, [
          "purchaseId",
        ]),
      });
    }

    for (const row of supplierPaymentRows) {
      const date = pick(row, supplierPaymentColumns, [
        "paymentDate",
        "createdAt",
        "date",
      ]);

      const rowStatus = upper(
        pick(row, supplierPaymentColumns, [
          "status",
          "paymentStatus",
        ])
      );

      const amountPaise = numberValue(
        pick(row, supplierPaymentColumns, [
          "amountPaise",
          "totalPaise",
          "amount",
        ])
      );

      const reference = String(
        pick(row, supplierPaymentColumns, [
          "transactionReference",
          "reference",
          "paymentNumber",
        ]) ?? ""
      );

      const id = String(
        pick(row, supplierPaymentColumns, ["id"]) ?? ""
      );

      records.push({
        id,
        source: "SUPPLIER_PAYMENT",
        type: "SUPPLIER_PAY",
        status: rowStatus || "UNKNOWN",
        amountPaise,
        reference,
        date,
        party: "",
        customerId: null,
        supplierId: pick(
          row,
          supplierPaymentColumns,
          ["supplierId"]
        ),
        orderId: null,
        purchaseId: pick(
          row,
          supplierPaymentColumns,
          ["purchaseId"]
        ),
      });
    }

    const filtered = records
      .filter((record) => {
        const searchable = [
          record.id,
          record.reference,
          record.party,
          record.customerId,
          record.supplierId,
          record.orderId,
          record.purchaseId,
          record.status,
          record.type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (
          search &&
          !searchable.includes(search)
        ) {
          return false;
        }

        if (
          status &&
          status !== "ALL" &&
          String(record.status) !== status
        ) {
          return false;
        }

        if (
          type !== "ALL" &&
          String(record.type) !== type
        ) {
          return false;
        }

        if (from || to) {
          if (!record.date) {
            return false;
          }

          const date = new Date(String(record.date));

          if (Number.isNaN(date.getTime())) {
            return false;
          }

          if (
            from &&
            date < new Date(`${from}T00:00:00`)
          ) {
            return false;
          }

          if (
            to &&
            date > new Date(`${to}T23:59:59.999`)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const aDate = a.date
          ? new Date(String(a.date)).getTime()
          : 0;

        const bDate = b.date
          ? new Date(String(b.date)).getTime()
          : 0;

        return bDate - aDate;
      });

    const postedStatuses = [
      "POSTED",
      "PAID",
      "COMPLETED",
      "SUCCESS",
      "RECEIVED",
      "SETTLED",
      "APPROVED",
    ];

    const reversedStatuses = [
      "REVERSED",
      "REFUNDED",
      "CANCELLED",
    ];

    const posted = filtered.filter((record) =>
      postedStatuses.includes(
        String(record.status)
      )
    );

    const reversed = filtered.filter((record) =>
      reversedStatuses.includes(
        String(record.status)
      )
    );

    const summary = {
      totalRecords: filtered.length,

      totalAmountPaise: filtered.reduce(
        (total, record) =>
          total + numberValue(record.amountPaise),
        0
      ),

      postedAmountPaise: posted.reduce(
        (total, record) =>
          total + numberValue(record.amountPaise),
        0
      ),

      reversedAmountPaise: reversed.reduce(
        (total, record) =>
          total + numberValue(record.amountPaise),
        0
      ),

      customerReceivedPaise: filtered
        .filter(
          (record) =>
            record.type === "CUSTOMER_RECEIVE"
        )
        .reduce(
          (total, record) =>
            total + numberValue(record.amountPaise),
          0
        ),

      supplierPaidPaise: filtered
        .filter(
          (record) =>
            record.type === "SUPPLIER_PAY"
        )
        .reduce(
          (total, record) =>
            total + numberValue(record.amountPaise),
          0
        ),

      refundsPaise: filtered
        .filter(
          (record) =>
            record.type === "REFUND"
        )
        .reduce(
          (total, record) =>
            total + numberValue(record.amountPaise),
          0
        ),
    };

    return NextResponse.json({
      ok: true,
      summary,
      records: filtered.slice(0, 500),
      capabilities: {
        paymentTable: paymentColumns.size > 0,
        supplierPaymentTable:
          supplierPaymentColumns.size > 0,
      },
    });
  } catch (error) {
    console.error(
      "PAYMENT_DASHBOARD_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Payment dashboard data could not be loaded.",
      },
      { status: 500 }
    );
  }
}