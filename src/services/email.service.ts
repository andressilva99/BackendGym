import nodemailer from "nodemailer";

// Si el servidor de correo no responde, cortamos en segundos en vez de quedar colgados
const timeouts = {
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000
};

const transporter = nodemailer.createTransport(
  process.env.EMAIL_SERVICE
    ? {
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        ...timeouts
      }
    : {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        ...timeouts
      }
);

interface BookingEmailData {
  firstName: string;
  lastName: string;
  email: string;
  whatsapp: number;
  courtName: string;
  date: Date;
  startTime: string;
  endTime: string;
  paidAmount: number;
}

// La fecha del turno se guarda como medianoche UTC del día ("2026-09-25T00:00:00Z"): formatear
// en hora argentina mostraría el día anterior, por eso se formatea en UTC.
const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("es-AR", { timeZone: "UTC" });

interface MailOptions {
  from?: string;
  to: string;
  subject: string;
  html: string;
}

// Acepta "correo@dominio.com" o "Nombre <correo@dominio.com>"
const parseSender = (from = "") => {
  const match = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  return match
    ? { name: match[1].trim() || "Oxígeno Espacio Deportivo", email: match[2].trim() }
    : { name: "Oxígeno Espacio Deportivo", email: from.trim() };
};

// Brevo envía por HTTPS (puerto 443): sirve en hostings que bloquean SMTP, como el plan gratis de Render.
const sendWithBrevo = async ({ from, to, subject, html }: MailOptions) => {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY as string,
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({ sender: parseSender(from), to: [{ email: to }], subject, htmlContent: html }),
    signal: AbortSignal.timeout(15_000)
  });

  if (!response.ok) {
    throw new Error(`Brevo respondió ${response.status}: ${await response.text()}`);
  }
};

// Si está BREVO_API_KEY se usa la API HTTP de Brevo; si no, SMTP con nodemailer
const sendMail = async (options: MailOptions) => {
  if (process.env.BREVO_API_KEY) {
    await sendWithBrevo(options);
  } else {
    await transporter.sendMail(options);
  }
  console.log(`📧 Email enviado a ${options.to}: ${options.subject}`);
};

/* ===== Datos de pago y contacto =====
 * Se pueden cambiar desde las variables de entorno de Render sin tocar el código.
 * Si una variable no está cargada, se usa el valor por defecto.
 */
const paymentInfo = () => ({
  alias: process.env.PAYMENT_ALIAS || "vero.oxigeno",
  holder: process.env.PAYMENT_HOLDER || "Veronica Del Valle Alvarez Rojas",
  cuit: process.env.PAYMENT_CUIT || "27-24656493-6",
  bank: process.env.PAYMENT_BANK || "Mercado Pago",
  // Solo números, con código de país (549 + característica + número)
  whatsapp: (process.env.CONTACT_WHATSAPP || "5493564619223").replace(/\D/g, ""),
  cancelNoticeHours: Number(process.env.CANCEL_NOTICE_HOURS) || 2
});

// Todo dato que viene del formulario se escapa antes de ir al HTML del email
const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );

const formatMoney = (amount: number) => `$${Number(amount || 0).toLocaleString("es-AR")}`;

// "5493564619223" → "+54 9 3564 61-9223"
const formatWhatsapp = (digits: string) =>
  digits.length === 13
    ? `+${digits.slice(0, 2)} ${digits.slice(2, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 9)}-${digits.slice(9)}`
    : `+${digits}`;

const whatsappLink = (phone: string, message: string) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

const row = (label: string, value: string) => `
  <tr>
    <td style="padding:6px 0;color:#6b7280;font-size:14px;width:130px;vertical-align:top">${label}</td>
    <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600">${value}</td>
  </tr>`;

