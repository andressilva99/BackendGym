import { Request, Response } from "express";
import { UserModel, Role } from "../models/user.model";

/* ===== GET /users ===== */
export const getUsers = async (_req: Request, res: Response) => {
  const users = await UserModel.find().select("-password");
  res.json(users);
};

/* ===== POST /users ===== */
export const createUser = async (req: Request, res: Response) => {
  const { username, dni, password, role } = req.body;

  if (!username || !dni || !password || !role) {
    return res.status(400).json({ message: "Faltan datos" });
  }

  if (!Object.values(Role).includes(role)) {
    return res.status(400).json({ message: "Rol inválido" });
  }

  const userExists = await UserModel.findOne({
    $or: [{ username }, { dni }],
  });

  if (userExists) {
    return res.status(400).json({ message: "Usuario ya existe" });
  }

  const user = new UserModel({ username, dni, password, role });
  await user.save();

  res.status(201).json({
    message: "Usuario creado",
    user: {
      id: user._id,
      username: user.username,
      dni: user.dni,
      role: user.role,
    },
  });
};

/* ===== PUT /users/:id ===== */
export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { username, dni, password, role } = req.body;

  const user = await UserModel.findById(id);
  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  if (username) user.username = username;
  if (dni) user.dni = dni;
  if (password) user.password = password;

  if (role) {
    if (!Object.values(Role).includes(role)) {
      return res.status(400).json({ message: "Rol inválido" });
    }
    user.role = role;
  }

  await user.save();

  res.json({
    message: "Usuario actualizado",
    user: {
      id: user._id,
      username: user.username,
      dni: user.dni,
      role: user.role,
    },
  });
};

/* ===== DELETE /users/:id ===== */
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await UserModel.findByIdAndDelete(id);
  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  res.json({ message: "Usuario eliminado correctamente" });
};
