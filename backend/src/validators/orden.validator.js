import { z } from 'zod';

export const createOrdenSchema = z.object({
  proveedor_id: z.coerce.number().int().positive('Proveedor invalido'),
  ubicacion_destino_id: z.coerce.number().int().positive('Ubicacion destino invalida'),
  fecha_entrega_estimada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha invalido (YYYY-MM-DD)'),
  observaciones: z.string().trim().max(500).optional().nullable(),
  items: z.array(z.object({
    material_id: z.coerce.number().int().positive('Material invalido'),
    cantidad_solicitada: z.coerce.number().positive('La cantidad debe ser mayor a cero'),
    precio_unitario_crc: z.coerce.number().min(0, 'El precio unitario no puede ser negativo'),
  })).min(1, 'La orden de compra debe incluir al menos un material'),
});

export const revisarDuplicadoSchema = z.object({
  decision: z.enum(['CONFIRMAR_DUPLICADO', 'DESCARTAR_FALSO_POSITIVO']),
  observaciones: z.string().trim().max(500).optional(),
});

