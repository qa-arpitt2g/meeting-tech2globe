"use client";

import { useMemo, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FeatureCard from '../components/FeatureCard';
import StatusCard from '../components/StatusCard';

/* ── Static data ─────────────────────────────────────────────── */
const featureCards = [
  {
    type: 'conference',
    title: 'Conference Room',
    description:
      'Spacious environments designed for high-impact presentations, board meetings, and collaborative workshops for teams',
    features: ['Video Conferencing Enabled', 'Catering Services Available'],
    buttonText: 'Book Conference Room',
    buttonVariant: 'primary',
    icon: 'groups',
    image:
      '/assets/Conference.png',
    alt: 'Conference room interior',
    capacity: '8–20 seats'
  },
  {
    type: 'meeting',
    title: 'Meeting Room',
    description:
      'Intimate settings tailored for quick syncs, 1-on-1s, or focused brainstorming sessions. Optimized for 2-6 participants.',
    features: ['Instant Booking Access', 'Interactive Whiteboards'],
    buttonText: 'Book Meeting Room',
    buttonVariant: 'secondary',
    icon: 'meeting_room',
    image:
      '/assets/Meeting.png',
    alt: 'Meeting room interior',
    capacity: '2–6 seats'
  }
];


/* ── Form helpers ────────────────────────────────────────────── */
const initialFormData = {
  date: '',
  startTime: '09:00',
  endTime: '10:00',
  agenda: '',
  bookingName: '',
  organizerEmail: '',
  remarks: ''
};

function todayValue() {
  return new Date().toISOString().split('T')[0];
}

function timeOptions() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 || 12;
      const displayMin = String(m).padStart(2, '0');
      slots.push({ value, label: `${displayHour}:${displayMin} ${period}` });
    }
  }
  return slots;
}

/* ── Page ────────────────────────────────────────────────────── */
export default function Home() {
  const availableTimes = useMemo(() => timeOptions(), []);

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
    if (!formData.date) throw new Error('Please select a booking date.');
    if (formData.date < todayValue()) throw new Error('Backdate bookings are not allowed.');
    if (!formData.startTime || !formData.endTime) throw new Error('Please select start and end times.');
    if (formData.startTime >= formData.endTime) throw new Error('End time must be after start time.');
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
      <main className="main-content">

        {/* ── Hero ── */}
        <section className="home-hero container">
          <h1>Room Booking Portal</h1>
          <p>
            Reserve Conference Rooms and Meeting Rooms in Seconds. Experience
            frictionless workplace logistics with our enterprise-grade scheduling platform.
          </p>
        </section>

        {/* ── Feature Cards ── */}
        <section className="section-grid container">
          {featureCards.map((card) => (
            <FeatureCard key={card.title} {...card} onBook={() => openModal(card)} />
          ))}
        </section>

      </main>

      <Footer />

      {/* ── Booking Modal ── */}
      {selectedRoom && (
        <div
          className="booking-modal-backdrop"
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <section
            className="booking-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Header */}
            <div className="booking-modal-header">
              <div className="booking-modal-title">
                <div className="modal-room-icon" aria-hidden="true">
                  <span className="material-symbols-outlined">event</span>
                </div>
                <div>
                  <h2 id="modal-title">Reserve a Space</h2>
                  <p>Tech2Globe HQ &bull; {selectedRoom.title}</p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-button"
                onClick={closeModal}
                aria-label="Close booking form"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Form */}
            <form className="booking-form" id="bookingForm" onSubmit={handleSubmit}>
              <div className="availability-banner" role="status">
                <span className="material-symbols-outlined">verified</span>
                <p>All times selected are currently available.</p>
              </div>

              {/* 1. Date + Start Time + End Time */}
              <div className="form-row three-columns">
                <label htmlFor="bookingDate">
                  Date
                  <input
                    id="bookingDate"
                    name="date"
                    type="date"
                    min={todayValue()}
                    value={formData.date}
                    onChange={updateField}
                    required
                  />
                </label>
                <label htmlFor="startTime">
                  Start Time
                  <select id="startTime" name="startTime" value={formData.startTime} onChange={updateField} required>
                    {availableTimes.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="endTime">
                  End Time
                  <select id="endTime" name="endTime" value={formData.endTime} onChange={updateField} required>
                    {availableTimes.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* 2. Meeting Agenda */}
              <label htmlFor="agenda">
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
              <label htmlFor="bookingName">
                Booking Person
                <input
                  id="bookingName"
                  name="bookingName"
                  type="text"
                  value={formData.bookingName}
                  onChange={updateField}
                  placeholder="e.g. Priya Sharma"
                  required
                />
              </label>

              {/* 4. Email */}
              <label htmlFor="organizerEmail">
                Organizer Email
                <input
                  id="organizerEmail"
                  name="organizerEmail"
                  type="email"
                  value={formData.organizerEmail}
                  onChange={updateField}
                  placeholder="organizer@enterprise.com"
                  required
                />
              </label>

              {/* Invite Guests */}
              <label>
                Invite Guests
                <div className="guest-input-shell">
                  {guests.map((guest) => (
                    <div key={guest} className="guest-tag">
                      <span>{guest}</span>
                      <button type="button" onClick={() => removeGuest(guest)} aria-label={`Remove ${guest}`}>
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  ))}
                  <input
                    type="text"
                    value={guestInput}
                    onBlur={() => addGuests(guestInput)}
                    onChange={(e) => setGuestInput(e.target.value)}
                    onKeyDown={handleGuestKeyDown}
                    placeholder="Add email..."
                  />
                </div>
                <p className="field-help">Press enter or comma to add guests</p>
              </label>

              {/* Additional Remarks */}
              <label htmlFor="remarks">
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
            <div className="booking-actions">
              <button type="submit" form="bookingForm" className="primary-button" disabled={processing}>
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
              <p className="billing-note">A confirmation invite will be sent to all participants</p>
            </div>
          </section>
        </div>
      )}

      {/* Toast */}
      <div
        role="status"
        aria-live="polite"
        className={`success-toast${toastType === 'error' ? ' toast-error' : ''}${toastVisible ? ' toast-visible' : ''}`}
      >
        <span className="material-symbols-outlined">{toastType === 'error' ? 'error' : 'task_alt'}</span>
        <span>{toastMessage}</span>
      </div>
    </>
  );
}
