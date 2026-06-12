"use client";

import { useMemo, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FeatureCard from '../components/FeatureCard';
import StatusCard from '../components/StatusCard';
import DateTimePicker, {
  isValidTimeFormat,
  minTimeForToday,
  nextTimeAfterStart,
  parseTimeToMinutes,
  todayValue
} from '../components/DateTimePicker';

/* ── Static data ─────────────────────────────────────────────── */
const featureCards = [
  {
    type: 'conference',
    title: 'Conference Room',
    description:
      'Spacious environments designed for high-impact presentations, board meetings, and collaborative workshops for teams',
    buttonText: 'Book Conference Room',
    buttonVariant: 'primary',
    icon: 'groups',
    image:
      '/assets/Conference.png',
    alt: 'Conference room interior',
  },
  {
    type: 'meeting',
    title: 'Meeting Room',
    description:
      'Intimate settings tailored for quick syncs, 1-on-1s, or focused brainstorming sessions. Optimized for 2-6 participants.',
    buttonText: 'Book Meeting Room',
    buttonVariant: 'secondary',
    icon: 'meeting_room',
    image:
      '/assets/Meeting.png',
    alt: 'Meeting room interior',    
  }
];


/* ── Form helpers ────────────────────────────────────────────── */
const initialFormData = {
  date: '',
  startTime: '',
  endTime: '',
  agenda: '',
  bookingName: '',
  organizerEmail: '',
  remarks: ''
};


export default function Home() {
  /* Modal state */
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [guestInput, setGuestInput] = useState('');
  const [guests, setGuests] = useState([]);
  const [processing, setProcessing] = useState(false);

  /* Toast state */
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };

  const openModal = (card) => {
    setSelectedRoom(card);
    setFormData(initialFormData);
    setGuestInput('');
    setGuests([]);
  };

  const closeModal = () => { if (!processing) setSelectedRoom(null); };

  const updateField = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStartChange = (date, startTime) => {
    setFormData((prev) => {
      const next = { ...prev, date, startTime };
      const suggestedEnd = nextTimeAfterStart(startTime);
      if (!prev.endTime || !isValidTimeFormat(prev.endTime) || parseTimeToMinutes(prev.endTime) < parseTimeToMinutes(startTime) + 1) {
        next.endTime = suggestedEnd || '';
      }
      return next;
    });
  };

  const handleEndChange = (_date, endTime) => {
    setFormData((prev) => ({ ...prev, endTime }));
  };

  const startMinTime = useMemo(() => (
    formData.date === todayValue() ? minTimeForToday() : null
  ), [formData.date]);

  const endMinTime = useMemo(() => {
    if (!formData.date || !formData.startTime) {
      return formData.date === todayValue() ? minTimeForToday() : null;
    }
    return nextTimeAfterStart(formData.startTime);
  }, [formData.date, formData.startTime]);

  const addGuests = (value) => {
    const emails = value.split(',').map((e) => e.trim()).filter(Boolean);
    if (!emails.length) return;
    const bad = emails.find((e) => !isValidEmail(e));
    if (bad) { showToast(`Invalid email: ${bad}`, 'error'); return; }
    setGuests((prev) => [...new Set([...prev, ...emails])]);
    setGuestInput('');
  };

  const handleGuestKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addGuests(guestInput); }
  };

  const removeGuest = (email) => setGuests((prev) => prev.filter((g) => g !== email));

  const validateForm = (allGuests) => {
    if (!formData.date || !formData.startTime) throw new Error('Please select a start date and time.');
    if (!isValidTimeFormat(formData.startTime)) throw new Error('Please enter a valid start time.');
    if (formData.date < todayValue()) throw new Error('Backdate bookings are not allowed.');
    if (!formData.endTime) throw new Error('Please select an end time.');
    if (!isValidTimeFormat(formData.endTime)) throw new Error('Please enter a valid end time.');
    if (formData.date === todayValue() && formData.startTime < minTimeForToday()) {
      throw new Error('Start time cannot be in the past.');
    }
    if (parseTimeToMinutes(formData.endTime) - parseTimeToMinutes(formData.startTime) < 1) {
      throw new Error('Booking must be at least 1 minute and end after the start time.');
    }
    if (!formData.bookingName.trim()) throw new Error('Please enter the booking person name.');
    if (!isValidEmail(formData.organizerEmail)) throw new Error('Please enter a valid organizer email.');
    if (!formData.agenda.trim()) throw new Error('Please enter the meeting agenda.');
    if (allGuests.length === 0) throw new Error('Please add at least one guest email.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);

    const pending = guestInput.trim()
      ? [...new Set([...guests, ...guestInput.split(',').map((x) => x.trim()).filter(Boolean)])]
      : guests;

    try {
      const bad = pending.find((g) => !isValidEmail(g));
      if (bad) throw new Error(`Invalid guest email: ${bad}`);
      validateForm(pending);

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          roomType: selectedRoom.type,
          roomLabel: selectedRoom.title,
          guests: pending
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unable to complete booking.');

      setGuests(pending);
      setGuestInput('');
      setSelectedRoom(null);
      showToast('Booking confirmed. Email sent to all participants.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Header />
      <main className="bg-slate-50 bg-[radial-gradient(rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[length:24px_24px]">

        {/* ── Hero ── */}
        <section className="mx-auto grid max-w-7xl gap-4 px-4 py-10 md:grid-cols-2 md:items-center md:gap-[60px] md:px-8 md:max-h-[260px] sm:max-h-[220px]">
          <div className="flex min-w-0 items-center gap-4">
            <div className="mt-0 h-12 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-blue-600 to-violet-500 sm:h-14 md:h-16"></div>
            <h1 className="font-sans text-4xl font-extrabold leading-tight text-slate-950 text-center md:text-left sm:text-5xl md:text-5xl">
              <span>Room Booking</span>
              <span className="ml-1 bg-gradient-to-r from-blue-700 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">Portal</span>
            </h1>
          </div>
          <div className="min-w-0 md:pb-0">
            <p className="max-w-[500px] text-base leading-7 text-slate-600 text-center md:text-right md:text-lg md:leading-8 md:ml-auto">
              Reserve Conference Rooms and Meeting Rooms in Seconds. Experience frictionless workplace logistics with our enterprise-grade scheduling platform.
            </p>
          </div>
        </section>

        {/* ── Feature Cards ── */}
        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-12 sm:px-6 md:grid-cols-2 md:gap-5 lg:gap-8 lg:px-8 xl:pb-16">
          {featureCards.map((card) => (
            <FeatureCard key={card.title} {...card} onBook={() => openModal(card)} />
          ))}
        </section>

      </main>

      <Footer />

      {/* ── Booking Modal ── */}
      {selectedRoom && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <section
            className="flex max-h-[95svh] w-full flex-col overflow-hidden overflow-x-hidden rounded-t-xl bg-white shadow-2xl sm:max-h-[calc(100svh-2rem)] sm:max-w-2xl sm:rounded-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700" aria-hidden="true">
                  <span className="material-symbols-outlined text-[22px]">event</span>
                </div>
                <div className="min-w-0">
                  <h2 id="modal-title" className="truncate font-sans text-xl font-bold leading-7 text-slate-950">Reserve a Space</h2>
                  <p className="truncate text-sm font-medium text-slate-500">Tech2Globe &bull; {selectedRoom.title}</p>
                </div>
              </div>
              <button
                type="button"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={closeModal}
                aria-label="Close booking form"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Form */}
            <form className="grid flex-1 gap-4 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6" id="bookingForm" onSubmit={handleSubmit}>
              {/* 1. Start Date & Time + End Date & Time */}
              <div className="grid gap-4 md:grid-cols-2">
                <DateTimePicker
                  id="startTime"
                  label="Start Date & Time"
                  date={formData.date}
                  time={formData.startTime}
                  onChange={handleStartChange}
                  minDate={todayValue()}
                  minTime={startMinTime}
                  required
                />
                <DateTimePicker
                  id="endTime"
                  label="End Date & Time"
                  date={formData.date}
                  time={formData.endTime}
                  onChange={handleEndChange}
                  minDate={formData.date || todayValue()}
                  minTime={endMinTime}
                  fixedDate={formData.date || null}
                  disabled={!formData.date || !formData.startTime}
                  required
                />
              </div>

              {/* 2. Meeting Agenda */}
              <label htmlFor="agenda" className="grid gap-2 text-sm font-semibold text-slate-600">
                Meeting Agenda
                <textarea
                  id="agenda"
                  name="agenda"
                  value={formData.agenda}
                  onChange={updateField}
                  placeholder="Brief description of the meeting goals..."
                  rows="3"
                  required
                />
              </label>

              {/* 3. Booking Person */}
              <label htmlFor="bookingName" className="grid gap-2 text-sm font-semibold text-slate-600">
                Booking Person
                <input
                  id="bookingName"
                  name="bookingName"
                  type="text"
                  value={formData.bookingName}
                  onChange={updateField}
                  placeholder="Full Name"
                  required
                />
              </label>

              {/* 4. Email */}
              <label htmlFor="organizerEmail" className="grid gap-2 text-sm font-semibold text-slate-600">
                Organizer Email
                <input
                  id="organizerEmail"
                  name="organizerEmail"
                  type="email"
                  value={formData.organizerEmail}
                  onChange={updateField}
                  placeholder="Your Email Address"
                  required
                />
              </label>

              {/* Invite Guests */}
              <label className="grid gap-2 text-sm font-semibold text-slate-600">
                Invite Guests
                <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
                  {guests.map((guest) => (
                    <div key={guest} className="inline-flex max-w-full items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800">
                      <span className="truncate">{guest}</span>
                      <button type="button" className="grid h-5 w-5 shrink-0 place-items-center rounded-full hover:bg-blue-100" onClick={() => removeGuest(guest)} aria-label={`Remove ${guest}`}>
                        <span className="material-symbols-outlined text-[15px]">close</span>
                      </button>
                    </div>
                  ))}
                  <input
                    type="text"
                    value={guestInput}
                    onBlur={() => addGuests(guestInput)}
                    onChange={(e) => setGuestInput(e.target.value)}
                    onKeyDown={handleGuestKeyDown}
                    className="min-h-8 min-w-[140px] flex-1 border-0 bg-transparent p-0 text-sm shadow-none outline-none focus:ring-0"
                    placeholder="Add email..."
                  />
                </div>
                <p className="text-xs font-medium text-slate-500">Press enter or comma to add guests</p>
              </label>

              {/* Additional Remarks */}
              <label htmlFor="remarks" className="grid gap-2 text-sm font-semibold text-slate-600">
                Additional Remarks (Optional)
                <textarea
                  id="remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={updateField}
                  placeholder="Catering, equipment needs, etc."
                  rows="2"
                />
              </label>
            </form>

            {/* Footer / Submit */}
            <div className="grid shrink-0 gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
              <button type="submit" form="bookingForm" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-700 to-sky-500 px-5 py-3 text-base font-semibold text-white shadow-md transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg" disabled={processing}>
                {processing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">bolt</span>
                    Book Now
                  </>
                )}
              </button>
              <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">A confirmation invite will be sent to all participants</p>
            </div>
          </section>
        </div>
      )}

      {/* Toast */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed left-1/2 top-4 z-[60] inline-flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-xl transition-transform duration-300 sm:text-base ${toastType === 'error' ? 'bg-red-700' : 'bg-blue-700'} ${toastVisible ? 'translate-y-0' : '-translate-y-24'}`}
      >
        <span className="material-symbols-outlined">{toastType === 'error' ? 'error' : 'task_alt'}</span>
        <span>{toastMessage}</span>
      </div>
    </>
  );
}
