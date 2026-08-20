"use client";

// Same reasoning as the other pages: this uses useState/useEffect and
// button clicks, so it has to run in the browser.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// The tasks table stores `date` as a plain date (no time, no timezone) —
// e.g. "2026-08-20". Date.toISOString() would convert to UTC first, which
// can shift the day by one depending on the user's timezone. Building the
// string manually from the local year/month/day avoids that bug.
function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Builds the 42 cells (6 weeks x 7 days) a month-view calendar needs,
// including the tail end of the previous month and the start of the next
// month so every week row is full — the same layout Google Calendar uses.
function getMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0 = Sunday ... 6 = Saturday

  // JavaScript's Date is forgiving about out-of-range days: asking for
  // "day 1 - startWeekday" of this month automatically rolls back into
  // the previous month, and later asking for day 32+ rolls into the
  // next one. That's what makes this loop work without special-casing
  // month boundaries.
  const gridStart = new Date(year, month, 1 - startWeekday);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export default function Calendar() {
  // viewDate always points at the 1st of whichever month is on screen.
  // Keeping it pinned to day 1 avoids edge cases like "next month" from
  // Jan 31 landing on a day that doesn't exist in February.
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Maps a date string ("2026-08-20") to the list of tasks due that day,
  // so each grid cell can look its tasks up instantly instead of
  // filtering the whole list on every render.
  const [tasksByDate, setTasksByDate] = useState({});
  const [error, setError] = useState(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // useMemo recalculates the grid only when the year/month actually
  // changes, instead of rebuilding all 42 dates on every render.
  const gridDays = useMemo(() => getMonthGrid(year, month), [year, month]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setCheckingAuth(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setTasksByDate({});
      return;
    }

    const supabase = createClient();
    const rangeStart = toDateKey(gridDays[0]);
    const rangeEnd = toDateKey(gridDays[gridDays.length - 1]);

    supabase
      .from("tasks")
      .select("id, name, date, priority")
      .eq("user_id", user.id)
      .gte("date", rangeStart)
      .lte("date", rangeEnd)
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          return;
        }

        // Group the flat list of tasks into { "2026-08-20": [task, ...] }
        // so rendering each cell is a simple lookup.
        const grouped = {};
        for (const task of data) {
          if (!grouped[task.date]) grouped[task.date] = [];
          grouped[task.date].push(task);
        }
        setTasksByDate(grouped);
      });
  }, [user, gridDays]);

  function goToPreviousMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function goToNextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  function goToToday() {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  const monthLabel = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const todayKey = toDateKey(new Date());

  const priorityDot = {
    low: "bg-emerald-500",
    medium: "bg-amber-500",
    high: "bg-red-500",
  };

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-zinc-50 p-6 dark:bg-black">
      <div className="flex w-full max-w-4xl items-center justify-between">
        <Link href="/" className="text-sm text-zinc-600 underline dark:text-zinc-400">
          &larr; Home
        </Link>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          {monthLabel}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={goToPreviousMonth}
            className="rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
          >
            &larr; Prev
          </button>
          <button
            onClick={goToToday}
            className="rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
          >
            Today
          </button>
          <button
            onClick={goToNextMonth}
            className="rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
          >
            Next &rarr;
          </button>
        </div>
      </div>

      {checkingAuth ? null : !user ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/login" className="underline">
            Log in
          </Link>{" "}
          to see your tasks on the calendar.
        </p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}

      <div className="grid w-full max-w-4xl grid-cols-7 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-b border-zinc-200 bg-zinc-100 p-2 text-center text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
          >
            {label}
          </div>
        ))}

        {gridDays.map((day) => {
          const dateKey = toDateKey(day);
          const isCurrentMonth = day.getMonth() === month;
          const isToday = dateKey === todayKey;
          const dayTasks = tasksByDate[dateKey] ?? [];

          return (
            <div
              key={dateKey}
              className={`flex min-h-24 flex-col gap-1 border-b border-r border-zinc-200 p-1.5 dark:border-zinc-800 ${
                isCurrentMonth
                  ? "bg-white dark:bg-zinc-950"
                  : "bg-zinc-50 dark:bg-zinc-900/40"
              }`}
            >
              <span
                className={`text-xs ${
                  isToday
                    ? "flex h-5 w-5 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black"
                    : isCurrentMonth
                    ? "text-zinc-700 dark:text-zinc-300"
                    : "text-zinc-400 dark:text-zinc-600"
                }`}
              >
                {day.getDate()}
              </span>

              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    title={task.name}
                    className="flex items-center gap-1 truncate rounded bg-zinc-100 px-1 py-0.5 text-[11px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityDot[task.priority] ?? "bg-zinc-400"}`}
                    />
                    <span className="truncate">{task.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
