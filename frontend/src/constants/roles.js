export const ROLES = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  ENCARGADO_INVENTARIO: 'ENCARGADO_INVENTARIO',
  COMPRAS: 'COMPRAS',
  CONSULTA: 'CONSULTA',
};

export const ROLES_LIST = Object.values(ROLES);

export const ROLES_LABELS = {
  [ROLES.ADMINISTRADOR]: 'Administrador General',
  [ROLES.ENCARGADO_INVENTARIO]: 'Encargado de Inventario',
  [ROLES.COMPRAS]: 'Analista de Compras',
  [ROLES.CONSULTA]: 'Auditor de Consulta',
};

