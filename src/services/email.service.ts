import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport(
  process.env.EMAIL_SERVICE
    ? {
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      }
    : {
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
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

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });

// Envía la confirmación al cliente y el aviso al admin. Los errores se registran pero no
// interrumpen la reserva: el turno ya quedó guardado en la base aunque el mail falle.
export const sendBookingEmails = async (data: BookingEmailData) => {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const adminEmail = process.env.ADMIN_EMAIL;
  const formattedDate = formatDate(data.date);

  const customerMail = transporter.sendMail({
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
    ? transporter.sendMail({
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
