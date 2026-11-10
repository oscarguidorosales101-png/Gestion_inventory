import { z } from 'zod';

export const createUsuarioSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  email: z.string().trim().email('Correo electronico invalido').max(120),
  rol: z.enum(['ADMINISTRADOR', 'ENCARGADO_INVENTARIO', 'COMPRAS', 'CONSULTA']),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres'),
  activo: z.coerce.number().int().min(0).max(1).default(1),
  requiere_cambio_clave: z.coerce.number().int().min(0).max(1).default(1),
});

export const updateUsuarioSchema = z.object({
  nombre: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email('Correo electronico invalido').max(120).optional(),
  rol: z.enum(['ADMINISTRADOR', 'ENCARGADO_INVENTARIO', 'COMPRAS', 'CONSULTA']).optional(),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres').optional(),
  activo: z.coerce.number().int().min(0).max(1).optional(),
  requiere_cambio_clave: z.coerce.number().int().min(0).max(1).optional(),
});

