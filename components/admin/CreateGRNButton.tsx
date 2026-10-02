"use client";

import { useRouter } from "next/navigation";

type CreateGRNButtonProps = {
  purchaseOrderId: string;
  disabled?: boolean;
  size?: "sm" | "md";
};

export default function CreateGRNButton({
  purchaseOrderId,
  disabled = false,
  size = "md",
}: CreateGRNButtonProps) {
  const router = useRouter();

  function handleClick() {
    if (disabled) {
      return;
    }

    router.push(
      `/admin/purchase-orders/${purchaseOrderId}/create-grn`
    );
  }

  const sizeClass =
    size === "sm"
      ? "px-3 py-2 text-xs"
      : "px-4 py-2.5 text-sm";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-xl bg-blue-600 font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClass}`}
    >
      <span className="mr-2">+</span>
      Create GRN
    </button>
  );
}
