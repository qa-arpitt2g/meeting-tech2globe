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

function formatEmailDate(isoDate) {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

function todayValue() {
  return new Date().toISOString().split('T')[0];
}

function capitalizeName(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function extractGuestFirstName(email) {
  const localPart = String(email || '').split('@')[0].split('+')[0];
  const segments = localPart.split(/[_\.\-]+/).filter(Boolean);
  return capitalizeName(segments[0] || localPart || '');
}

function formatGuestNames(guests) {
  if (!Array.isArray(guests) || guests.length === 0) return 'None';
  const names = guests.map((guest) => extractGuestFirstName(guest)).filter(Boolean);
  return names.length ? names.join(', ') : 'None';
}

function timeToMinutes(value) {
  const [hour = '0', minute = '0'] = String(value).split(':').map(Number);
  return hour * 60 + minute;
}

function hasOverlap(existingStart, existingEnd, requestedStart, requestedEnd) {
  const existStart = timeToMinutes(existingStart);
  const existEnd = timeToMinutes(existingEnd);
  const reqStart = timeToMinutes(requestedStart);
  const reqEnd = timeToMinutes(requestedEnd);
  return reqStart < existEnd && reqEnd > existStart;
}

function calculateDurationMinutes(startTime, endTime) {
  const [startHour, startMin = '0'] = startTime.split(':').map(Number);
  const [endHour, endMin = '0'] = endTime.split(':').map(Number);
  const startTotalMin = startHour * 60 + startMin;
  const endTotalMin = endHour * 60 + endMin;
  return endTotalMin - startTotalMin;
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

    const durationMinutes = calculateDurationMinutes(startTime, endTime);
    if (durationMinutes < 1) {
      return NextResponse.json({ error: 'Booking duration must be at least 1 minute.' }, { status: 400 });
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
        {
          error: `This ${roomLabel || roomType} is already booked on ${formatEmailDate(date)} from ${formatTime(conflictingBooking.startTime)} to ${formatTime(conflictingBooking.endTime)}.`
        },
        { status: 409 }
      );
    }

    const recipients = [...new Set([organizerEmail, ...guests])];
    const safeRoomLabel = escapeHtml(roomLabel || roomType);
    const safeBookingName = escapeHtml(bookingName);
    const safeAgenda = escapeHtml(agenda);
    const safeRemarks = escapeHtml(remarks || 'None');
    const displayDate = formatEmailDate(date);
    const safeDate = escapeHtml(displayDate);
    const safeStart = escapeHtml(formatTime(startTime));
    const safeEnd = escapeHtml(formatTime(endTime));
    const guestNames = escapeHtml(formatGuestNames(guests));

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;">
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;">
                  <tr>
                    <td style="background-color:#2563eb;padding:32px 24px;border-radius:8px 8px 0 0;text-align:center;color:#ffffff;">
                      <h1 style="margin:0;font-size:24px;font-weight:700;line-height:1.4;">Booking Confirmed</h1>
                      <p style="margin:12px 0 0 0;font-size:15px;line-height:1.5;">Your room booking has been successfully confirmed.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px 24px;">
                      <table width="100%" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:16px 0;border-bottom:1px solid #f3f4f6;">
                            <div style="font-weight:700;color:#374151;margin-bottom:6px;font-size:13px;">Room</div>
                            <div style="color:#111827;font-size:14px;">${safeRoomLabel}</div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:16px 0;border-bottom:1px solid #f3f4f6;">
                            <div style="font-weight:700;color:#374151;margin-bottom:6px;font-size:13px;">Meeting Agenda</div>
                            <div style="color:#111827;font-size:14px;">${safeAgenda}</div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:16px 0;border-bottom:1px solid #f3f4f6;">
                            <div style="font-weight:700;color:#374151;margin-bottom:6px;font-size:13px;">Booking Person</div>
                            <div style="color:#111827;font-size:14px;">${safeBookingName}</div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:16px 0;border-bottom:1px solid #f3f4f6;">
                            <div style="font-weight:700;color:#374151;margin-bottom:6px;font-size:13px;">Time</div>
                            <div style="color:#111827;font-size:14px;line-height:1.5;">${safeDate}<br />${safeStart} - ${safeEnd}</div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:16px 0;border-bottom:1px solid #f3f4f6;">
                            <div style="font-weight:700;color:#374151;margin-bottom:6px;font-size:13px;">Guest</div>
                            <div style="color:#111827;font-size:14px;">${guestNames}</div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:16px 0;">
                            <div style="font-weight:700;color:#374151;margin-bottom:6px;font-size:13px;">Remarks</div>
                            <div style="color:#111827;font-size:14px;">${safeRemarks}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px;border-top:1px solid #f3f4f6;text-align:center;color:#6b7280;font-size:13px;line-height:1.5;">
                      Thank you for using the Tech2Globe Room Booking Portal.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 24px 16px;text-align:center;color:#9ca3af;font-size:12px;">
                      © Tech2Globe
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const text = [
      'Booking Confirmed',
      '',
      'Your room booking has been successfully confirmed.',
      '',
      `Room: ${roomLabel || roomType}`,
      `Meeting Agenda: ${agenda}`,
      `Booking Person: ${bookingName}`,
      `Time: ${displayDate}`,
      `${formatTime(startTime)} - ${formatTime(endTime)}`,
      `Guest: ${guestNames || 'None'}`,
      `Remarks: ${remarks || 'None'}`,
      '',
      'Thank you for using the Tech2Globe Room Booking Portal.',
      '© Tech2Globe'
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
