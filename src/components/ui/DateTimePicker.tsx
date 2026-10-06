"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
} from "lucide-react";

interface DateTimePickerProps {
  label: string;
  helperText?: string;
  value?: string | null; // "YYYY-MM-DDTHH:mm" or ISO string or empty
  onChange: (value: string) => void;
  minDate?: string | null;
  placeholder?: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Helper to format Date into YYYY-MM-DDTHH:mm (local time)
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Helper to parse value safely
function parseDate(val?: string | null): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// Pretty formatting: "Thu, Oct 8, 2026 • 11:59 PM"
function formatDisplay(val?: string | null): string {
  const d = parseDate(val);
  if (!d) return "";
  const dayStr = d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dayStr} at ${timeStr}`;
}

export function DateTimePicker({
  label,
  helperText,
  value,
  onChange,
  minDate,
  placeholder = "Select date & time...",
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parsed initial date or now
  const parsedValue = useMemo(() => parseDate(value), [value]);

  // Working state while dialog is open
  const [viewYear, setViewYear] = useState(() => parsedValue ? parsedValue.getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parsedValue ? parsedValue.getMonth() : new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(() => parsedValue ? parsedValue.getDate() : null);

  // Time state (12-hour format)
  const [hour12, setHour12] = useState(() => {
    if (!parsedValue) return 11;
    const h = parsedValue.getHours();
    return h === 0 ? 12 : h > 12 ? h - 12 : h;
  });
  const [minute, setMinute] = useState(() => {
    return parsedValue ? parsedValue.getMinutes() : 59;
  });
  const [period, setPeriod] = useState<"AM" | "PM">(() => {
    if (!parsedValue) return "PM";
    return parsedValue.getHours() >= 12 ? "PM" : "AM";
  });

  // Sync internal working state when prop `value` changes or modal opens
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.getFullYear());
      setViewMonth(parsedValue.getMonth());
      setSelectedDay(parsedValue.getDate());
      const h = parsedValue.getHours();
      setHour12(h === 0 ? 12 : h > 12 ? h - 12 : h);
      setMinute(parsedValue.getMinutes());
      setPeriod(h >= 12 ? "PM" : "AM");
    } else {
      const now = new Date();
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
      setSelectedDay(null);
    }
  }, [value, isOpen]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Calendar math
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay();
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Convert current view + time state into a 24-hr Date object
  const buildDateObject = (day: number | null): Date | null => {
    if (!day) return null;
    let h24 = hour12;
    if (period === "AM" && h24 === 12) h24 = 0;
    if (period === "PM" && h24 !== 12) h24 += 12;
    return new Date(viewYear, viewMonth, day, h24, minute);
  };

  const handleApply = () => {
    const finalDay = selectedDay || new Date().getDate();
    const d = buildDateObject(finalDay);
    if (d) {
      onChange(toDatetimeLocal(d));
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setSelectedDay(null);
    setIsOpen(false);
  };

  // Quick Presets
  const applyPreset = (presetDate: Date, setTime?: { h: number; m: number; p: "AM" | "PM" }) => {
    setViewYear(presetDate.getFullYear());
    setViewMonth(presetDate.getMonth());
    setSelectedDay(presetDate.getDate());
    if (setTime) {
      setHour12(setTime.h);
      setMinute(setTime.m);
      setPeriod(setTime.p);
    }
  };

  const handlePresetToday = (h = 11, m = 59, p: "AM" | "PM" = "PM") => {
    const now = new Date();
    applyPreset(now, { h, m, p });
  };

  const handlePresetTomorrow = (h = 11, m = 59, p: "AM" | "PM" = "PM") => {
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    applyPreset(tom, { h, m, p });
  };

  const handlePresetPlusDays = (days: number, h = 11, m = 59, p: "AM" | "PM" = "PM") => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    applyPreset(target, { h, m, p });
  };

  const isSelected = (day: number) => {
    if (!selectedDay) return false;
    return (
      selectedDay === day &&
      parsedValue?.getMonth() === viewMonth &&
      parsedValue?.getFullYear() === viewYear
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear
    );
  };

  const formattedDisplayValue = formatDisplay(value);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
        {label}
      </label>

      {/* Trigger Button */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex-1 flex items-center justify-between text-left text-xs px-3 py-2 border transition-colors ${
            value
              ? "bg-indigo-50/40 border-indigo-300 text-indigo-950 font-medium hover:border-indigo-400"
              : "bg-white border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-800"
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <CalendarIcon
              className={`w-4 h-4 shrink-0 ${value ? "text-indigo-600" : "text-slate-400"}`}
            />
            <span className="truncate">
              {value ? formattedDisplayValue : placeholder}
            </span>
          </div>

          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider ml-2 shrink-0">
            {value ? "Edit" : "Set"}
          </span>
        </button>

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="p-2 border border-slate-300 hover:border-rose-300 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
            title="Clear date & time"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {helperText && (
        <p className="text-[11px] text-slate-500 mt-1 leading-tight">
          {helperText}
        </p>
      )}

      {/* Popover Dialog */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-1.5 w-[330px] sm:w-[350px] bg-white border border-slate-300 shadow-xl p-4 space-y-4">
          {/* Quick Date Shortcut Chips */}
          <div className="flex flex-wrap items-center gap-1 pb-3 border-b border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Quick:
            </span>
            <button
              type="button"
              onClick={() => handlePresetToday(hour12, minute, period)}
              className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handlePresetTomorrow(hour12, minute, period)}
              className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium transition-colors"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => handlePresetPlusDays(3, hour12, minute, period)}
              className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium transition-colors"
            >
              +3 Days
            </button>
            <button
              type="button"
              onClick={() => handlePresetPlusDays(7, hour12, minute, period)}
              className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium transition-colors"
            >
              +1 Week
            </button>
          </div>

          {/* Month / Year Header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-slate-900">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAYS_OF_WEEK.map((d) => (
              <span
                key={d}
                className="text-[11px] font-bold text-slate-400 py-0.5"
              >
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots for start offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-7" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = selectedDay === day;
              const today = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`h-7 w-full text-xs font-medium transition-colors flex items-center justify-center relative ${
                    selected
                      ? "bg-indigo-600 text-white font-bold"
                      : today
                      ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  {day}
                  {today && !selected && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-600" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Time Picker Section */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Time of Day:</span>
              </span>

              {/* Quick Time Chips */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setHour12(8);
                    setMinute(0);
                    setPeriod("AM");
                  }}
                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  8 AM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHour12(12);
                    setMinute(0);
                    setPeriod("PM");
                  }}
                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  12 PM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHour12(5);
                    setMinute(0);
                    setPeriod("PM");
                  }}
                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  5 PM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHour12(11);
                    setMinute(59);
                    setPeriod("PM");
                  }}
                  className="text-[10px] px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-colors"
                >
                  11:59 PM
                </button>
              </div>
            </div>

            {/* Time Controls */}
            <div className="flex items-center gap-2">
              {/* Hour Dropdown */}
              <select
                value={hour12}
                onChange={(e) => setHour12(Number(e.target.value))}
                className="flat-input text-xs py-1 px-2 font-mono font-bold w-16"
              >
                {Array.from({ length: 12 }).map((_, i) => {
                  const h = i + 1;
                  return (
                    <option key={h} value={h}>
                      {h.toString().padStart(2, "0")}
                    </option>
                  );
                })}
              </select>

              <span className="font-bold text-slate-400 font-mono">:</span>

              {/* Minute Dropdown */}
              <select
                value={minute}
                onChange={(e) => setMinute(Number(e.target.value))}
                className="flat-input text-xs py-1 px-2 font-mono font-bold w-16"
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 59].map((m) => (
                  <option key={m} value={m}>
                    {m.toString().padStart(2, "0")}
                  </option>
                ))}
              </select>

              {/* AM / PM Segmented Toggle */}
              <div className="flex border border-slate-300 overflow-hidden text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPeriod("AM")}
                  className={`px-2.5 py-1 transition-colors ${
                    period === "AM"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod("PM")}
                  className={`px-2.5 py-1 transition-colors ${
                    period === "PM"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-slate-500 hover:text-rose-600 font-medium transition-colors"
            >
              Clear
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flat-button-secondary text-xs py-1 px-2.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flat-button-primary text-xs py-1 px-3 bg-indigo-600 border-indigo-600 hover:bg-indigo-700 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
