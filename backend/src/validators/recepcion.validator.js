import { z } from 'zod';

export const registrarRecepcionSchema = z.object({
  items: z.array(z.object({
    detalle_id: z.coerce.number().int().positive('Identificador de detalle invalido'),
    cantidad_a_recibir: z.coerce.number().positive('La cantidad a recibir debe ser mayor a cero'),
  })).min(1, 'Debe indicar al menos un item para recibir'),
  referencia: z.string().trim().max(80).optional().nullable(),
  observaciones: z.string().trim().max(300).optional().nullable(),
});

