"use client";

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createPopper } from '@popperjs/core';
import { DayPicker } from 'react-day-picker';
import { format, isValid as isValidDate, parseISO } from 'date-fns';
import 'react-day-picker/dist/style.css';

const TIME_SUGGESTIONS = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`);

export function todayValue() {
  const now = new Date();
  return format(now, 'yyyy-MM-dd');
}

function toIsoDate(date) {
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
}

function parseIsoDate(isoDate) {
  if (!isoDate) return null;
  const parsed = parseISO(isoDate);
  return isValidDate(parsed) ? parsed : null;
}

function normalizeTimeInput(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  const normalized = trimmed.toUpperCase().replace(/\s+/g, ' ');
  let match = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);

  if (match) {
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const suffix = match[3];
    if (minute < 0 || minute > 59) return null;
    if (suffix) {
      if (hour < 1 || hour > 12) return null;
      if (suffix === 'PM' && hour !== 12) hour += 12;
      if (suffix === 'AM' && hour === 12) hour = 0;
    } else if (hour < 0 || hour > 23) {
      return null;
    }
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  match = normalized.match(/^(\d{1,2})\s*(AM|PM)$/);
  if (match) {
    let hour = Number(match[1]);
    const suffix = match[2];
    if (hour < 1 || hour > 12) return null;
    if (suffix === 'PM' && hour !== 12) hour += 12;
    if (suffix === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:00`;
  }

  return null;
}

export function isValidTimeFormat(value) {
  return normalizeTimeInput(value) !== null;
}

export function minTimeForToday() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function parseTimeToMinutes(value) {
  const [hour = '0', minute = '0'] = String(value).split(':');
  return Number(hour) * 60 + Number(minute);
}

export function nextTimeAfterStart(startTime) {
  const next = parseTimeToMinutes(startTime) + 60;
  if (next >= 24 * 60) return null;
  const hour = Math.floor(next / 60);
  const minute = next % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatDateDisplay(date) {
  if (!date) return '';
  return format(date, 'dd MMM yyyy');
}

function coerceDate(value) {
  const parsed = parseIsoDate(value);
  return parsed || null;
}

function toDateTime(dateIso, time) {
  if (!dateIso || !time) return null;
  const date = coerceDate(dateIso);
  if (!date) return null;
  const [hour, minute] = time.split(':').map(Number);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export default function DateTimePicker({
  id,
  label,
  date,
  time,
  onChange,
  minDate = todayValue(),
  disabled = false,
  required = false
}) {
  const fallbackId = useId();
  const fieldId = id || fallbackId;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [localTime, setLocalTime] = useState(time || '');
  const [timeError, setTimeError] = useState('');
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);
  const popperInstance = useRef(null);

  const selectedDate = useMemo(() => coerceDate(date), [date]);
  const formattedDate = selectedDate ? formatDateDisplay(selectedDate) : '';

  useEffect(() => {
    setLocalTime(time || '');
  }, [time]);

  useEffect(() => {
    if (!calendarOpen) return;
    if (!anchorRef.current || !popoverRef.current) return;
    popperInstance.current = createPopper(anchorRef.current, popoverRef.current, {
      placement: 'bottom-start',
      modifiers: [
        { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start', 'top-end', 'bottom-end'] } },
        { name: 'preventOverflow', options: { rootBoundary: 'viewport', padding: 8 } },
        { name: 'offset', options: { offset: [0, 8] } }
      ]
    });

    return () => {
      popperInstance.current?.destroy();
      popperInstance.current = null;
    };
  }, [calendarOpen]);

  useEffect(() => {
    if (!calendarOpen) return undefined;

    const handleClickOutside = (event) => {
      if (
        anchorRef.current && !anchorRef.current.contains(event.target) &&
        popoverRef.current && !popoverRef.current.contains(event.target)
      ) {
        setCalendarOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setCalendarOpen(false);
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [calendarOpen]);

  const handleDateSelect = (selected) => {
    if (!selected || disabled) return;
    setCalendarOpen(false);
    onChange(toIsoDate(selected), time || '');
  };

  const handleTimeChange = (event) => {
    setLocalTime(event.target.value);
    if (timeError) setTimeError('');
  };

  const handleTimeBlur = () => {
    if (disabled) return;
    if (!localTime.trim()) {
      setTimeError(required ? 'Please enter a time.' : '');
      onChange(date || '', '');
      return;
    }

    const normalized = normalizeTimeInput(localTime);
    if (!normalized) {
      setTimeError('Invalid time. Use 09:00, 13:00 or 9:00 AM.');
      return;
    }

    setLocalTime(normalized);
    setTimeError('');
    onChange(date || '', normalized);
  };

  return (
    <div className="datetime-picker">
      <label htmlFor={fieldId} className="datetime-picker-label">
        {label}
      </label>
      <div className="datetime-picker-row">
        <div className="datetime-field datetime-field--date">
          <button
            ref={anchorRef}
            type="button"
            className="datetime-date-button"
            onClick={() => setCalendarOpen((open) => !open)}
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={calendarOpen}
          >
            <span>{formattedDate || 'Select date'}</span>
            <span className="material-symbols-outlined">calendar_month</span>
          </button>
        </div>

        <div className="datetime-field datetime-field--time">
          <input
            id={`${fieldId}-time`}
            type="text"
            value={localTime}
            onChange={handleTimeChange}
            onBlur={handleTimeBlur}
            disabled={disabled}
            required={required}
            placeholder="09:00"
            list={`${fieldId}-time-suggestions`}
            className="datetime-time-input"
            aria-label={`${label} time`}
          />
          <datalist id={`${fieldId}-time-suggestions`}>
            {TIME_SUGGESTIONS.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </div>
      </div>

      {calendarOpen && typeof document !== 'undefined' && createPortal(
        <div ref={popoverRef} className="day-picker-popover" role="dialog" aria-modal="false">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={{ before: parseIsoDate(minDate) }}
          />
        </div>,
        document.body
      )}

      {timeError && (
        <p className="datetime-validation" role="alert">{timeError}</p>
      )}
    </div>
  );
}
