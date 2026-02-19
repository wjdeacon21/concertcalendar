"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ConcertCard from "./ConcertCard";
import { type BillItem } from "./ConcertCard";

export interface MonthlyShow {
  show_id: string;
  bill: BillItem[];
  venue: string;
  date: string;
  time: string | null;
  ticket_url: string | null;
}

interface Props {
  showsByDate: Record<string, MonthlyShow[]>;
}

const DOW_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildCells(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const rem = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < rem; i++) cells.push(null);
  return cells;
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayStr() {
  const t = new Date();
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate());
}

export default function MonthlyCalendar({ showsByDate }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [focusedDay, setFocusedDay] = useState<number | null>(null);

  const drawerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const triggerRef = useRef<HTMLElement | null>(null);

  const cells = buildCells(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const today = todayStr();

  // ── Navigation ────────────────────────────────────────────────────────────

  const prevMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 0) { setYear((y) => y - 1); return 11; }
      return m - 1;
    });
    setFocusedDay(null);
  }, []);

  const nextMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 11) { setYear((y) => y + 1); return 0; }
      return m + 1;
    });
    setFocusedDay(null);
  }, []);

  // ── Drawer ────────────────────────────────────────────────────────────────

  const openDrawer = useCallback((dateStr: string, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setSelectedDate(dateStr);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    // Restore focus to the cell that opened the drawer
    setTimeout(() => triggerRef.current?.focus(), 10);
  }, []);

  // Focus trap + Escape for drawer
  useEffect(() => {
    if (!drawerOpen || !drawerRef.current) return;
    const drawer = drawerRef.current;

    const focusable = Array.from(
      drawer.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )
    );
    focusable[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeDrawer(); return; }
      if (e.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  // ── Grid keyboard navigation ───────────────────────────────────────────────

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const current = focusedDay ?? 1;
      let next = current;

      if (e.key === "ArrowRight") { e.preventDefault(); next = Math.min(current + 1, daysInMonth); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); next = Math.max(current - 1, 1); }
      else if (e.key === "ArrowDown") { e.preventDefault(); next = Math.min(current + 7, daysInMonth); }
      else if (e.key === "ArrowUp") { e.preventDefault(); next = Math.max(current - 7, 1); }
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const dateStr = toDateStr(year, month, current);
        const btn = gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${current}"]`);
        if (btn && (showsByDate[dateStr]?.length ?? 0) > 0) openDrawer(dateStr, btn);
        return;
      } else { return; }

      setFocusedDay(next);
      setTimeout(() => {
        gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus();
      }, 0);
    },
    [focusedDay, daysInMonth, year, month, showsByDate, openDrawer]
  );

  // ── Derived ───────────────────────────────────────────────────────────────

  const selectedShows = selectedDate ? (showsByDate[selectedDate] ?? []) : [];
  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
      })
    : "";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Month navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="flex h-10 w-10 items-center justify-center rounded-full font-sans text-xl text-charcoal/50 transition-colors hover:bg-charcoal/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
        >
          ‹
        </button>
        <h2 className="font-serif text-xl font-medium text-charcoal">{monthLabel}</h2>
        <button
          onClick={nextMonth}
          aria-label="Next month"
          className="flex h-10 w-10 items-center justify-center rounded-full font-sans text-xl text-charcoal/50 transition-colors hover:bg-charcoal/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7">
        {DOW_HEADERS.map((d) => (
          <div key={d} className="py-2 text-center font-sans text-xs font-medium text-charcoal/40">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        ref={gridRef}
        role="grid"
        aria-label={monthLabel}
        className="grid grid-cols-7"
        onKeyDown={handleGridKeyDown}
      >
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`blank-${i}`} role="gridcell" aria-hidden="true" className="h-11" />;
          }

          const dateStr = toDateStr(year, month, day);
          const shows = showsByDate[dateStr] ?? [];
          const hasConcerts = shows.length > 0;
          const isToday = dateStr === today;
          const isFocusTarget = focusedDay === day || (focusedDay === null && day === 1);

          return (
            <div key={dateStr} role="gridcell">
              <button
                data-day={day}
                onClick={(e) => hasConcerts && openDrawer(dateStr, e.currentTarget)}
                disabled={!hasConcerts}
                tabIndex={isFocusTarget ? 0 : -1}
                aria-label={`${day}${hasConcerts ? `, ${shows.length} concert${shows.length > 1 ? "s" : ""}` : ""}`}
                aria-pressed={selectedDate === dateStr && drawerOpen}
                className={[
                  "relative mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-full",
                  "font-sans text-sm transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine",
                  isToday ? "font-semibold" : "",
                  isToday && !hasConcerts ? "text-pine" : "",
                  isToday && hasConcerts ? "text-pine" : "",
                  hasConcerts
                    ? "cursor-pointer hover:bg-pine/10 text-charcoal"
                    : "cursor-default text-charcoal/35 disabled:cursor-default",
                ].join(" ")}
              >
                <span>{day}</span>
                {hasConcerts && (
                  <span
                    className="absolute bottom-1.5 h-1 w-1 rounded-full bg-pine"
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal/25 backdrop-blur-[1px]"
          style={{ animation: "ccFadeIn 220ms ease-in-out" }}
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Slide-up drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Concerts on ${selectedDateLabel}`}
        aria-hidden={!drawerOpen}
        className={[
          "fixed bottom-0 left-0 right-0 z-50 max-h-[82vh] overflow-y-auto",
          "rounded-t-2xl bg-cream shadow-2xl",
          "transition-transform duration-[220ms] ease-in-out",
          drawerOpen ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
        onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => {
          if (e.changedTouches[0].clientY - touchStartY.current > 60) closeDrawer();
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pb-1 pt-3" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-charcoal/20" />
        </div>

        <div className="px-6 pb-10 pt-2">
          {/* Header */}
          <div className="mb-5 flex items-start justify-between">
            <h3 className="font-serif text-xl font-medium text-charcoal">{selectedDateLabel}</h3>
            <button
              onClick={closeDrawer}
              aria-label="Close"
              className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-sans text-charcoal/50 transition-colors hover:bg-charcoal/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
            >
              ✕
            </button>
          </div>

          {/* Concert cards */}
          <div className="space-y-3">
            {selectedShows.map((show) => (
              <ConcertCard
                key={show.show_id}
                bill={show.bill}
                venue={show.venue}
                time={show.time}
                ticket_url={show.ticket_url}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ccFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}
