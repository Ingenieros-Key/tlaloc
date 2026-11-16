"use client";

import { useState } from "react";
import { wateringTimes, wateringWeekdays, type IrrigationPlan } from "../data/irrigation";
import { t } from "../strings";
import { Segmented } from "../ui/Segmented";

const s = t.inspector.irrigation.calendar;

type CalendarView = "day" | "week" | "month";

/** Mon=0 … Sun=6, matching `wateringWeekdays`. */
function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** "6:00 AM" from minutes after midnight. */
function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = String(minutes % 60).padStart(2, "0");
  const suffix = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${suffix}`;
}

/** Read-only watering calendar generated from the plan, switchable between day, week and month. */
export function IrrigationCalendar({ plan }: { readonly plan: IrrigationPlan }) {
  const [view, setView] = useState<CalendarView>("week");
  const waters = wateringWeekdays(plan.daysPerWeek);
  const times = wateringTimes(plan.timesPerDay);
  const litersLabel = Math.round(plan.litersPerIrrigation).toLocaleString("en-US");
  const eventLines = times.map((m) => s.event(formatTime(m), litersLabel));

  return (
    <div className="mt-3 rounded-lg border border-line bg-surface p-2.5">
      <div className="mb-2.5">
        <Segmented<CalendarView>
          label={s.viewLabel}
          value={view}
          options={[
            { value: "day", label: s.views.day },
            { value: "week", label: s.views.week },
            { value: "month", label: s.views.month },
          ]}
          onChange={setView}
        />
      </div>
      {view === "day" ? (
        <DayView waters={waters} eventLines={eventLines} />
      ) : view === "week" ? (
        <WeekView waters={waters} eventLines={eventLines} />
      ) : (
        <MonthView waters={waters} />
      )}
    </div>
  );
}

function EventList({ lines }: { readonly lines: readonly string[] }) {
  return (
    <ul className="mt-1 space-y-0.5">
      {lines.map((line, i) => (
        <li key={i} className="font-mono text-[11px] text-muted tabular">
          {line}
        </li>
      ))}
    </ul>
  );
}

function DayView({ waters, eventLines }: { readonly waters: readonly boolean[]; readonly eventLines: readonly string[] }) {
  const today = new Date();
  const watering = waters[weekdayIndex(today)];
  return (
    <div className="rounded-md border border-line bg-surface-2 p-2.5 text-[13px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{s.today}</span>
        <span className={watering ? "font-medium text-accent" : "text-muted"}>{watering ? s.water : s.rest}</span>
      </div>
      {watering ? <EventList lines={eventLines} /> : <p className="mt-1 text-xs text-muted">{s.none}</p>}
    </div>
  );
}

function WeekView({ waters, eventLines }: { readonly waters: readonly boolean[]; readonly eventLines: readonly string[] }) {
  return (
    <ul className="space-y-1">
      {s.weekdays.map((name, i) => {
        const watering = waters[i];
        return (
          <li
            key={name}
            className={`flex items-start justify-between gap-2 rounded-md border px-2.5 py-1.5 text-[13px] ${
              watering ? "border-accent/40 bg-accent/5" : "border-line bg-surface-2"
            }`}
          >
            <span className="w-10 shrink-0 font-semibold">{name}</span>
            {watering ? (
              <span className="flex-1 text-right">
                <span className="font-medium text-accent">{s.water}</span>
                <EventList lines={eventLines} />
              </span>
            ) : (
              <span className="text-muted">{s.rest}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MonthView({ waters }: { readonly waters: readonly boolean[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = weekdayIndex(new Date(year, month, 1));
  const monthName = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const cells: (number | null)[] = [...Array<null>(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div>
      <p className="mb-2 text-center text-xs font-semibold text-muted">{monthName}</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {s.weekdays.map((name) => (
          <span key={name} className="text-[10px] font-medium uppercase text-muted">
            {name.slice(0, 1)}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i}`} aria-hidden="true" />;
          const watering = waters[weekdayIndex(new Date(year, month, day))];
          const isToday = day === today.getDate();
          return (
            <span
              key={day}
              title={watering ? s.water : s.rest}
              className={`flex h-7 items-center justify-center rounded font-mono text-[11px] tabular ${
                watering ? "bg-accent/15 font-semibold text-accent" : "text-muted"
              } ${isToday ? "ring-1 ring-inset ring-accent" : ""}`}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}
