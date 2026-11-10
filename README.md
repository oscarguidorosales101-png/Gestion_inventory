# Gestion_inventory — Sistema Integral de Gestion de Inventarios y Abastecimiento

**Gestion_inventory** es una plataforma web empresarial de nivel de produccion diseÃ±ada especificamente para el control de inventarios, abastecimiento, compras, trazabilidad y control de costos de materiales en empresas del sector construccion.

El sistema fue concebido bajo estandares rigurosos de arquitectura de software, integridad transaccional ACID, seguridad por diseÃ±o y cumplimiento normativo para presentaciones academicas y despliegues empresariales.

---

## 1. Arquitectura del Sistema

El sistema implementa una arquitectura desacoplada y orientada a capas:

```
[ Frontend SPA (React + Vite + TypeScript) ]
                     │  HTTP / REST (JWT)
                     ▼
       [ Backend API REST (Node.js + Express 5) ]
        ├── Autenticacion PBKDF2-SHA512 + RBAC
        ├── Capa de Servicios de Negocio (SoD, Formulas SS/PR, Duplicados)
        ├── Pista Inmutable de Auditoria
        └── Patron Transactional Outbox (Eventos de Integracion)
                     │
     ┌───────────────┴───────────────┐
     ▼                               ▼
[ MySQL 8.0.40 Relacional ]    [ Orquestador n8n ]
 ├── 12 Tablas Normalizadas     ├── wf_outbox_processor
 ├── 24 Foreign Keys            ├── wf_alertas_stock
 ├── 40 Restricciones CHECK     ├── wf_deteccion_duplicados
 ├── 6 Triggers de Integridad   └── wf_error_handler
 └── 14 Indices Unicos / Llaves
```

### Componentes Tecnologicos
- **Base de Datos**: MySQL Community Server 8.0.40.
  - Usuario de aplicacion: `gestion_inventory_app` con permisos estrictos de minimo privilegio (`SELECT, INSERT, UPDATE, DELETE`) sobre la base de datos `gestion_inventory`.
  - Base de pruebas aislada: `gestion_inventory_test`.
- **Backend**: Node.js >= 22 (ESM nativo) con Express 5, `mysql2/promise`, `zod` para validacion de esquemas y `helmet` para seguridad HTTP.
- **Frontend**: Single Page Application (SPA) desarrollada con React 19, TypeScript, Vite, `lucide-react` y `recharts`.
- **Automatizaciones**: Instancia de n8n orquestando el polling transaccional con `claim_token` fencing y recuperacion de fallos.

---

## 2. Estructura del Repositorio

```
Gestion_inventory/
├── README.md                      # Documentacion maestra de la solucion
├── backend/                       # API REST y logica de negocio
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
│   │   └── verificar-conexion.mjs # Comprueba conexion de gestion_inventory_app
│   ├── src/                       # Codigo fuente modular
│   │   ├── app.js                 # Configuracion Express, CORS y SPA estatica
│   │   ├── index.js               # Entrypoint HTTP
│   │   ├── config/                # env.js y pool MySQL con reintentos deadlock
│   │   ├── controllers/           # Controladores de recursos (14 modulos)
│   │   ├── middlewares/           # auth, RBAC, auditoria, validacion, errores
│   │   ├── routes/                # Enrutadores Express (/api/...)
│   │   ├── services/              # Logica transaccional pura
│   │   ├── utils/                 # Criptografia, respuestas, validaciones
│   │   └── validators/            # Esquemas Zod por entidad
│   └── tests/                     # Suite automatizada (23 pruebas)
│       ├── helpers/               # Reset de base de test y entorno
│       ├── unit/                  # Fórmulas matematicas CP-CALC-01 a 07
│       └── integration/           # Auth, RBAC, SoD, Duplicados, Outbox, E2E
├── frontend/                      # Interfaz de usuario (React + TS + Vite)
│   ├── package.json
│   ├── vite.config.ts             # Proxy reverso a backend y compilacion
│   ├── src/
│   │   ├── types/                 # Modelos e interfaces TypeScript
│   │   ├── services/api.ts        # Cliente API centralizado
│   │   ├── context/AuthContext.tsx# Gestion de sesion y roles
│   │   ├── components/layout/     # Sidebar corporativo y Header
│   │   └── views/                 # 13 Vistas operativas del sistema
│   └── dist/                      # Bundle de produccion compilado
└── n8n/                           # Automatizaciones y Workflows
    ├── README.md                  # Guia de importacion y ejecucion
    └── workflows/                 # Definiciones JSON exportadas
        ├── wf_outbox_processor.json
        ├── wf_alertas_stock.json
        ├── wf_deteccion_duplicados.json
        └── wf_error_handler.json
```

