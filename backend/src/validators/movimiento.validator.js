import { z } from 'zod';

export const createMovimientoManualSchema = z.object({
  tipo: z.enum(['SALIDA', 'TRANSFERENCIA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO']),
  material_id: z.coerce.number().int().positive('Material invalido'),
  ubicacion_origen_id: z.coerce.number().int().positive().optional().nullable(),
  ubicacion_destino_id: z.coerce.number().int().positive().optional().nullable(),
  cantidad: z.coerce.number().positive('La cantidad debe ser mayor a cero'),
  motivo: z.string().trim().min(3).max(300, 'El motivo es requerido'),
  referencia: z.string().trim().max(80).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.tipo === 'SALIDA' || data.tipo === 'AJUSTE_NEGATIVO') {
    if (!data.ubicacion_origen_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La ubicacion de origen es obligatoria para salidas y ajustes negativos',
        path: ['ubicacion_origen_id'],
      });
    }
  }
  if (data.tipo === 'AJUSTE_POSITIVO') {
    if (!data.ubicacion_destino_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La ubicacion de destino es obligatoria para ajustes positivos',
        path: ['ubicacion_destino_id'],
      });
    }
  }
  if (data.tipo === 'TRANSFERENCIA') {
    if (!data.ubicacion_origen_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La ubicacion de origen es obligatoria para transferencias',
        path: ['ubicacion_origen_id'],
      });
    }
    if (!data.ubicacion_destino_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La ubicacion de destino es obligatoria para transferencias',
        path: ['ubicacion_destino_id'],
      });
    }
    if (data.ubicacion_origen_id && data.ubicacion_destino_id && data.ubicacion_origen_id === data.ubicacion_destino_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La ubicacion de origen y destino deben ser diferentes en una transferencia',
        path: ['ubicacion_destino_id'],
      });
    }
  }
});

