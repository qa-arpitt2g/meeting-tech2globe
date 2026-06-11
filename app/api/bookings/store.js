export const bookings = globalThis.__bookingPortalBookings || [];

if (!globalThis.__bookingPortalBookings) {
  globalThis.__bookingPortalBookings = bookings;
}
