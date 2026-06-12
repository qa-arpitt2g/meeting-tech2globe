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

export function nextTimeAfterStart(startTime, minGapMinutes = 1) {
  const next = parseTimeToMinutes(startTime) + minGapMinutes;
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

function filterTimeSuggestions(minTime) {
  if (!minTime) return TIME_SUGGESTIONS;
  return TIME_SUGGESTIONS.filter((value) => value >= minTime);
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
  const effectiveDate = fixedDate || date;

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [localTime, setLocalTime] = useState(time || '');
  const [timeError, setTimeError] = useState('');

  const combinedRef = useRef(null);
  const dateRef = useRef(null);
  const timeRef = useRef(null);
  const calendarPopoverRef = useRef(null);
  const timePopoverRef = useRef(null);
  const calendarPopper = useRef(null);
  const timePopper = useRef(null);

  const selectedDate = useMemo(() => coerceDate(effectiveDate), [effectiveDate]);
  const formattedDate = selectedDate ? formatDateDisplay(selectedDate) : '';
  const timeSuggestions = useMemo(() => filterTimeSuggestions(minTime), [minTime]);

  useEffect(() => {
    setLocalTime(time || '');
  }, [time]);

  useEffect(() => {
    if (!calendarOpen) return;
    if (!dateRef.current || !calendarPopoverRef.current) return;

    calendarPopper.current = createPopper(dateRef.current, calendarPopoverRef.current, {
      placement: 'bottom-start',
      modifiers: [
        { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start', 'top-end', 'bottom-end'] } },
        { name: 'preventOverflow', options: { rootBoundary: 'viewport', padding: 8 } },
        { name: 'offset', options: { offset: [0, 8] } }
      ]
    });

    return () => {
      calendarPopper.current?.destroy();
      calendarPopper.current = null;
    };
  }, [calendarOpen]);

  useEffect(() => {
    if (!timeOpen) return;
    if (!timeRef.current || !timePopoverRef.current) return;

    timePopper.current = createPopper(timeRef.current, timePopoverRef.current, {
      placement: 'bottom-end',
      modifiers: [
        { name: 'flip', options: { fallbackPlacements: ['top-end', 'bottom-end', 'top-start', 'bottom-start'] } },
        { name: 'preventOverflow', options: { rootBoundary: 'viewport', padding: 8 } },
        { name: 'offset', options: { offset: [0, 8] } }
      ]
    });

    return () => {
      timePopper.current?.destroy();
      timePopper.current = null;
    };
  }, [timeOpen]);

  useEffect(() => {
    if (!calendarOpen && !timeOpen) return undefined;

    const handleClickOutside = (event) => {
      const target = event.target;

      if (calendarOpen) {
        const inCalendar =
          dateRef.current?.contains(target) ||
          calendarPopoverRef.current?.contains(target);
        if (!inCalendar) setCalendarOpen(false);
      }

      if (timeOpen) {
        const inTime =
          timeRef.current?.contains(target) ||
          timePopoverRef.current?.contains(target);
        if (!inTime) setTimeOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setCalendarOpen(false);
        setTimeOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [calendarOpen, timeOpen]);

  const commitTime = (rawValue) => {
    if (disabled) return;

    if (!rawValue.trim()) {
      setTimeError(required ? 'Please enter a time.' : '');
      onChange(effectiveDate || '', '');
      return;
    }

    const normalized = normalizeTimeInput(rawValue);
    if (!normalized) {
      setTimeError('Invalid time. Use 24-hour format (e.g. 09:00).');
      return;
    }

    if (minTime && normalized < minTime) {
      setTimeError(`Time must be ${minTime} or later.`);
      return;
    }

    setLocalTime(normalized);
    setTimeError('');
    onChange(effectiveDate || '', normalized);
  };

  const handleDateSelect = (selected) => {
    if (!selected || disabled || fixedDate) return;
    setCalendarOpen(false);
    onChange(toIsoDate(selected), time || localTime || '');
  };

  const handleTimeChange = (event) => {
    setLocalTime(event.target.value);
    if (timeError) setTimeError('');
  };

  const handleTimeBlur = () => {
    commitTime(localTime);
  };

  const handleTimeSelect = (value) => {
    setLocalTime(value);
    setTimeError('');
    setTimeOpen(false);
    onChange(effectiveDate || '', value);
  };

  const openCalendar = () => {
    if (disabled || fixedDate) return;
    setTimeOpen(false);
    setCalendarOpen((open) => !open);
  };

  const openTimeDropdown = () => {
    if (disabled) return;
    setCalendarOpen(false);
    setTimeOpen((open) => !open);
  };

  const handleTimeKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitTime(localTime);
      setTimeOpen(false);
    }
    if (event.key === 'ArrowDown' && !timeOpen) {
      event.preventDefault();
      openTimeDropdown();
    }
  };

  return (
    <div className="datetime-picker">
      <span id={`${fieldId}-label`} className="datetime-picker-label">
        {label}
      </span>

      <div
        ref={combinedRef}
        className={`datetime-picker-combined${disabled ? ' datetime-picker-combined--disabled' : ''}`}
        role="group"
        aria-labelledby={`${fieldId}-label`}
      >
        <button
          ref={dateRef}
          type="button"
          className="datetime-combined__date"
          onClick={openCalendar}
          disabled={disabled || Boolean(fixedDate)}
          aria-haspopup="dialog"
          aria-expanded={calendarOpen}
          aria-label={formattedDate ? `Date: ${formattedDate}` : 'Select date'}
        >
          <span className="material-symbols-outlined datetime-combined__icon" aria-hidden="true">
            calendar_month
          </span>
          <span className="datetime-combined__date-text">
            {formattedDate || 'Select date'}
          </span>
        </button>

        <span className="datetime-combined__divider" aria-hidden="true" />

        <div ref={timeRef} className="datetime-combined__time">
          <button
            type="button"
            className="datetime-combined__time-icon-btn"
            onClick={openTimeDropdown}
            disabled={disabled}
            tabIndex={-1}
            aria-label="Open time picker"
          >
            <span className="material-symbols-outlined datetime-combined__icon" aria-hidden="true">
              schedule
            </span>
          </button>

          <input
            id={`${fieldId}-time`}
            type="text"
            inputMode="numeric"
            value={localTime}
            onChange={handleTimeChange}
            onBlur={handleTimeBlur}
            onKeyDown={handleTimeKeyDown}
            onFocus={() => setCalendarOpen(false)}
            disabled={disabled}
            required={required}
            placeholder="09:00"
            className="datetime-combined__time-input"
            aria-label={`${label} time`}
            aria-expanded={timeOpen}
            aria-haspopup="listbox"
            autoComplete="off"
          />

          <button
            type="button"
            className="datetime-combined__chevron"
            onClick={openTimeDropdown}
            disabled={disabled}
            aria-label="Toggle time options"
            aria-expanded={timeOpen}
          >
            <span className="material-symbols-outlined" aria-hidden="true">expand_more</span>
          </button>
        </div>
      </div>

      {calendarOpen && typeof document !== 'undefined' && createPortal(
        <div ref={calendarPopoverRef} className="day-picker-popover" role="dialog" aria-modal="false">
          <DayPicker
            mode="single"
            navLayout="around"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={{ before: parseIsoDate(minDate) }}
          />
        </div>,
        document.body
      )}

      {timeOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={timePopoverRef}
          className="datetime-time-popover"
          role="listbox"
          aria-label="Time options"
        >
          {timeSuggestions.map((value) => (
            <button
              key={value}
              type="button"
              role="option"
              aria-selected={localTime === value}
              className={`datetime-time-option${localTime === value ? ' datetime-time-option--selected' : ''}`}
              onClick={() => handleTimeSelect(value)}
            >
              {value}
            </button>
          ))}
        </div>,
        document.body
      )}

      {timeError && (
        <p className="datetime-validation" role="alert">{timeError}</p>
      )}
    </div>
  );
}
