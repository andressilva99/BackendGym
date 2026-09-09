import { Request, Response } from "express";
import { Types } from "mongoose";
import { UserModel, Role } from "../models/user.model";
import bcrypt from "bcrypt";

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

  const [dniExists, usernameExists] = await Promise.all([
    UserModel.findOne({ dni }),
    UserModel.findOne({ username }),
  ]);

  if (dniExists) {
    return res.status(400).json({ message: "Ya existe un usuario con ese DNI" });
  }

  if (usernameExists) {
    return res.status(400).json({ message: "Ya existe un usuario con ese nombre de usuario" });
  }

  try {
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
  } catch (error: any) {
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern ?? {})[0];
      const message =
        field === "dni"
          ? "Ya existe un usuario con ese DNI"
          : "Ya existe un usuario con ese nombre de usuario";
      return res.status(400).json({ message });
    }
    throw error;
  }
};

/* ===== PUT /users/:id ===== */
export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { username, dni, password, role } = req.body;

  const user = await UserModel.findById(id);
  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  const otherUsers = { $ne: new Types.ObjectId(String(id)) };

  if (dni && dni !== user.dni) {
    const dniExists = await UserModel.findOne({ dni, _id: otherUsers });
    if (dniExists) {
      return res.status(400).json({ message: "Ya existe un usuario con ese DNI" });
    }
    user.dni = dni;
  }

  if (username && username !== user.username) {
    const usernameExists = await UserModel.findOne({ username, _id: otherUsers });
    if (usernameExists) {
      return res.status(400).json({ message: "Ya existe un usuario con ese nombre de usuario" });
    }
    user.username = username;
  }

  if (password) user.password = password;

  if (role) {
    if (!Object.values(Role).includes(role)) {
      return res.status(400).json({ message: "Rol inválido" });
    }
    user.role = role;
  }

  try {
    await user.save();
  } catch (error: any) {
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern ?? {})[0];
      const message =
        field === "dni"
          ? "Ya existe un usuario con ese DNI"
          : "Ya existe un usuario con ese nombre de usuario";
      return res.status(400).json({ message });
    }
    throw error;
  }

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

/* ===== POST /users/login ===== */
export const loginUser = async (req: Request, res: Response) => {
  const { dni, password } = req.body;

  if (!dni || !password) {
    return res.status(400).json({ message: "Faltan credenciales" });
  }

  // 👇 IMPORTANTE: select("+password")
  const user = await UserModel.findOne({ dni }).select("+password");

  if (!user) {
    return res.status(400).json({ message: "DNI o contraseña incorrecta" });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(400).json({ message: "DNI o contraseña incorrecta" });
  }

  res.json({
    id: user._id,
    username: user.username,
    dni: user.dni,
    role: user.role,
  });
};