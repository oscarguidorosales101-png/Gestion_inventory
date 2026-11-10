import { z } from 'zod';

export const reclamarLoteSchema = z.object({
  batchSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const completarEventoSchema = z.object({
  claim_token: z.string().uuid('El claim_token debe ser un UUID valido'),
  resultado_procesamiento: z.record(z.any()).optional().nullable(),
});

export const fallarEventoSchema = z.object({
  claim_token: z.string().uuid('El claim_token debe ser un UUID valido'),
  error_mensaje: z.string().trim().min(1).max(500),
});

