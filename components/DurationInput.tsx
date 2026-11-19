"use client";

import { useState } from "react";
import { MIN_JOB_MINUTES } from "@/lib/hours";

// A job length picked as hours + minutes ("1 h" + "20 min"), never as a bare number of minutes.
// It submits ONE hidden field holding the total in whole minutes (or "" for "no limit" when
// `allowNone` is set), which the server turns into the stored hours.
const MINUTE_CHOICES = Array.from({ length: 12 }, (_, i) => i * 5);
const HOUR_CHOICES = Array.from({ length: 25 }, (_, i) => i);

export default function DurationInput({
  id,
  name,
  label,
  lang,
  defaultMinutes,
  allowNone = false,
  noneLabel = "",
}: {
  id: string;
  name: string;
  label: string;
  lang: "en" | "he";
  defaultMinutes: number | null;
  allowNone?: boolean;
  noneLabel?: string;
}) {
  const [hUnit, mUnit] = lang === "he" ? ["ש׳", "דק׳"] : ["h", "min"];
  const start = defaultMinutes == null ? null : Math.round(defaultMinutes / 5) * 5;
  const [none, setNone] = useState(allowNone && start == null);
  const [hours, setHours] = useState(start == null ? 3 : Math.floor(start / 60));
  const [minutes, setMinutes] = useState(start == null ? 0 : start % 60);
  const total = hours * 60 + minutes;
  const tooShort = !none && total < MIN_JOB_MINUTES;
  const selectCls =
    "w-full border border-gray-300 rounded-xl px-2 py-2 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400";

  return (
    <div>
      <label htmlFor={`${id}-h`} className="block text-base font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input type="hidden" name={name} value={none ? "" : String(total)} />
      <div className="flex items-center gap-2" role="group" aria-label={label}>
        {allowNone ? (
          <select
            id={`${id}-h`}
            value={none ? "none" : String(hours)}
            onChange={(e) => {
              if (e.target.value === "none") return setNone(true);
              setNone(false);
              setHours(Number(e.target.value));
            }}
            className={selectCls}
          >
            <option value="none">{noneLabel}</option>
            {HOUR_CHOICES.map((h) => (
              <option key={h} value={h}>{`${h} ${hUnit}`}</option>
            ))}
          </select>
        ) : (
          <select id={`${id}-h`} value={hours} onChange={(e) => setHours(Number(e.target.value))} className={selectCls}>
            {HOUR_CHOICES.map((h) => (
              <option key={h} value={h}>{`${h} ${hUnit}`}</option>
            ))}
          </select>
        )}
        <select
          aria-label={`${label} (${mUnit})`}
          value={minutes}
          disabled={none}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className={selectCls}
        >
          {MINUTE_CHOICES.map((m) => (
            <option key={m} value={m}>{`${m} ${mUnit}`}</option>
          ))}
        </select>
      </div>
      {tooShort && (
        <p className="text-sm text-red-600 mt-1">
          {lang === "he" ? "לפחות 20 דקות" : "At least 20 minutes"}
        </p>
      )}
    </div>
  );
}
