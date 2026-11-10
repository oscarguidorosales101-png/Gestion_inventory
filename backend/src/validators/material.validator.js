import { z } from 'zod';

export const createMaterialSchema = z.object({
  codigo: z.string().trim().min(2).max(30),
  nombre: z.string().trim().min(2).max(150),
  descripcion: z.string().trim().max(255).optional().nullable(),
  categoria_id: z.coerce.number().int().positive('La categoria es requerida'),
  proveedor_principal_id: z.coerce.number().int().positive().optional().nullable(),
  unidad_medida: z.string().trim().min(1).max(30),
  costo_unitario_crc: z.coerce.number().min(0, 'El costo unitario no puede ser negativo'),
  stock_minimo: z.coerce.number().min(0, 'El stock minimo no puede ser negativo'),
  stock_maximo: z.coerce.number().min(0, 'El stock maximo no puede ser negativo'),
  demanda_promedio_diaria: z.coerce.number().min(0, 'La demanda promedio no puede ser negativa'),
  demanda_maxima_diaria: z.coerce.number().min(0, 'La demanda maxima no puede ser negativa'),
  tiempo_entrega_dias: z.coerce.number().int().min(1, 'El tiempo de entrega debe ser de al menos 1 dia'),
}).refine((data) => data.stock_maximo >= data.stock_minimo, {
  message: 'El stock maximo debe ser mayor o igual al stock minimo',
  path: ['stock_maximo'],
}).refine((data) => data.demanda_maxima_diaria >= data.demanda_promedio_diaria, {
  message: 'La demanda maxima diaria debe ser mayor o igual a la demanda promedio',
  path: ['demanda_maxima_diaria'],
});

export const updateMaterialSchema = z.object({
  nombre: z.string().trim().min(2).max(150).optional(),
  descripcion: z.string().trim().max(255).optional().nullable(),
  categoria_id: z.coerce.number().int().positive().optional(),
  proveedor_principal_id: z.coerce.number().int().positive().optional().nullable(),
  unidad_medida: z.string().trim().min(1).max(30).optional(),
  costo_unitario_crc: z.coerce.number().min(0).optional(),
  stock_minimo: z.coerce.number().min(0).optional(),
  stock_maximo: z.coerce.number().min(0).optional(),
  demanda_promedio_diaria: z.coerce.number().min(0).optional(),
  demanda_maxima_diaria: z.coerce.number().min(0).optional(),
  tiempo_entrega_dias: z.coerce.number().int().min(1).optional(),
  activo: z.coerce.number().int().min(0).max(1).optional(),
});

