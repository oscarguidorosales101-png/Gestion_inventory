# Gestion_inventory — Sistema Integral de Gestión de Inventarios y Abastecimiento

**Gestion_inventory** es una plataforma web empresarial de nivel de producción diseñada específicamente para el control de inventarios, abastecimiento, compras, trazabilidad y control de costos de materiales en empresas del sector construcción.

El sistema fue concebido bajo estándares rigurosos de arquitectura de software, integridad transaccional ACID, seguridad por diseño y cumplimiento normativo para presentaciones académicas y despliegues empresariales.

---

## 1. Arquitectura del Sistema

El sistema implementa una arquitectura desacoplada y orientada a capas:

```
[ Frontend SPA (React 19 + Vite + JavaScript / JSX) ]
                     │  HTTP / REST (JWT)
                     ▼
       [ Backend API REST (Node.js + Express 5) ]
        ├── Autenticación PBKDF2-SHA512 + RBAC
        ├── Capa de Servicios de Negocio (SoD, Fórmulas SS/PR, Duplicados)
        ├── Pista Inmutable de Auditoría
        └── Patrón Transactional Outbox (Eventos de Integración)
                     │
     ┌───────────────┴───────────────┐
     ▼                               ▼
[ MySQL 8.0.40 Relacional ]    [ Orquestador n8n ]
 ├── 12 Tablas Normalizadas     ├── wf_outbox_processor
 ├── 24 Foreign Keys            ├── wf_alertas_stock
 ├── 40 Restricciones CHECK     ├── wf_deteccion_duplicados
 ├── 6 Triggers de Integridad   └── wf_error_handler
 └── 14 Índices Únicos / Llaves
```

### Componentes Tecnológicos
- **Base de Datos**: MySQL Community Server 8.0.40.
  - Usuario de aplicación: `gestion_inventory_app` con permisos estrictos de mínimo privilegio (`SELECT, INSERT, UPDATE, DELETE`) sobre la base de datos `gestion_inventory`.
  - Base de pruebas aislada: `gestion_inventory_test`.
- **Backend**: Node.js >= 22 (ESM nativo) con Express 5, `mysql2/promise`, `zod` para validación de esquemas y `helmet` para seguridad HTTP.
- **Frontend**: Single Page Application (SPA) desarrollada con React 19, JavaScript y JSX (`.jsx`/`.js`), Vite, `lucide-react` y `recharts`.
- **Paleta Corporativa Obligatoria**:
  - Blanco: `#FFFFFF`
  - Verde institucional: `#15803D`
  - Verde oscuro: `#052E16`
  - Fondo verde claro: `#DCFCE7`
  - Verde secundario: `#86EFAC`
  - Bordes: `#E2E8F0`
  - Texto principal: `#0F172A`
  - Texto secundario: `#64748B`
- **Automatizaciones**: Instancia de n8n orquestando el polling transaccional con `claim_token` fencing y recuperación de fallos.

---

## 2. Estructura del Repositorio

