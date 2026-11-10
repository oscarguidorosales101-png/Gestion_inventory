import * as inventarioService from '../services/inventario.service.js';
import { paginatedResponse, successResponse } from '../utils/response.js';

export async function getResumen(req, res, next) {
  try {
    const { items, total } = await inventarioService.obtenerResumenInventario(req.query);
    return paginatedResponse(res, items, total, req.query.page, req.query.limit);
  } catch (err) {
    next(err);
  }
}

export async function getStockMaterial(req, res, next) {
  try {
    const materialId = req.params.materialId;
    const globalStock = await inventarioService.obtenerStockGlobal(materialId);

    let ubicacionStock = null;
    if (req.query.ubicacion_id) {
      ubicacionStock = await inventarioService.obtenerStockPorUbicacion(materialId, req.query.ubicacion_id);
    }

    return successResponse(res, {
      material_id: Number(materialId),
      stock_global: globalStock,
      stock_ubicacion: ubicacionStock,
    });
  } catch (err) {
    next(err);
  }
}

export async function getDesgloseUbicaciones(req, res, next) {
  try {
    const materialId = req.params.materialId;
    const desglose = await inventarioService.obtenerDesglosePorUbicaciones(materialId);
    return successResponse(res, {
      material_id: Number(materialId),
      ubicaciones: desglose,
    });
  } catch (err) {
    next(err);
  }
}
