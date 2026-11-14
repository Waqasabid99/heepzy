import { getSizeCharts } from "@/lib/catalog";

export const metadata = {
  title: "Size guide",
  description: "EU, UK and US shoe sizes with foot length in centimetres.",
};

const STEPS = [
  ["Stand on paper", "Wear the socks you'd normally wear, and stand with your heel against a wall."],
  ["Mark & measure", "Mark the tip of your longest toe and measure from the wall in centimetres."],
  ["Pick your size", "Find the closest foot length below. Between sizes? Go half a size up."],
];

export default async function SizeGuidePage() {
  const charts = await getSizeCharts();
  return (
    <div className="container-page pt-10 pb-28">
      <h1 className="display text-[clamp(48px,6vw,88px)]">Size guide</h1>
      <p className="mt-4 max-w-xl text-fg-muted">
        Our shoes use EU sizing. Measure your foot once and you&apos;ll know your size for every style.
      </p>

      <ol className="mt-12 grid gap-4 md:grid-cols-3">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="rounded-card bg-muted p-7">
            <span className="grid size-10 place-items-center rounded-full bg-accent font-display text-lg font-medium text-accent-fg">
              {i + 1}
            </span>
            <h2 className="mt-5 text-lg font-bold">{title}</h2>
            <p className="mt-1.5 text-sm text-fg-muted">{body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        {charts.map((c) => (
          <section key={c.id} aria-labelledby={`chart-${c.id}`} className="relative overflow-x-auto card p-2">
            <table className="w-full border-collapse text-center text-sm">
              <caption id={`chart-${c.id}`} className="px-4 pt-4 pb-2 text-left">
                <span className="block heading text-2xl">{c.name}</span>
              </caption>
              <thead>
                <tr className="text-fg-muted">
                  <th scope="col" className="p-3">
                    EU
                  </th>
                  <th scope="col" className="p-3">
                    UK
                  </th>
                  <th scope="col" className="p-3">
                    US
                  </th>
                  <th scope="col" className="p-3">
                    Foot length (cm)
                  </th>
                </tr>
              </thead>
              <tbody>
                {c.entries.map((r) => (
                  <tr key={r.eu} className="border-t border-line">
                    <th scope="row" className="p-3 font-bold">
                      {r.eu}
                    </th>
                    <td className="p-3">{r.uk}</td>
                    <td className="p-3">{r.us}</td>
                    <td className="p-3">{r.cm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
}
