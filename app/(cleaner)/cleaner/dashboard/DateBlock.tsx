// Presentational calendar-style date tile: a black rounded block with the day
// number on top and the month name beneath, both in white. Used by the upcoming
// and past clean cards on the dashboard. No client features — safe in both
// server and client components.
export default function DateBlock({ day, month }: { day: number; month: string }) {
  return (
    <div className="bg-black rounded-xl px-3 py-2 text-center leading-tight min-w-[3.5rem]">
      <div className="text-2xl font-bold text-white">{day}</div>
      <div className="text-xs font-medium text-white/80 uppercase tracking-wide">{month}</div>
    </div>
  );
}
