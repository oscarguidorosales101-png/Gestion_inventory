import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Correo electronico invalido'),
  password: z.string().min(1, 'La contrasena es requerida'),
});

export const cambiarClaveSchema = z.object({
  passwordActual: z.string().min(1, 'La contrasena actual es requerida'),
  passwordNueva: z.string().min(8, 'La nueva contrasena debe tener al menos 8 caracteres'),
});

