import dotenv from "dotenv";
dotenv.config();

import { app } from "./app";
import { connectDB } from "./config/database";

const PORT = process.env.PORT || 3000;

// Asegúrate de que connectDB no tenga un "process.exit(1)" adentro si falla
connectDB();

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`🚀 Server corriendo en puerto ${PORT}`);
});