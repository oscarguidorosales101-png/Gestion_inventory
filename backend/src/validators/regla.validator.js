import { z } from 'zod';

export const updateReglaSchema = z.object({
  valor_numerico: z.coerce.number().optional().nullable(),
  valor_texto: z.string().trim().max(255).optional().nullable(),
  descripcion: z.string().trim().min(3).max(300).optional(),
  activo: z.coerce.number().int().min(0).max(1).optional(),
});