```
Gestion_inventory/
├── README.md                      # Documentación maestra de la solución
├── backend/                       # API REST y lógica de negocio
│   ├── .env                       # Variables de entorno locales (no rastreado)
│   ├── package.json               # Dependencias y scripts de backend
│   ├── database/                  # Definiciones DDL y DML de Fase 1
│   │   ├── schema.sql             # Esquema completo de 12 tablas
│   │   ├── seed.sql               # Datos semilla verificados
│   │   └── modelo-entidad-relacion.md
│   ├── scripts/                   # Scripts de aprovisionamiento seguro
│   │   ├── setup-local-env.mjs    # Genera .env y credenciales de app
│   │   ├── setup-test-db.mjs      # Crea gestion_inventory_test
│   │   ├── inicializar-usuario.mjs# Hashea claves PBKDF2-SHA512
│   │   └── verificar-conexion.mjs # Comprueba conexión de gestion_inventory_app
│   ├── src/                       # Código fuente modular
│   │   ├── app.js                 # Configuración de Express y middlewares
│   │   ├── index.js               # Entry point del servidor HTTP
│   │   ├── config/                # Base de datos y variables de entorno
│   │   ├── constants/             # Constantes de negocio y roles
│   │   ├── controllers/           # Controladores HTTP
│   │   ├── middlewares/           # Autenticación JWT, RBAC, error handler
│   │   ├── models/                # Modelos y consultas SQL parametrizadas
│   │   ├── routes/                # Rutas REST
│   │   ├── services/              # Lógica de negocio transaccional
│   │   ├── utils/                 # Criptografía PBKDF2, tokens, logger
│   │   └── validators/            # Esquemas de validación Zod
│   └── tests/                     # Suite de pruebas automatizadas
│       ├── unit/                  # Pruebas unitarias de fórmulas SS y PR
│       └── integration/           # Pruebas de integración RBAC, SoD y outbox
├── frontend/                      # Aplicación cliente React + Vite (JS/JSX)
│   ├── index.html                 # Punto de entrada HTML
│   ├── package.json               # Dependencias de frontend
│   ├── vite.config.js             # Configuración de Vite y proxy /api
│   └── src/                       # Estructura requerida en JavaScript y JSX
│       ├── assets/                # Logotipos y recursos estáticos
│       ├── components/            # Modales y componentes reutilizables
│       ├── config/                # api.config.js y constantes
│       ├── constants/             # roles.js, estados.js, moneda.js
│       ├── context/               # AuthContext.jsx
│       ├── dashboards/            # Tableros dedicados por rol
│       │   ├── AdminDashboard.jsx
│       │   ├── InventarioDashboard.jsx
│       │   ├── ComprasDashboard.jsx
│       │   └── ConsultaDashboard.jsx
│       ├── features/              # Módulos del negocio
│       │   ├── inventario/        # InventarioList.jsx, StockPorUbicacionModal.jsx
│       │   ├── materiales/        # MaterialesList.jsx, MaterialModal.jsx
│       │   ├── categorias/        # CategoriasList.jsx, CategoriaModal.jsx
│       │   ├── proveedores/       # ProveedoresList.jsx, ProveedorModal.jsx
│       │   ├── ubicaciones/       # UbicacionesList.jsx, UbicacionModal.jsx
│       │   ├── ordenes/           # OrdenesList.jsx, OrdenModal.jsx, RevisionDuplicadoModal.jsx
│       │   ├── recepciones/       # RecepcionesHistorial.jsx, RecepcionModal.jsx
│       │   ├── movimientos/       # MovimientosLedger.jsx, MovimientoModal.jsx
│       │   ├── alertas/           # AlertasList.jsx, ResolverAlertaModal.jsx
│       │   ├── reglas/            # ReglasList.jsx, ReglaModal.jsx
│       │   ├── usuarios/          # UsuariosList.jsx, UsuarioModal.jsx
│       │   └── auditoria/         # AuditoriaList.jsx, AuditoriaPayloadModal.jsx
│       ├── guards/                # AuthGuard.jsx, RoleGuard.jsx
│       ├── hooks/                 # useAuth.js, useFetch.js
│       ├── layouts/               # MainLayout.jsx, Sidebar.jsx, Header.jsx
│       ├── pages/                 # LoginPage.jsx, DashboardPage.jsx, NotFoundPage.jsx
│       ├── routes/                # AppRoutes.jsx
│       ├── scripts/               # verify-env.js
│       ├── services/              # api.js, auth.service.js, dashboard.service.js
│       ├── styles/                # theme.css, main.css
│       ├── utils/                 # formatters.js
│       ├── validators/            # Validaciones de fórmulas de inventario
│       ├── App.jsx                # Componente raíz
│       └── main.jsx               # Bootstrap de React
├── n8n/                           # Workflows de automatización
│   └── workflows/                 # Archivos JSON validados
│       ├── wf_outbox_processor.json
│       ├── wf_alertas_stock.json
│       ├── wf_deteccion_duplicados.json
│       └── wf_error_handler.json
└── docs/                          # Documentación e informes de validación
    ├── informe-implementacion-integral.md
    └── modelo-entidad-relacion.md
```

