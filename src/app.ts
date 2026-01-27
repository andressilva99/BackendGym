import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import socioRoutes from "./routes/socio.routes";

export const app = express();

app.use(express.json());
app.use(cors());

app.use("/users", userRoutes);
app.use("/socios", socioRoutes );
