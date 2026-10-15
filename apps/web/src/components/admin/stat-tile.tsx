/**
 * A number with its label. `card` is the white block of the event page; `on-brand` is the
 * translucent tile inside the red live hero.
 */
export function StatTile({
  value,
  label,
  tone = "card",
}: {
  value: string;
  label: string;
  tone?: "card" | "on-brand";
}) {
  if (tone === "on-brand") {
    return (
      <div className="flex flex-col rounded-[18px] bg-white/14 px-4 py-3.5">
        <span className="text-[34px] leading-tight font-black">{value}</span>
        <span className="text-[15px] font-extrabold">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col rounded-[20px] border-2 border-b-[5px] border-line bg-white px-4 py-3.5">
      <span className="text-[30px] leading-tight font-black">{value}</span>
      <span className="text-sm font-extrabold text-ink-soft">{label}</span>
    </div>
  );
}