---

## 3. Puesta en Marcha Rápida (Guía Local)

### Paso 1: Configurar el Entorno del Backend
```powershell
cd Gestion_inventory/backend
npm install
npm run setup:env          # Configura el usuario seguro de BD
npm run usuarios:inicializar --init-seed
```

### Paso 2: Ejecutar Pruebas Automatizadas
```powershell
npm test
```
Debe certificar **23 tests pasados (100%)**.

### Paso 3: Iniciar el Backend
```powershell
npm start
```
El servidor arrancará en `http://localhost:3001` y validará la conexión activa a MySQL (`gestion_inventory`).

### Paso 4: Iniciar el Frontend
En otra terminal:
```powershell
cd Gestion_inventory/frontend
npm install
npm run dev
```
Abrir el navegador en `http://localhost:5173`. La aplicación cuenta con proxy inverso hacia `/api` en el puerto 3001.

### Paso 5: Automatizaciones n8n (Opcional pero Recomendado)
Importar los 4 workflows en su instancia local de n8n:
```powershell
n8n import:workflow --separate --input="c:\Users\Foward\Desktop\Gestion_INVENTARIO\Gestion_inventory\n8n\workflows"
```

---

## 4. Credenciales Semilla para Pruebas

| Rol | Correo Electrónico | Contraseña Inicial | Tablero Especializado |
| :--- | :--- | :--- | :--- |
| **ADMINISTRADOR** | `admin@empresaficticiapendiente.cr` | `Admin2026!Gestion` | `AdminDashboard.jsx` (Acceso completo + visor multi-rol) |
| **ENCARGADO_INVENTARIO** | `inventario@empresaficticiapendiente.cr` | `Inventario2026!` | `InventarioDashboard.jsx` (Stock, recepciones, bodegas) |
| **COMPRAS** | `compras@empresaficticiapendiente.cr` | `Compras2026!Req` | `ComprasDashboard.jsx` (Órdenes, duplicados, SoD) |
| **CONSULTA** | `consulta@empresaficticiapendiente.cr` | `Consulta2026!Ver` | `ConsultaDashboard.jsx` (Solo lectura estricto) |

---

## 5. Reglas de Negocio Implementadas

### Fórmulas Dinámicas de Inventario
- **Stock de Seguridad ($SS$)**:
  $$SS = (D_{\max} - D_{\text{prom}}) \times L$$
  Donde $D_{\max} \ge D_{\text{prom}}$ y $L \ge 1$. Si la demanda es constante ($D_{\max} = D_{\text{prom}}$), $SS = 0$.
- **Punto de Reorden ($PR$)**:
  $$PR = (D_{\text{prom}} \times L) + SS$$
- **Estados de Stock**:
  - `CRITICO`: Existencia actual $\le$ Stock Mínimo.
  - `REORDEN`: Stock Mínimo $<$ Existencia actual $\le PR$.
  - `NORMAL`: Existencia actual $> PR$.

### Segregación de Funciones (SoD)
Un usuario no puede aprobar una orden de compra creada por él mismo. La violación de esta regla genera un HTTP 403 Forbidden y un registro inmutable en la bitácora de auditoría.

### Niveles de Autorización Presupuestaria
- **Nivel 1** ($< \text{CRC } 5.000.000$): Analista de Compras.
- **Nivel 2** ($\text{CRC } 5.000.000$ a $\text{CRC } 25.000.000$): Jefatura de Operaciones.
- **Nivel 3** ($> \text{CRC } 25.000.000$): Gerencia General / Administrador.

### Detección Preventiva de Duplicados
Identifica órdenes emitidas en una ventana de 7 días hacia el mismo proveedor con líneas y montos coincidentes dentro de una tolerancia porcentual. Requiere resolución humana previa antes de autorizar la orden.
