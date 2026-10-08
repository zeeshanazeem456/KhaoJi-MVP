import { STATUS_COLOR, STATUS_LABEL } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`chip ${STATUS_COLOR[status]}`}>{STATUS_LABEL[status]}</span>;
}
