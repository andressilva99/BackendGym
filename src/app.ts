import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import socioRoutes from "./routes/socio.routes";
import shareRoutes from "./routes/share.routes";
import paymentRoutes from "./routes/payment.routes";
import reportRoutes from "./routes/report.routes";

export const app = express();

// 1. CORS DEBE SER LO PRIMERO
app.use(cors({
  origin: [
    "https://gymsilcortech.vercel.app", 
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200 // Responde 200 OK a las peticiones OPTIONS
}));

// 2. LUEGO EL PARSER DE JSON
app.use(express.json());

// 3. POR ÚLTIMO LAS RUTAS
app.use("/users", userRoutes);
app.use("/socios", socioRoutes);
app.use("/shares", shareRoutes);
app.use("/payments", paymentRoutes);
app.use("/reports", reportRoutes);