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

// Envía la confirmación al cliente y el aviso al admin. Los errores se registran pero no
// interrumpen la reserva: el turno ya quedó guardado en la base aunque el mail falle.
export const sendBookingEmails = async (data: BookingEmailData) => {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const adminEmail = process.env.ADMIN_EMAIL;
  const formattedDate = formatDate(data.date);

  const customerMail = sendMail({
    from,
    to: data.email,
    subject: `Turno confirmado - ${data.courtName}`,
    html: `
      <h2>¡Turno confirmado!</h2>
      <p>Hola ${data.firstName} ${data.lastName}, tu turno quedó reservado con los siguientes datos:</p>
      <ul>
        <li><strong>Cancha:</strong> ${data.courtName}</li>
        <li><strong>Fecha:</strong> ${formattedDate}</li>
        <li><strong>Horario:</strong> ${data.startTime} a ${data.endTime}</li>
        <li><strong>Monto abonado:</strong> $${data.paidAmount}</li>
      </ul>
      <p>¡Te esperamos!</p>
    `
  }).catch((error) => {
    console.error("❌ Error enviando email al cliente:", error);
  });

  const adminMail = adminEmail
    ? sendMail({
        from,
        to: adminEmail,
        subject: `Nuevo turno reservado - ${data.courtName}`,
        html: `
          <h2>Nuevo turno reservado</h2>
          <ul>
            <li><strong>Cliente:</strong> ${data.firstName} ${data.lastName}</li>
            <li><strong>Email:</strong> ${data.email}</li>
            <li><strong>WhatsApp:</strong> ${data.whatsapp}</li>
            <li><strong>Cancha:</strong> ${data.courtName}</li>
            <li><strong>Fecha:</strong> ${formattedDate}</li>
            <li><strong>Horario:</strong> ${data.startTime} a ${data.endTime}</li>
            <li><strong>Monto abonado:</strong> $${data.paidAmount}</li>
          </ul>
        `
      }).catch((error) => {
        console.error("❌ Error enviando email al admin:", error);
      })
    : Promise.resolve();

  await Promise.all([customerMail, adminMail]);
};
