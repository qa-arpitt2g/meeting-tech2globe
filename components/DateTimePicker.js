"use client";

import { useEffect, useId, useRef, useState } from 'react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
}

export function todayValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildHourSlots() {
  return Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
}

function parseTimeToMinutes(value) {
  const [hour, minute = '0'] = value.split(':');
  return Number(hour) * 60 + Number(minute);
}

function formatMinutesAsTime(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function normalizeTimeInput(value) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function isValidTimeFormat(value) {
  return normalizeTimeInput(value) !== null;
}

export function minTimeForToday() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function nextTimeAfterStart(startTime) {
  const next = parseTimeToMinutes(startTime) + 1;
  if (next >= 24 * 60) return null;
  return formatMinutesAsTime(next);
}

function compareTimes(a, b) {
  return parseTimeToMinutes(a) - parseTimeToMinutes(b);
}

function getCalendarDays(viewYear, viewMonth) {
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startOffset = firstDay.getDay();
  const gridStart = new Date(viewYear, viewMonth, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      iso: toIsoDate(date),
      day: date.getDate(),
      inMonth: date.getMonth() === viewMonth
    };
  });
}

export default function DateTimePicker({
  id,
  label,
  date,
  time,
  onChange,
  minDate = todayValue(),
  minTime = null,
  fixedDate = null,
  disabled = false,
  required = false
}) {
  const fallbackId = useId();
  const fieldId = id || fallbackId;
  const rootRef = useRef(null);
  const timeListRef = useRef(null);
  const hourSlots = buildHourSlots();

  const [open, setOpen] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [draftTime, setDraftTime] = useState(time || '');
  const [timeError, setTimeError] = useState('');
  const initialView = date ? parseIsoDate(date) : new Date();
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());

  useEffect(() => {
    setDraftTime(time || '');
    setTimeError('');
  }, [time]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
        setShowMonthPicker(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !time || !timeListRef.current) return;
    const selected = timeListRef.current.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ block: 'center' });
  }, [open, time, viewMonth, viewYear]);

  const activeDate = fixedDate || date || minDate;

  const isTimeDisabled = (slot) => {
    if (activeDate === todayValue() && minTime && compareTimes(slot, minTime) < 0) {
      return true;
    }
    if (activeDate === minDate && minTime && compareTimes(slot, minTime) < 0) {
      return true;
    }
    return false;
  };

  const commitTime = (rawValue) => {
    if (!rawValue.trim()) {
      setDraftTime(time || '');
      setTimeError('');
      return;
    }

    const normalized = normalizeTimeInput(rawValue);
    if (!normalized) {
      setDraftTime(time || '');
      setTimeError('Use HH:mm format');
      return;
    }

    if (isTimeDisabled(normalized)) {
      setDraftTime(time || '');
      setTimeError('Time is not available');
      return;
    }

    setDraftTime(normalized);
    setTimeError('');
    onChange(activeDate, normalized);
  };

  const openPicker = () => {
    if (disabled) return;
    const nextView = (fixedDate || date) ? parseIsoDate(fixedDate || date) : new Date();
    setViewYear(nextView.getFullYear());
    setViewMonth(nextView.getMonth());
    setOpen(true);
  };

  const handleDateSelect = (iso) => {
    if (fixedDate && iso !== fixedDate) return;
    if (iso < minDate) return;
    onChange(iso, time || draftTime || '09:00');
  };

  const handleTimeSelect = (slot) => {
    if (isTimeDisabled(slot)) return;
    setDraftTime(slot);
    setTimeError('');
    onChange(activeDate, slot);
    setOpen(false);
    setShowMonthPicker(false);
  };

  const calendarDays = getCalendarDays(viewYear, viewMonth);

  const goToMonth = (monthIndex) => {
    setViewMonth(monthIndex);
    setShowMonthPicker(false);
  };

  const goToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    handleDateSelect(todayValue());
  };

  const scrollTimes = (direction) => {
    if (!timeListRef.current) return;
    timeListRef.current.scrollBy({ top: direction * 120, behavior: 'smooth' });
  };

  return (
    <div className="datetime-picker" ref={rootRef}>
      <label htmlFor={`${fieldId}-time`}>
        {label}
        <div className={`datetime-input-shell${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}>
          <button
            type="button"
            className="datetime-date-display"
            onClick={openPicker}
            disabled={disabled}
            aria-label={`Select date for ${label}`}
          >
            {date ? formatDisplayDate(date) : 'dd-mm-yyyy'}
          </button>

          <input
            id={`${fieldId}-time`}
            type="text"
            className="datetime-time-input"
            inputMode="numeric"
            value={draftTime}
            placeholder="HH:mm"
            disabled={disabled}
            required={required}
            aria-invalid={timeError ? 'true' : 'false'}
            onChange={(event) => {
              setDraftTime(event.target.value);
              setTimeError('');
            }}
            onBlur={() => commitTime(draftTime)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitTime(draftTime);
              }
            }}
          />

          <button
            type="button"
            className="datetime-trigger-button"
            onClick={openPicker}
            disabled={disabled}
            aria-label={`Open ${label} picker`}
          >
            <span className="material-symbols-outlined">calendar_month</span>
          </button>
        </div>
        {timeError && <span className="datetime-field-error">{timeError}</span>}
      </label>

      {open && (
        <div className="datetime-popup" role="dialog" aria-label={`${label} picker`}>
          <div className="datetime-popup-panel">
            <div className="datetime-calendar">
              <div className="datetime-calendar-header">
                <button
                  type="button"
                  className="datetime-nav-button"
                  onClick={() => {
                    if (viewMonth === 0) {
                      setViewYear((year) => year - 1);
                      setViewMonth(11);
                      return;
                    }
                    setViewMonth((month) => month - 1);
                  }}
                  aria-label="Previous month"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>

                <button
                  type="button"
                  className="datetime-home-button"
                  onClick={goToToday}
                  aria-label="Go to today"
                >
                  <span className="material-symbols-outlined">home</span>
                </button>

                <button
                  type="button"
                  className="datetime-month-label"
                  onClick={() => setShowMonthPicker((value) => !value)}
                  aria-expanded={showMonthPicker}
                >
                  {MONTHS[viewMonth]} {viewYear}
                  <span className="material-symbols-outlined">expand_more</span>
                </button>

                <button
                  type="button"
                  className="datetime-nav-button"
                  onClick={() => {
                    if (viewMonth === 11) {
                      setViewYear((year) => year + 1);
                      setViewMonth(0);
                      return;
                    }
                    setViewMonth((month) => month + 1);
                  }}
                  aria-label="Next month"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>

              {showMonthPicker && (
                <div className="datetime-month-grid">
                  {MONTHS.map((monthName, index) => (
                    <button
                      key={monthName}
                      type="button"
                      className={`datetime-month-option${index === viewMonth ? ' is-selected' : ''}`}
                      onClick={() => goToMonth(index)}
                    >
                      {monthName.slice(0, 3)}
                    </button>
                  ))}
                </div>
              )}

              <div className="datetime-weekdays">
                {WEEKDAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="datetime-days">
                {calendarDays.map((day) => {
                  const isSelected = (fixedDate || date) === day.iso;
                  const isDayDisabled = day.iso < minDate || (fixedDate && day.iso !== fixedDate);

                  return (
                    <button
                      key={day.iso}
                      type="button"
                      className={[
                        'datetime-day',
                        !day.inMonth ? 'is-outside' : '',
                        isSelected ? 'is-selected' : '',
                        isDayDisabled ? 'is-disabled' : ''
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleDateSelect(day.iso)}
                      disabled={isDayDisabled}
                      aria-label={formatDisplayDate(day.iso)}
                      aria-pressed={isSelected}
                    >
                      {day.day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="datetime-time-panel">
              <button
                type="button"
                className="datetime-time-scroll"
                onClick={() => scrollTimes(-1)}
                aria-label="Scroll up"
              >
                <span className="material-symbols-outlined">expand_less</span>
              </button>

              <div className="datetime-time-list" ref={timeListRef}>
                {hourSlots.map((slot) => {
                  const slotDisabled = isTimeDisabled(slot);
                  const selected = time === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      className={[
                        'datetime-time-slot',
                        selected ? 'is-selected' : '',
                        slotDisabled ? 'is-disabled' : ''
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleTimeSelect(slot)}
                      disabled={slotDisabled}
                      data-selected={selected ? 'true' : 'false'}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="datetime-time-scroll"
                onClick={() => scrollTimes(1)}
                aria-label="Scroll down"
              >
                <span className="material-symbols-outlined">expand_more</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