---

## 3. Matriz de Control de Acceso Basado en Roles (RBAC)

El sistema define cuatro roles mutuamente excluyentes con permisos diferenciados por principio de separacion de responsabilidades:

| Modulo / Capacidad | ADMINISTRADOR | ENCARGADO_INVENTARIO | COMPRAS | CONSULTA |
| :--- | :---: | :---: | :---: | :---: |
| **Dashboard y Metricas** | Lectura Total | Lectura Total | Lectura Total | Lectura Total |
| **Catalogo de Materiales** | Crear / Editar / Desactivar | Crear / Editar | Solo Lectura | Solo Lectura |
| **Categorias y Ubicaciones** | Administracion Total | Administracion Total | Solo Lectura | Solo Lectura |
| **Directorio de Proveedores**| Administracion Total | Solo Lectura | Crear / Editar | Solo Lectura |
| **Crear Orden de Compra** | Si | No | Si | No |
| **Aprobar Nivel 1 (<= â‚¡5.000)** | Si (aplica SoD) | Si (aplica SoD) | No | No |
| **Aprobar Nivel 2 (â‚¡5.001 a â‚¡25.000)** | Si (aplica SoD) | Si (aplica SoD) | No | No |
| **Aprobar Nivel 3 (> â‚¡25.000)** | Si (aplica SoD) | No | No | No |
| **Enviar Orden al Proveedor** | Si | No | Si | No |
| **Revisar Posible Duplicado**| Si (Confirmar/Descartar) | No | Si (Confirmar/Descartar) | No |
| **Recepcion Fisica de Mercancia** | Si | Si | No | No |
| **Asentar Movimientos Manuales** | Si | Si | No | No |
| **Reevaluar / Atender Alertas** | Si | Si | Si (solo resolver) | No |
| **Reglas de Negocio** | Parametrizar | Solo Lectura | Solo Lectura | Solo Lectura |
| **Administracion de Usuarios** | Si | No | No | No |
| **Pista de Auditoria** | Consulta Completa | Consulta Completa | Consulta Completa | Consulta Completa |

---

## 4. Reglas de Negocio Implementadas

### 4.1 Fórmulas de Stock de Seguridad y Punto de Reorden
Para todo material activo:
$$\text{Stock de Seguridad } (SS) = (D_{max} - D_{prom}) \times L$$
$$\text{Punto de Reorden } (PR) = (D_{prom} \times L) + SS = D_{max} \times L$$

Donde:
- $D_{prom}$: Demanda promedio diaria (debe ser $\ge 0$).
- $D_{max}$: Demanda maxima diaria (debe ser $\ge D_{prom}$).
- $L$: Tiempo de entrega del proveedor en dias (debe ser $\ge 1$).

### 4.2 Estados Mutuamente Excluyentes de Inventario
El sistema evalua el stock global resultante del libro mayor de movimientos y asigna exactamente un unico estado:
1. **STOCK_CRITICO**: Cuando $\text{Stock} \le \text{Stock Minimo}$ (o $\le 0$). Activa severidad `CRITICA` si stock es 0, o `ALTA` si stock $\le$ stock minimo.
2. **REORDEN**: Cuando $\text{Stock Minimo} < \text{Stock} \le PR$. Activa severidad `MEDIA`.
3. **NORMAL**: Cuando $\text{Stock} > PR$. No genera alertas activas.

### 4.3 Segregacion de Funciones (Segregation of Duties - SoD)
- Ningun usuario puede aprobar una orden de compra creada por el mismo, sin excepcion (`usuario_creador_id <> usuario_aprobador_id`).
- Los intentos indebidos de auto-aprobacion son bloqueados con HTTP 403 Forbidden y asentados inmutablemente en la tabla de `auditoria` con la accion `INTENTO_APROBACION_RECHAZADO`.

