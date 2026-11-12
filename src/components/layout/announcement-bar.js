import { getStoreSettings } from "@/lib/settings";
import { formatPKR } from "@/lib/money";

export async function AnnouncementBar() {
  const s = await getStoreSettings();
  const items = [
    s.freeDeliveryEnabled && s.freeDeliveryThreshold
      ? `Free delivery above ${formatPKR(s.freeDeliveryThreshold)}`
      : null,
    s.codEnabled ? "Cash on delivery nationwide" : null,
    s.returnsEnabled ? `${s.returnWindowDays}-day easy exchange` : null,
  ].filter(Boolean);

  return (
    <div className="flex h-10 items-center justify-center gap-x-6 overflow-hidden px-4 text-xs font-semibold tracking-wide text-fg-muted">
      {items.map((text, i) => (
        <span key={text} className={i > 0 ? "hidden sm:inline" : undefined}>
          {i > 0 ? (
            <span aria-hidden="true" className="mr-6">
              ·
            </span>
          ) : null}
          {text}
        </span>
      ))}
    </div>
  );
}
