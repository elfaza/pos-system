import type { OrderType } from "@/features/checkout/types";

export const orderTypeOptions: Array<{ value: OrderType; label: string }> = [
  { value: "dine_in", label: "Dine-in" },
  { value: "takeaway", label: "Take-away" },
  { value: "delivery", label: "Delivery" },
];

export function formatOrderTypeLabel(orderType: OrderType | null | undefined) {
  return orderTypeOptions.find((option) => option.value === orderType)?.label ?? "-";
}
