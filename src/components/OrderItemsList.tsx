import { pkr } from "@/lib/format";
import type { OrderFull } from "@/lib/types";

export function OrderItemsList({ order, showTotals = true, large = false }: { order: OrderFull; showTotals?: boolean; large?: boolean }) {
  return (
    <div className={large ? "text-base" : "text-sm"}>
      <ul className="space-y-1.5">
        {order.order_items?.map((i) => (
          <li key={i.id} className="flex justify-between gap-3">
            <span>
              <span className="mr-1.5 inline-flex min-w-[26px] justify-center rounded-md bg-haldi-light px-1 font-bold">{i.qty}×</span>
              {i.name}
            </span>
            <span className="tabular-nums text-chai-muted">{pkr(i.price * i.qty)}</span>
          </li>
        ))}
      </ul>
      {order.note && <p className="mt-2.5 rounded-xl bg-haldi-light px-3 py-2 text-sm">“{order.note}”</p>}
      {showTotals && (
        <dl className="mt-3 space-y-1 border-t-2 border-dashed border-chai-line pt-3">
          <div className="flex justify-between text-chai-muted">
            <dt>Food</dt>
            <dd className="tabular-nums">{pkr(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-chai-muted">
            <dt>Delivery</dt>
            <dd className="tabular-nums">{pkr(order.delivery_fee)}</dd>
          </div>
          <div className="flex justify-between text-base font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{pkr(order.total)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
