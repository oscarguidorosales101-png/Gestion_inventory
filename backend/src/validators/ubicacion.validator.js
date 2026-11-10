import { z } from 'zod';

export const createUbicacionSchema = z.object({
  codigo: z.string().trim().min(2).max(20),
  nombre: z.string().trim().min(2).max(120),
  tipo: z.enum(['ALMACEN_CENTRAL', 'BODEGA_OBRA', 'FRENTE_TRABAJO']),
  direccion: z.string().trim().min(2).max(255),
  responsable: z.string().trim().min(2).max(100),
  activo: z.coerce.number().int().min(0).max(1).default(1),
});

export const updateUbicacionSchema = z.object({
  nombre: z.string().trim().min(2).max(120).optional(),
  tipo: z.enum(['ALMACEN_CENTRAL', 'BODEGA_OBRA', 'FRENTE_TRABAJO']).optional(),
  direccion: z.string().trim().min(2).max(255).optional(),
  responsable: z.string().trim().min(2).max(100).optional(),
  activo: z.coerce.number().int().min(0).max(1).optional(),
});