### 4.4 Deteccion Inteligente de Ordenes Duplicadas
Al registrar una nueva orden de compra, el motor evalua:
- Existencia de ordenes previas no canceladas para el **mismo proveedor**.
- Ventana temporal exacta de 7 dias (604.800 segundos).
- Coincidencia de materiales con variacion porcentual dentro de la tolerancia configurada:
$$\text{Variacion \%} = \frac{|\text{Cant. Nueva} - \text{Cant. Previa}|}{\text{Cant. Previa}} \times 100 \le \text{Tolerancia \%}$$
- Si se detecta similitud, la orden se crea con `es_posible_duplicado = 1` y `estado_revision_duplicado = 'PENDIENTE_REVISION'`.
- La orden no puede ser aprobada hasta que un usuario autorizado (Compras o Administrador) registre el dictamen de revision humana (`CONFIRMAR_DUPLICADO` o `DESCARTAR_FALSO_POSITIVO`).

### 4.5 Libro Mayor Inmutable de Movimientos
- El inventario nunca se sobrescribe; se deriva mediante agregacion matematica de los movimientos de existencias.
- Se capturan snapshots inmutables del saldo anterior y posterior en la ubicacion de origen y destino (`snapshot_stock_ant_origen`, `snapshot_stock_nue_origen`, etc.).
- Las salidas o transferencias verifican disponibilidad fisica previa; nunca se permiten existencias negativas.

### 4.6 Transactional Outbox con Fencing de Tokens
- Todas las operaciones criticas (movimientos, ordenes, recepciones) guardan sus eventos en la misma transaccion ACID en la tabla `eventos_integracion`.
- El endpoint `POST /api/integracion/eventos/reclamar` utiliza `SELECT ... FOR UPDATE SKIP LOCKED` para concurrencia sin bloqueo.
- Genera un `claim_token` UUID unico por reclamo; si el worker excede el tiempo maximo (`timeout_segundos >= 30`), el evento expira y otro worker puede reclamarlo, invalidando inmediatamente el token atrasado y rechazando envios tardios con HTTP 409 Conflict.

---

## 5. Guia de Puesta en Marcha y Despliegue Local

### 5.1 Requisitos Previos
- **Sistema Operativo**: Windows, Linux o macOS.
- **Node.js**: Version 22 o superior (`node -v`).
- **npm**: Version 11 o superior (`npm -v`).
- **MySQL Server**: Version 8.0.40 activa y escuchando en el puerto 3306.
- Perfil `client` configurado en MySQL (`mysql_config_editor set --login-path=client --host=localhost --user=root --password`).

### 5.2 Pasos de Instalacion

1. **Instalar dependencias del Backend**:
   ```powershell
   cd Gestion_inventory\backend
   npm install
   ```

2. **Generar entorno seguro y aprovisionar usuario de aplicacion**:
   ```powershell
   npm run setup:env
   ```
   *Este comando genera una contraseÃ±a aleatoria criptografica para `gestion_inventory_app`, configura los permisos minimos en MySQL sin mostrar la clave en texto plano y crea `backend/.env`.*

3. **Inicializar bases de datos y contraseÃ±as de usuarios**:
   ```powershell
   npm run setup:testdb
   npm run usuarios:inicializar -- --init-seed
   ```

4. **Ejecutar Suite Completa de Pruebas Automatizadas (23 pruebas)**:
   ```powershell
   npm test
   ```
   *Debe arrojar: 23 pass, 0 fail.*

5. **Compilar el Frontend (Single Page Application)**:
   ```powershell
   cd ..\frontend
   npm install
   npm run build
   ```

6. **Iniciar el Servidor de Produccion (Backend + Frontend integrado)**:
   ```powershell
   cd ..\backend
   npm start
   ```
   *La aplicacion web completa estara disponible en:* `http://localhost:3001`

*(Opcional) Si desea iniciar el Frontend en modo desarrollo Vite:*
```powershell
cd Gestion_inventory\frontend
npm run dev
```
*Disponible con Hot Module Replacement en:* `http://localhost:5173`

---

## 6. Credenciales de Acceso para Demostracion y Evaluacion Academica

El sistema cuenta con botones de autofill en la pantalla de inicio de sesion para facilitar la evaluacion por parte del tribunal o docente:

