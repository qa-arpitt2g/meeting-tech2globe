import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';
import { bookings } from './store';

export const runtime = 'nodejs';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatTime(value) {
  if (!value) return '';
  const [hourValue, minute = '00'] = value.split(':');
  const hour = Number(hourValue);
  if (Number.isNaN(hour)) return value;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${period}`;
}

function todayValue() {
  return new Date().toISOString().split('T')[0];
}

function hasOverlap(existingStart, existingEnd, requestedStart, requestedEnd) {
  return requestedStart < existingEnd && requestedEnd > existingStart;
}

function getTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 465);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error('Email settings are incomplete.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user,
      pass
    }
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const roomType = String(body.roomType || '').trim();
    const roomLabel = String(body.roomLabel || '').trim();
    const bookingName = String(body.bookingName || '').trim();
    const organizerEmail = String(body.organizerEmail || '').trim();
    const date = String(body.date || '').trim();
    const startTime = String(body.startTime || '').trim();
    const endTime = String(body.endTime || '').trim();
    const agenda = String(body.agenda || '').trim();
    const remarks = String(body.remarks || '').trim();
    const guests = Array.isArray(body.guests)
      ? body.guests.map((guest) => String(guest).trim()).filter(Boolean)
      : [];

    if (!['conference', 'meeting'].includes(roomType)) {
      return NextResponse.json({ error: 'Please select a valid room type.' }, { status: 400 });
    }

    if (!date || !startTime || !endTime || !agenda || !bookingName || !organizerEmail) {
      return NextResponse.json({ error: 'Please fill all required booking fields.' }, { status: 400 });
    }

    if (date < todayValue()) {
      return NextResponse.json({ error: 'Backdate bookings are not allowed.' }, { status: 400 });
    }

    if (startTime >= endTime) {
      return NextResponse.json({ error: 'End time must be after start time.' }, { status: 400 });
    }

    if (!emailPattern.test(organizerEmail)) {
      return NextResponse.json({ error: 'Please enter a valid booking person email.' }, { status: 400 });
    }

    if (guests.length === 0) {
      return NextResponse.json({ error: 'Please add at least one guest email.' }, { status: 400 });
    }

    const invalidGuest = guests.find((guest) => !emailPattern.test(guest));
    if (invalidGuest) {
      return NextResponse.json({ error: `Invalid guest email: ${invalidGuest}` }, { status: 400 });
    }

    const conflictingBooking = bookings.find((booking) => (
      booking.roomType === roomType
      && booking.date === date
      && hasOverlap(booking.startTime, booking.endTime, startTime, endTime)
    ));

    if (conflictingBooking) {
      return NextResponse.json(
        { error: `This ${roomLabel || roomType} is already booked from ${formatTime(conflictingBooking.startTime)} to ${formatTime(conflictingBooking.endTime)}.` },
        { status: 409 }
      );
    }

    const recipients = [...new Set([organizerEmail, ...guests])];
    const safeRoomLabel = escapeHtml(roomLabel || roomType);
    const safeBookingName = escapeHtml(bookingName);
    const safeAgenda = escapeHtml(agenda);
    const safeRemarks = escapeHtml(remarks || 'None');
    const safeDate = escapeHtml(date);
    const safeStart = escapeHtml(formatTime(startTime));
    const safeEnd = escapeHtml(formatTime(endTime));

    const html = `
      <div style="font-family:Arial,sans-serif;color:#001e2e;line-height:1.5">
        <h2 style="color:#111844;margin:0 0 16px">Booking Confirmed</h2>
        <p>Your room booking has been confirmed.</p>
        <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid #e0e0e0">
          <tr><td><strong>Room Type</strong></td><td>${safeRoomLabel}</td></tr>
          <tr><td><strong>Booking Name</strong></td><td>${safeBookingName}</td></tr>
          <tr><td><strong>Date</strong></td><td>${safeDate}</td></tr>
          <tr><td><strong>Time</strong></td><td>${safeStart} - ${safeEnd}</td></tr>
          <tr><td><strong>Agenda</strong></td><td>${safeAgenda}</td></tr>
          <tr><td><strong>Remarks</strong></td><td>${safeRemarks}</td></tr>
        </table>
      </div>
    `;

    const text = [
      'Booking Confirmed',
      '',
      `Room Type: ${roomLabel || roomType}`,
      `Booking Name: ${bookingName}`,
      `Date: ${date}`,
      `Time: ${formatTime(startTime)} - ${formatTime(endTime)}`,
      `Agenda: ${agenda}`,
      `Remarks: ${remarks || 'None'}`
    ].join('\n');

    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipients,
      subject: `Booking Confirmed: ${roomLabel || roomType} - ${bookingName}`,
      text,
      html
    });

    bookings.push({
      id: crypto.randomUUID(),
      roomType,
      roomLabel: roomLabel || roomType,
      date,
      startTime,
      endTime,
      bookingName,
      organizerEmail,
      guests,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, recipients });
  } catch (error) {
    console.error('Booking email failed:', error);
    return NextResponse.json({ error: 'Unable to send booking email right now.' }, { status: 500 });
  }
}
