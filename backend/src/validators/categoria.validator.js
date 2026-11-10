import { z } from 'zod';

export const createCategoriaSchema = z.object({
  codigo: z.string().trim().min(2).max(20),
  nombre: z.string().trim().min(2).max(100),
  tipo_gasto: z.enum(['DIRECTO_OBRA', 'INDIRECTO', 'HERRAMIENTA_EQUIPO', 'SEGURIDAD_EPP']),
  descripcion: z.string().trim().max(255).optional().nullable(),
  activo: z.coerce.number().int().min(0).max(1).default(1),
});

export const updateCategoriaSchema = z.object({
  nombre: z.string().trim().min(2).max(100).optional(),
  tipo_gasto: z.enum(['DIRECTO_OBRA', 'INDIRECTO', 'HERRAMIENTA_EQUIPO', 'SEGURIDAD_EPP']).optional(),
  descripcion: z.string().trim().max(255).optional().nullable(),
  activo: z.coerce.number().int().min(0).max(1).optional(),
});

