import { Request, Response } from "express";
import { SocioModel } from "../models/socio.model";

export const getSocios = async (req: Request, res: Response) => {
  const socios = await SocioModel.find().populate("trainerId", "username role");
  res.json(socios);
};

export const createSocio = async (req: Request, res: Response) => {
  const { apellido, nombre, fechaNacimiento, trainerId } = req.body;

  const socio = new SocioModel({
    apellido,
    nombre,
    fechaNacimiento,
    trainerId
  });

  await socio.save();
  res.status(201).json(socio);
};

export const updateSocio = async (req: Request, res: Response) => {
  const socio = await SocioModel.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(socio);
};

export const deleteSocio = async (req: Request, res: Response) => {
  await SocioModel.findByIdAndDelete(req.params.id);
  res.json({ message: "Socio eliminado" });
};