import { formatPKR } from "@/lib/money";

const dayFmt = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", timeZone: "UTC" });
const weekdayFmt = new Intl.DateTimeFormat("en-PK", { weekday: "short", timeZone: "UTC" });

/** Round the axis maximum up to a tidy number (1, 2, 2.5 or 5 × 10^n). */
function niceMax(v) {
  if (v <= 0) return 1000;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v);
}
const short = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : String(n));

/**
 * Daily sales bars (one series, so no legend: the heading names it).
 * Hover a bar for its value; screen readers get the table instead.
 */
export function SalesChart({ data, title = "Sales per day" }) {
  const max = niceMax(Math.max(...data.map((d) => d.sales)));
  const ticks = [max, max / 2, 0];
  const many = data.length > 10;
  return (
    <figure className="m-0">
      <figcaption className="sr-only">{title}</figcaption>
      <div aria-hidden="true" className="grid grid-cols-[auto_1fr] gap-x-3">
        <div className="relative h-56 w-9 text-[11px] text-fg-muted tabular-nums">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / max) * 100}%` }}>
              {short(t)}
            </span>
          ))}
        </div>
        <div className="relative h-56">
          {ticks.map((t) => (
            <span
              key={t}
              className={`absolute inset-x-0 border-t ${t === 0 ? "border-line" : "border-line/50"}`}
              style={{ top: `${(1 - t / max) * 100}%` }}
            />
          ))}
          <ol className={`relative flex h-full items-end ${many ? "gap-0.5" : "gap-2"}`}>
            {data.map((d) => {
              const date = new Date(`${d.date}T00:00:00Z`);
              return (
                <li key={d.date} className="group relative flex h-full flex-1 items-end justify-center">
                  <span
                    className="w-full max-w-10 rounded-t-[4px] bg-accent transition-opacity group-hover:opacity-80"
                    style={{ height: d.sales > 0 ? `max(2px, ${(d.sales / max) * 100}%)` : 0 }}
                  />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg bg-fg px-2.5 py-1.5 text-xs whitespace-nowrap text-bg shadow-lg group-hover:block">
                    <span className="block font-bold">{formatPKR(d.sales)}</span>
                    <span className="block opacity-80">
                      {weekdayFmt.format(date)} {dayFmt.format(date)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <span />
        <ol className={`mt-1.5 flex text-[11px] text-fg-muted ${many ? "gap-0.5" : "gap-2"}`}>
          {data.map((d, i) => {
            const date = new Date(`${d.date}T00:00:00Z`);
            const show = !many || i === 0 || i === data.length - 1 || i % 7 === (data.length - 1) % 7;
            return (
              <li key={d.date} className="flex-1 text-center whitespace-nowrap">
                {show ? (many ? dayFmt.format(date) : weekdayFmt.format(date)) : ""}
              </li>
            );
          })}
        </ol>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Sales</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{dayFmt.format(new Date(`${d.date}T00:00:00Z`))}</th>
              <td>{formatPKR(d.sales)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
