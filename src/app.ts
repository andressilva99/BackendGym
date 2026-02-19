import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import socioRoutes from "./routes/socio.routes";
import shareRoutes from "./routes/share.routes";
import paymentRoutes from "./routes/payment.routes";
import reportRoutes from "./routes/report.routes";

export const app = express();

app.use(express.json());

app.use(cors({
  origin: [
    //"https://oxigeno-eight.vercel.app", 
    "http://localhost:5173"
  ],
  // Agregamos PATCH y OPTIONS a la lista de métodos permitidos
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"] // Asegura que los headers comunes estén permitidos
}));

app.use("/users", userRoutes);
app.use("/socios", socioRoutes);
app.use("/shares", shareRoutes);
app.use("/payments", paymentRoutes);
app.use("/reports", reportRoutes);