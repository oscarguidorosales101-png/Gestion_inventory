import { z } from 'zod';

export const createProveedorSchema = z.object({
  codigo: z.string().trim().min(2).max(20),
  razon_social: z.string().trim().min(2).max(150),
  identificacion_fiscal: z.string().trim().min(5).max(30),
  contacto_nombre: z.string().trim().min(2).max(100),
  telefono: z.string().trim().min(5).max(30),
  email: z.string().trim().email().max(120),
  direccion: z.string().trim().max(255).optional().nullable(),
  tiempo_entrega_dias: z.coerce.number().int().min(1, 'El plazo de entrega debe ser de al menos 1 dia'),
  calificacion: z.coerce.number().min(1.00).max(5.00).default(5.00),
  activo: z.coerce.number().int().min(0).max(1).default(1),
});

export const updateProveedorSchema = z.object({
  razon_social: z.string().trim().min(2).max(150).optional(),
  identificacion_fiscal: z.string().trim().min(5).max(30).optional(),
  contacto_nombre: z.string().trim().min(2).max(100).optional(),
  telefono: z.string().trim().min(5).max(30).optional(),
  email: z.string().trim().email().max(120).optional(),
  direccion: z.string().trim().max(255).optional().nullable(),
  tiempo_entrega_dias: z.coerce.number().int().min(1).optional(),
  calificacion: z.coerce.number().min(1.00).max(5.00).optional(),
  activo: z.coerce.number().int().min(0).max(1).optional(),
});

