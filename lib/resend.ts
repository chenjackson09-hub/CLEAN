import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Clean <noreply@resend.dev>";

export async function sendBookingAccepted(opts: {
  customerEmail: string;
  customerName: string;
  cleanerName: string;
  cleanerPhone: string;
  scheduledDate: string;
  scheduledStart: string;
  address: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.customerEmail,
    subject: "Your booking was accepted",
    html: `
      <p>Hi ${opts.customerName},</p>
      <p><strong>${opts.cleanerName}</strong> has accepted your booking request.</p>
      <p><strong>Date:</strong> ${opts.scheduledDate} at ${opts.scheduledStart.slice(0, 5)}<br/>
      <strong>Address:</strong> ${opts.address}</p>
      <p>You can reach ${opts.cleanerName} at: <strong>${opts.cleanerPhone}</strong></p>
      <p>Please settle payment directly with your cleaner after the job.</p>
    `,
  });
}

export async function sendBookingDeclined(opts: {
  customerEmail: string;
  customerName: string;
  cleanerName: string;
  scheduledDate: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.customerEmail,
    subject: "Booking request declined",
    html: `
      <p>Hi ${opts.customerName},</p>
      <p>Unfortunately <strong>${opts.cleanerName}</strong> is unable to accept your booking for ${opts.scheduledDate}.</p>
      <p>You can browse other available cleaners and send a new request.</p>
    `,
  });
}

export async function sendApplicationApproved(opts: {
  cleanerEmail: string;
  cleanerName: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.cleanerEmail,
    subject: "Your application has been approved",
    html: `
      <p>Hi ${opts.cleanerName},</p>
      <p>Great news — your Clean application has been <strong>approved</strong>!</p>
      <p>Log in to complete your profile, set your availability, and start receiving booking requests.</p>
    `,
  });
}

export async function sendApplicationRejected(opts: {
  cleanerEmail: string;
  cleanerName: string;
  notes?: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.cleanerEmail,
    subject: "Update on your Clean application",
    html: `
      <p>Hi ${opts.cleanerName},</p>
      <p>After reviewing your application, we're unable to approve it at this time.</p>
      ${opts.notes ? `<p><strong>Notes:</strong> ${opts.notes}</p>` : ""}
      <p>If you have questions, please contact support.</p>
    `,
  });
}

export async function sendNewBookingRequest(opts: {
  cleanerEmail: string;
  cleanerName: string;
  customerName: string;
  scheduledDate: string;
  scheduledStart: string;
  address: string;
  serviceType: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.cleanerEmail,
    subject: `New booking request from ${opts.customerName}`,
    html: `
      <p>Hi ${opts.cleanerName},</p>
      <p>You have a new booking request from <strong>${opts.customerName}</strong>.</p>
      <p><strong>Date:</strong> ${opts.scheduledDate} at ${opts.scheduledStart.slice(0, 5)}<br/>
      <strong>Address:</strong> ${opts.address}<br/>
      <strong>Service:</strong> ${opts.serviceType}</p>
      <p>Log in to accept or decline within 24 hours.</p>
    `,
  });
}