const customerHtml = (data: BookingEmailData, formattedDate: string) => {
  const pay = paymentInfo();
  const name = `${data.firstName} ${data.lastName}`;
  const turno = `${formattedDate} de ${data.startTime} a ${data.endTime} en ${data.courtName}`;

  const receiptLink = whatsappLink(pay.whatsapp, `Hola! Te envío el comprobante de mi turno del ${turno}, a nombre de ${name}.`);
  const cancelLink = whatsappLink(pay.whatsapp, `Hola! Quiero cancelar mi turno del ${turno}, a nombre de ${name}.`);

  return `
  <div style="background:#f5f7fb;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:#023e8a;background:linear-gradient(135deg,#023e8a,#0077b6);padding:24px;color:#ffffff">
        <div style="font-size:13px;opacity:0.85">Oxígeno Espacio Deportivo</div>
        <div style="font-size:24px;font-weight:bold;margin-top:4px">¡Turno reservado!</div>
      </div>

      <div style="padding:24px">
        <p style="margin:0 0 16px;font-size:15px;color:#111827">
          Hola <strong>${escapeHtml(name)}</strong>, tu turno quedó reservado con estos datos:
        </p>
        <table role="presentation" style="width:100%;border-collapse:collapse">
          ${row("Cancha", escapeHtml(data.courtName))}
          ${row("Fecha", escapeHtml(formattedDate))}
          ${row("Horario", `${escapeHtml(data.startTime)} a ${escapeHtml(data.endTime)}`)}
          ${row("Monto a abonar", `<span style="color:#0077b6;font-size:16px">${formatMoney(data.paidAmount)}</span>`)}
        </table>

        <div style="margin-top:20px;padding:16px;border-radius:12px;background:#f0f7ff;border:1px solid #cfe3fb">
          <div style="font-size:16px;font-weight:bold;color:#023e8a;margin-bottom:4px">💳 Formas de pago</div>
          <div style="font-size:14px;color:#4b5563;margin-bottom:12px">Podés abonar tu turno de cualquiera de estas dos formas:</div>

          <div style="font-size:15px;font-weight:bold;color:#111827">1. Transferencia</div>
          <table role="presentation" style="width:100%;border-collapse:collapse">
            ${row("Alias", `<span style="font-size:16px">${escapeHtml(pay.alias)}</span>`)}
            ${row("Titular", escapeHtml(pay.holder))}
            ${row("CUIT", escapeHtml(pay.cuit))}
            ${row("Banco / billetera", escapeHtml(pay.bank))}
          </table>
          <div style="font-size:13px;color:#6b7280;margin-top:4px">Si transferís, envianos el comprobante por WhatsApp con el botón de abajo.</div>

          <div style="border-top:1px solid #cfe3fb;margin:14px 0"></div>

          <div style="font-size:15px;font-weight:bold;color:#111827">2. 💵 Efectivo</div>
          <div style="font-size:14px;color:#374151;margin-top:4px">Podés abonar en efectivo en el momento de llegar a la cancha.</div>
        </div>

        <div style="margin-top:20px;padding:16px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb">
          <div style="font-size:16px;font-weight:bold;color:#111827">📲 ¿Necesitás comunicarte con nosotros?</div>
          <div style="font-size:14px;color:#4b5563;margin:6px 0 14px">WhatsApp: <strong>${formatWhatsapp(pay.whatsapp)}</strong></div>
          <a href="${receiptLink}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 20px;border-radius:8px;margin:0 8px 8px 0">Enviar comprobante</a>
          <a href="${cancelLink}" style="display:inline-block;background:#ffffff;color:#374151;text-decoration:none;font-weight:bold;font-size:14px;padding:11px 19px;border-radius:8px;border:1px solid #d1d5db;margin:0 0 8px 0">Cancelar turno</a>
          <div style="font-size:13px;color:#6b7280;margin-top:8px">
            Si no podés venir, avisanos con al menos <strong>${pay.cancelNoticeHours} horas</strong> de anticipación.
          </div>
        </div>

        <p style="margin:24px 0 0;font-size:15px;color:#111827">¡Te esperamos!</p>
      </div>
    </div>
  </div>`;
};

const adminHtml = (data: BookingEmailData, formattedDate: string) => `
  <div style="font-family:Arial,Helvetica,sans-serif">
    <h2 style="color:#023e8a">Nuevo turno reservado</h2>
    <table role="presentation" style="border-collapse:collapse">
      ${row("Cliente", escapeHtml(`${data.firstName} ${data.lastName}`))}
      ${row("Email", escapeHtml(data.email))}
      ${row("WhatsApp", escapeHtml(data.whatsapp))}
      ${row("Cancha", escapeHtml(data.courtName))}
      ${row("Fecha", escapeHtml(formattedDate))}
      ${row("Horario", `${escapeHtml(data.startTime)} a ${escapeHtml(data.endTime)}`)}
      ${row("Monto a abonar", formatMoney(data.paidAmount))}
    </table>
  </div>`;

// Envía la confirmación al cliente y el aviso al admin. Los errores se registran pero no
// interrumpen la reserva: el turno ya quedó guardado en la base aunque el mail falle.
export const sendBookingEmails = async (data: BookingEmailData) => {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const adminEmail = process.env.ADMIN_EMAIL;
  const formattedDate = formatDate(data.date);

  const customerMail = sendMail({
    from,
    to: data.email,
    subject: `Turno reservado - ${data.courtName} - ${formattedDate} ${data.startTime} hs`,
    html: customerHtml(data, formattedDate)
  }).catch((error) => {
    console.error("❌ Error enviando email al cliente:", error);
  });

  const adminMail = adminEmail
    ? sendMail({
        from,
        to: adminEmail,
        subject: `Nuevo turno reservado - ${data.courtName} - ${formattedDate} ${data.startTime} hs`,
        html: adminHtml(data, formattedDate)
      }).catch((error) => {
        console.error("❌ Error enviando email al admin:", error);
      })
    : Promise.resolve();

  await Promise.all([customerMail, adminMail]);
};