| Rol | Correo Electronico | Clave Inicial | Descripcion de Pruebas |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@empresaficticiapendiente.cr` | `Admin2026!Gestion` | Control total, Nivel 3, RBAC, reglas de negocio. |
| **Encargado Inventario** | `inventario@empresaficticiapendiente.cr` | `Inventario2026!` | Recepcion de mercancia, movimientos, Nivel 1 y 2. |
| **Compras** | `compras@empresaficticiapendiente.cr` | `Compras2026!Req` | Emision de ordenes, envio a proveedores, revision de duplicados. |
| **Consulta / Auditor** | `consulta@empresaficticiapendiente.cr` | `Consulta2026!Ver` | Solo lectura, auditoria inmutable, reportes. |

---

## 7. Referencia de Endpoints API REST

Todos los endpoints (salvo `/api/auth/login` y `/health`) requieren encabezado `Authorization: Bearer <token>`. Los endpoints de integracion para n8n requieren `X-Integration-Key: <key>`.

### Autenticacion y Perfil
- `POST /api/auth/login`: Autenticacion con credenciales, emision de JWT.
- `GET /api/auth/me`: Perfil del usuario activo y comprobacion de permisos.
- `POST /api/auth/cambiar-password`: Cambio de contraseÃ±a obligatorio o voluntario.

### Dashboard e Inventario
- `GET /api/dashboard`: Metricas consolidadas (KPIs, distribucion, movimientos recientes).
- `GET /api/inventario`: Existencias consolidadas por material calculadas por libro mayor.
- `GET /api/inventario/materiales/:id/ubicaciones`: Desglose de existencias por bodega.

### Catalogo y Logistica
- `GET/POST /api/materiales`: Listado y creacion de materiales (calculo automatico SS/PR).
- `GET/PUT/DELETE /api/materiales/:id`: Detalle, actualizacion y desactivacion.
- `GET/POST/PUT /api/categorias`: Administracion de familias de materiales.
- `GET/POST/PUT /api/proveedores`: Directorio homologado de proveedores.
- `GET/POST/PUT /api/ubicaciones`: Red de bodegas y almacenes.
- `GET /api/ubicaciones/:id/stock`: Existencias fisicas por bodega.

### Abastecimiento y Recepcion
- `GET/POST /api/ordenes`: Listado con filtros y emision de ordenes de compra (con deteccion de duplicados).
- `GET /api/ordenes/:id`: Detalle completo con lineas de materiales.
- `POST /api/ordenes/:id/aprobar`: Aprobacion con verificacion de SoD y niveles de autorizacion.
- `POST /api/ordenes/:id/rechazar`: Rechazo con motivo obligatorio.
- `POST /api/ordenes/:id/enviar`: Marcado como enviada al proveedor.
- `POST /api/ordenes/:id/cancelar`: Cancelacion formal de pedido.
- `POST /api/ordenes/:id/revisar-duplicado`: Dictamen humano de revision de duplicidad.
- `POST /api/ordenes/:id/recepciones`: Asiento de recepcion fisica parcial o total con verificacion de excedente.
- `GET /api/recepciones`: Historial de recepciones de albaran.

### Libro Mayor y Alertas
- `GET/POST /api/movimientos`: Consulta de libro mayor y registro de movimientos manuales.
- `GET /api/alertas`: Monitor de alertas de stock y duplicados.
- `POST /api/alertas/reevaluar`: Recalculo sincronizado de niveles de stock.
- `POST /api/alertas/:id/resolver`: Cierre formal de alerta con motivo.

### Administracion y Trazabilidad
- `GET/PUT /api/reglas`: Consulta y parametrizacion jerarquica de reglas de negocio.
- `GET/POST/PUT /api/usuarios`: Gestion de usuarios y asignacion de roles RBAC.
- `PATCH /api/usuarios/:id/estado`: Activacion / desactivacion de cuenta.
- `GET /api/auditoria`: Pista inmutable de auditoria con payloads JSON.

### Integracion Transactional Outbox (n8n)
- `POST /api/integracion/eventos/reclamar`: Reclamo atomico con `claim_token` y recuperacion de timeouts.
- `POST /api/integracion/eventos/:id/completar`: Finalizacion exitosa de evento.
- `POST /api/integracion/eventos/:id/fallar`: Registro de fallo y control de reintentos.
- `POST /api/integracion/alertas/reevaluar`: Trigger cron de sincronizacion de alertas.
- `GET /api/integracion/auditoria/duplicados-pendientes`: Auditoria periodica de sospechas.
- `POST /api/integracion/auditoria/incidencia-workflow`: Registro de incidencias de error de n8n.

