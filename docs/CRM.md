# Sistema CRM - Documentación Completa

## Índice
1. [Introducción](#introducción)
2. [Características Principales](#características-principales)
3. [Permisos y Acceso](#permisos-y-acceso)
4. [Dashboard CRM](#dashboard-crm)
5. [Pipeline de Ventas](#pipeline-de-ventas)
   - [Tablero Kanban](#tablero-kanban)
   - [Etapas del Pipeline](#etapas-del-pipeline)
   - [Gestión de Pipeline (Admin)](#gestión-de-pipeline-admin)
6. [Deals (Oportunidades)](#deals-oportunidades)
   - [Crear Deal](#crear-deal)
   - [Editar Deal](#editar-deal)
   - [Mover Deal entre Etapas](#mover-deal-entre-etapas)
   - [Marcar como Ganado/Perdido](#marcar-como-ganadoperdido)
7. [Clientes](#clientes)
   - [Perfil de Cliente](#perfil-de-cliente)
   - [Información CRM del Cliente](#información-crm-del-cliente)
8. [Contactos](#contactos)
   - [Gestión de Contactos](#gestión-de-contactos)
   - [Contacto Principal](#contacto-principal)
9. [Actividades](#actividades)
   - [Tipos de Actividad](#tipos-de-actividad)
   - [Registro de Actividades](#registro-de-actividades)
   - [Tareas Pendientes](#tareas-pendientes)
10. [Reportes CRM](#reportes-crm)
    - [Métricas del Pipeline](#métricas-del-pipeline)
    - [Tendencia Mensual](#tendencia-mensual)
    - [Forecast](#forecast)
    - [Rendimiento por Vendedor](#rendimiento-por-vendedor)
    - [Exportación PDF](#exportación-pdf)
11. [Modelos de Datos](#modelos-de-datos)
12. [API Endpoints](#api-endpoints)
13. [Integración con Canales](#integración-con-canales)
14. [Limitaciones y Consideraciones](#limitaciones-y-consideraciones)
15. [Roadmap Futuro](#roadmap-futuro)

---

## Introducción

El **Sistema CRM** (Customer Relationship Management) es un módulo integrado en la aplicación de prioridades diseñado para gestionar el ciclo de ventas completo, desde la prospección hasta el cierre de oportunidades.

**Ubicación:** `/crm`

**Tecnología:**
- **MongoDB** con Mongoose para persistencia
- **Next.js App Router** para páginas y APIs
- **@hello-pangea/dnd** para drag & drop en el pipeline
- **Recharts** para gráficos y visualizaciones
- **jsPDF + autoTable** para exportación de reportes

---

## Características Principales

### ✅ Funcionalidades Disponibles

- 📊 **Dashboard CRM** - Vista general con métricas clave
- 🎯 **Pipeline Kanban** - Tablero visual drag & drop para gestión de deals
- 💰 **Gestión de Deals** - Crear, editar, mover entre etapas
- 🏢 **Gestión de Clientes** - Perfil completo con información CRM
- 👥 **Gestión de Contactos** - Contactos asociados a clientes con datos profesionales
- 📝 **Registro de Actividades** - Llamadas, emails, reuniones, notas, tareas
- 📈 **Reportes Profesionales** - Métricas, gráficos y exportación PDF
- ⚙️ **Configuración de Pipeline** - Admin puede crear/editar/reordenar etapas
- 🔐 **Control de Permisos** - Acceso basado en rol y permisos específicos
- 🎨 **Valor Ponderado** - Cálculo automático según probabilidad de etapa
- 📅 **Forecast** - Proyección de ventas a 3 meses
- 👤 **Asignación de Vendedor** - Cada deal tiene un responsable asignado
- 🏷️ **Tags y Campos Personalizados** - Categorización flexible

---

## Permisos y Acceso

### Sistema de Permisos CRM

El acceso al CRM está controlado por el hook `usePermissions`:

```typescript
interface UserPermissions {
  viewCRM: boolean;           // Ver dashboard y páginas CRM
  canManageDeals: boolean;    // Crear/editar deals
  canManageContacts: boolean; // Crear/editar contactos
  canManagePipelineStages: boolean; // Gestionar etapas (solo admin)
}
```

**Comportamiento:**
- **Administradores (ADMIN)**: Tienen todos los permisos CRM automáticamente
- **Usuarios normales**: Requieren permisos específicos asignados

### Páginas y Permisos Requeridos

| Página | Permiso Requerido |
|--------|-------------------|
| `/crm` | `viewCRM` |
| `/crm/deals` | `viewCRM` + `canManageDeals` |
| `/crm/deals/[id]` | `viewCRM` + `canManageDeals` |
| `/crm/clients` | `viewCRM` |
| `/crm/clients/[id]` | `viewCRM` |
| `/crm/contacts` | `viewCRM` |
| `/crm/activities` | `viewCRM` |
| `/crm/reports` | `viewCRM` |
| `/admin/pipeline` | `canManagePipelineStages` (ADMIN) |

---

## Dashboard CRM

**Ubicación:** `/crm`

El dashboard proporciona una vista general del estado del CRM:

### Métricas Principales

| Métrica | Descripción |
|---------|-------------|
| **Total Pipeline** | Valor total de deals abiertos |
| **Valor Ponderado** | Suma de (valor × probabilidad) de cada deal |
| **Deals Abiertos** | Cantidad de deals activos |
| **Clientes** | Total de clientes registrados |
| **Contactos** | Total de contactos activos |

### Secciones del Dashboard

1. **KPIs Rápidos** - Cards con métricas clave
2. **Pipeline Visual** - Resumen de deals por etapa con barras de progreso
3. **Deals Recientes** - Lista de últimos deals creados/actualizados
4. **Actividades Recientes** - Últimas actividades registradas
5. **Accesos Rápidos** - Botones para navegar a secciones principales

---

## Pipeline de Ventas

### Tablero Kanban

**Ubicación:** `/crm/deals`

El pipeline es un tablero Kanban interactivo donde cada columna representa una etapa del proceso de ventas.

**Características:**
- ✅ **Drag & Drop** - Mueve deals entre columnas arrastrando
- ✅ **Actualización en tiempo real** - Los cambios se guardan automáticamente
- ✅ **Búsqueda** - Filtra deals por nombre o cliente
- ✅ **Métricas por Etapa** - Cada columna muestra cantidad de deals y valor total
- ✅ **Valor Total y Ponderado** - Header muestra totales del pipeline

**Información visible en cada card de deal:**
- Título del deal
- Valor en moneda
- Cliente asociado
- Fecha esperada de cierre
- Vendedor responsable

### Etapas del Pipeline

El sistema incluye etapas predefinidas que pueden ser personalizadas:

| Etapa | Color | Probabilidad | Tipo |
|-------|-------|--------------|------|
| Prospecto | Gris | 10% | Abierta |
| Calificado | Azul | 25% | Abierta |
| Propuesta Enviada | Amarillo | 50% | Abierta |
| Negociación | Naranja | 75% | Abierta |
| Cerrado Ganado | Verde | 100% | Cerrada (Won) |
| Cerrado Perdido | Rojo | 0% | Cerrada (Lost) |

### Gestión de Pipeline (Admin)

**Ubicación:** `/admin/pipeline`

Los administradores pueden gestionar las etapas del pipeline:

**Funcionalidades:**
- ➕ **Crear nuevas etapas**
- ✏️ **Editar nombre, color, probabilidad**
- 🔄 **Reordenar etapas** con drag & drop
- 🗑️ **Eliminar etapas** (solo si no tienen deals)
- ⭐ **Marcar etapa por defecto** (para nuevos deals)
- ✅ **Marcar como cerrada** (ganada o perdida)

**Campos de cada etapa:**

| Campo | Descripción |
|-------|-------------|
| `name` | Nombre de la etapa |
| `order` | Posición en el pipeline |
| `color` | Color hex para visualización |
| `probability` | Probabilidad de cierre (0-100%) |
| `isDefault` | Si es la etapa inicial para nuevos deals |
| `isClosed` | Si representa un estado final |
| `isWon` | Si representa una venta ganada |
| `isActive` | Si la etapa está activa |

---

## Deals (Oportunidades)

### Crear Deal

**Desde:** `/crm/deals` → Botón "Nuevo Deal"

**Campos del formulario:**

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| Título | ✅ | Nombre descriptivo del deal |
| Valor | ✅ | Monto de la oportunidad |
| Moneda | ✅ | MXN, USD, EUR |
| Cliente | ✅ | Cliente asociado (con opción de crear nuevo) |
| Contacto | ❌ | Contacto del cliente (con opción de crear nuevo) |
| Vendedor | ❌ | Responsable del deal (default: usuario actual) |
| Fecha cierre esperada | ❌ | Fecha proyectada de cierre |
| Descripción | ❌ | Detalles adicionales |

**Creación Inline:**
- ➕ Crear cliente nuevo sin salir del formulario
- ➕ Crear contacto nuevo directamente

### Editar Deal

**Desde:** `/crm/deals/[id]` → Botón "Editar"

**Campos editables adicionales:**
- Probabilidad personalizada (override de la etapa)
- Tags (separados por coma)
- Responsable/Vendedor

### Mover Deal entre Etapas

**Opción 1: Drag & Drop**
1. Ve a `/crm/deals`
2. Arrastra el card del deal a otra columna
3. Se guarda automáticamente

**Opción 2: Modal de Cambio de Etapa**
1. Ve al detalle del deal `/crm/deals/[id]`
2. Click en el badge de etapa actual
3. Selecciona la nueva etapa
4. Confirma el cambio

### Marcar como Ganado/Perdido

**Deal Ganado:**
1. Mueve el deal a la etapa "Cerrado Ganado"
2. Se registra `actualCloseDate` automáticamente
3. El deal ya no aparece en el pipeline activo

**Deal Perdido:**
1. Mueve el deal a la etapa "Cerrado Perdido"
2. Se solicita una razón de pérdida (opcional pero recomendado)
3. Se registra `lostReason` y `actualCloseDate`

---

## Clientes

**Ubicación:** `/crm/clients`

### Perfil de Cliente

**Ubicación:** `/crm/clients/[id]`

El perfil de cliente muestra toda la información relacionada:

**Secciones:**
1. **Información General** - Nombre, industria, website
2. **Datos de Contacto** - Teléfono, dirección
3. **Métricas CRM** - Deals activos, valor total, contactos
4. **Deals Asociados** - Lista de oportunidades del cliente
5. **Contactos** - Personas de contacto
6. **Actividades** - Historial de interacciones

### Información CRM del Cliente

| Campo | Descripción |
|-------|-------------|
| `name` | Nombre de la empresa |
| `industry` | Sector/industria |
| `website` | Sitio web |
| `phone` | Teléfono principal |
| `address` | Dirección física |
| `logo` | URL del logo |
| `annualRevenue` | Ingresos anuales estimados |
| `employeeCount` | Número de empleados |
| `source` | Fuente de adquisición |
| `tags` | Etiquetas para categorización |
| `crmNotes` | Notas internas del equipo comercial |

---

## Contactos

**Ubicación:** `/crm/contacts`

### Gestión de Contactos

Los contactos son las personas de contacto dentro de cada cliente.

**Campos del contacto:**

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| `firstName` | ✅ | Nombre |
| `lastName` | ✅ | Apellido |
| `email` | ❌ | Correo electrónico |
| `phone` | ❌ | Teléfono directo |
| `position` | ❌ | Cargo/Puesto |
| `department` | ❌ | Departamento |
| `isPrimary` | ❌ | Si es el contacto principal |
| `linkedInUrl` | ❌ | Perfil de LinkedIn |
| `tags` | ❌ | Etiquetas |

### Contacto Principal

Cada cliente puede tener un **contacto principal** marcado:
- Solo puede haber uno por cliente
- Al marcar uno como principal, los demás se desmarcan automáticamente
- Útil para identificar al decisor o punto de contacto principal

---

## Actividades

**Ubicación:** `/crm/activities`

### Tipos de Actividad

| Tipo | Icono | Descripción |
|------|-------|-------------|
| `note` | 📝 | Nota interna |
| `call` | 📞 | Llamada telefónica |
| `email` | 📧 | Correo electrónico |
| `meeting` | 🤝 | Reunión (presencial o virtual) |
| `task` | ✅ | Tarea por completar |
| `channel_message` | 💬 | Mensaje vinculado desde canales |

### Registro de Actividades

**Desde múltiples lugares:**
- `/crm/activities` → Botón "Nueva Actividad"
- `/crm/deals/[id]` → Acciones rápidas
- `/crm/clients/[id]` → Sección de actividades

**Campos de la actividad:**

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| `type` | ✅ | Tipo de actividad |
| `title` | ✅ | Título descriptivo |
| `description` | ❌ | Detalles |
| `clientId` | ✅* | Cliente asociado |
| `dealId` | ❌ | Deal asociado |
| `contactId` | ❌ | Contacto asociado |
| `dueDate` | ❌ | Fecha de vencimiento (para tareas) |
| `duration` | ❌ | Duración en minutos |
| `outcome` | ❌ | Resultado de la actividad |
| `assignedTo` | ❌ | Usuario asignado |

*Al menos una relación (cliente, deal o contacto) es requerida.

### Tareas Pendientes

Las actividades de tipo `task` tienen funcionalidad adicional:
- ✅ **Marcar como completada** - Click en el checkbox
- 📅 **Fecha de vencimiento** - Alertas visuales para vencidas
- 👤 **Asignación** - Puede asignarse a otro usuario
- 📋 **Filtro "Solo pendientes"** - Ver solo tareas sin completar

---

## Reportes CRM

**Ubicación:** `/crm/reports`

### Filtros Disponibles

| Filtro | Descripción |
|--------|-------------|
| Fecha inicio | Fecha inicial del período |
| Fecha fin | Fecha final del período |
| Vendedor | Filtrar por responsable |
| Cliente | Filtrar por cliente específico |

### Métricas del Pipeline

**Resumen Ejecutivo:**

| Métrica | Descripción |
|---------|-------------|
| Pipeline Total | Valor total de deals abiertos |
| Valor Ponderado | Suma de valores × probabilidad |
| Valor Ganado | Total de deals cerrados ganados |
| Win Rate | % de deals ganados vs cerrados |
| Ticket Promedio | Valor promedio de deals ganados |
| Ciclo de Venta | Días promedio hasta el cierre |

**Pipeline por Etapa:**
- Gráfico de barras horizontal
- Tabla con detalles por etapa
- Valor total y ponderado por etapa

### Tendencia Mensual

Gráfico de área que muestra los últimos 12 meses:
- Valor ganado mensual
- Cantidad de deals ganados
- Cantidad de deals creados

### Forecast

Proyección de ventas para los próximos 3 meses basada en:
- Deals con fecha esperada de cierre en el período
- Valor total proyectado
- Valor ponderado según probabilidad

### Rendimiento por Vendedor

Tabla comparativa de vendedores:
- Total de deals
- Deals abiertos/ganados/perdidos
- Valor ganado
- Win rate individual

### Exportación PDF

El botón "Exportar PDF" genera un documento profesional con:
- Resumen ejecutivo
- Pipeline por etapa
- Forecast
- Rendimiento por vendedor
- Top 10 clientes

**Tecnología:** jsPDF + jspdf-autotable

---

## Modelos de Datos

### Deal

```typescript
interface IDeal {
  _id: ObjectId;
  title: string;
  clientId: ObjectId;      // ref: Client
  contactId?: ObjectId;    // ref: Contact
  stageId: ObjectId;       // ref: PipelineStage
  value: number;
  currency: 'MXN' | 'USD' | 'EUR';
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  probability?: number;    // Override de la etapa
  lostReason?: string;
  description?: string;
  ownerId: ObjectId;       // ref: User (vendedor)
  tags?: string[];
  customFields?: Record<string, any>;
  projectId?: ObjectId;    // ref: Project
  createdBy: ObjectId;     // ref: User
  createdAt: Date;
  updatedAt: Date;
}
```

### Contact

```typescript
interface IContact {
  _id: ObjectId;
  clientId: ObjectId;      // ref: Client
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  isPrimary: boolean;
  linkedInUrl?: string;
  avatar?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  isActive: boolean;
  createdBy: ObjectId;     // ref: User
  createdAt: Date;
  updatedAt: Date;
}
```

### Activity

```typescript
interface IActivity {
  _id: ObjectId;
  type: 'note' | 'call' | 'email' | 'meeting' | 'task' | 'channel_message';
  title: string;
  description?: string;
  clientId?: ObjectId;     // ref: Client
  contactId?: ObjectId;    // ref: Contact
  dealId?: ObjectId;       // ref: Deal
  channelMessageId?: ObjectId;  // ref: ChannelMessage
  projectId?: ObjectId;    // ref: Project
  dueDate?: Date;
  completedAt?: Date;
  isCompleted: boolean;
  duration?: number;       // minutos
  outcome?: string;
  createdBy: ObjectId;     // ref: User
  assignedTo?: ObjectId;   // ref: User
  createdAt: Date;
  updatedAt: Date;
}
```

### PipelineStage

```typescript
interface IPipelineStage {
  _id: ObjectId;
  name: string;
  order: number;
  color: string;           // Código hex
  probability: number;     // 0-100
  isDefault: boolean;
  isClosed: boolean;
  isWon: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Client (Campos CRM)

```typescript
interface IClient {
  _id: ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  // Campos CRM
  industry?: string;
  website?: string;
  phone?: string;
  address?: string;
  logo?: string;
  annualRevenue?: number;
  employeeCount?: number;
  source?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  crmNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## API Endpoints

### Deals

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/deals` | Listar deals (con filtros) |
| POST | `/api/crm/deals` | Crear deal |
| GET | `/api/crm/deals/[id]` | Obtener deal por ID |
| PUT | `/api/crm/deals/[id]` | Actualizar deal |
| DELETE | `/api/crm/deals/[id]` | Eliminar deal |

**Parámetros de query (GET /api/crm/deals):**
- `stageId` - Filtrar por etapa
- `ownerId` - Filtrar por vendedor
- `clientId` - Filtrar por cliente
- `isClosed` - true/false

### Contacts

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/contacts` | Listar contactos |
| POST | `/api/crm/contacts` | Crear contacto |
| GET | `/api/crm/contacts/[id]` | Obtener contacto |
| PUT | `/api/crm/contacts/[id]` | Actualizar contacto |
| DELETE | `/api/crm/contacts/[id]` | Eliminar contacto |

**Parámetros de query:**
- `clientId` - Filtrar por cliente
- `activeOnly` - Solo activos

### Activities

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/activities` | Listar actividades |
| POST | `/api/crm/activities` | Crear actividad |
| GET | `/api/crm/activities/[id]` | Obtener actividad |
| PUT | `/api/crm/activities/[id]` | Actualizar actividad |
| DELETE | `/api/crm/activities/[id]` | Eliminar actividad |

**Parámetros de query:**
- `clientId` - Filtrar por cliente
- `dealId` - Filtrar por deal
- `type` - Filtrar por tipo
- `pendingOnly` - Solo pendientes
- `limit` - Cantidad a retornar

### Pipeline Stages

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/pipeline-stages` | Listar etapas |
| POST | `/api/crm/pipeline-stages` | Crear etapa |
| GET | `/api/crm/pipeline-stages/[id]` | Obtener etapa |
| PUT | `/api/crm/pipeline-stages/[id]` | Actualizar etapa |
| DELETE | `/api/crm/pipeline-stages/[id]` | Eliminar etapa |

**Parámetros de query:**
- `activeOnly` - Solo etapas activas

### Reports

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/reports` | Obtener métricas completas |

**Parámetros de query:**
- `startDate` - Fecha inicio (ISO)
- `endDate` - Fecha fin (ISO)
- `ownerId` - Filtrar por vendedor
- `clientId` - Filtrar por cliente

---

## Integración con Canales

El CRM se integra con el sistema de canales existente:

### Actividades desde Canales

- Las actividades pueden vincularse a mensajes de canal mediante `channelMessageId`
- Tipo `channel_message` representa mensajes importantes del chat
- Permite trazabilidad de conversaciones comerciales

### Proyectos

- Los deals pueden vincularse a proyectos mediante `projectId`
- Permite relacionar oportunidades con proyectos activos

---

## Limitaciones y Consideraciones

### Limitaciones Actuales

1. **Sin multi-pipeline**: Solo hay un pipeline global
2. **Sin productos/líneas**: Los deals no tienen desglose de productos
3. **Sin automatizaciones**: No hay workflows automáticos
4. **Sin importación masiva**: Los datos se ingresan manualmente
5. **Sin integración email**: No hay tracking de emails automático
6. **Sin cuotas de venta**: No hay gestión de metas por vendedor

### Consideraciones Técnicas

- **Permisos**: Verificar `permissionsLoading` antes de redirigir
- **Charts vacíos**: Los gráficos de Recharts requieren datos válidos
- **Etapa por defecto**: Siempre debe existir una etapa marcada como default
- **Contacto principal**: Solo uno por cliente

### Validaciones Importantes

- Un deal siempre requiere cliente y etapa
- Una actividad requiere al menos una relación (cliente, deal o contacto)
- No se puede eliminar una etapa con deals asociados
- No se puede eliminar la etapa por defecto

---

## Roadmap Futuro

### Próximas Funcionalidades Planificadas

- [ ] **Multi-pipeline** - Pipelines separados por tipo de negocio
- [ ] **Productos/Servicios** - Catálogo y líneas de cotización
- [ ] **Automatizaciones** - Workflows al cambiar etapa
- [ ] **Email tracking** - Integración con correo electrónico
- [ ] **Cuotas de venta** - Metas mensuales/trimestrales
- [ ] **Importación CSV** - Carga masiva de datos
- [ ] **Duplicados** - Detección y merge de registros
- [ ] **Campos calculados** - Fórmulas personalizadas
- [ ] **API pública** - Endpoints para integraciones externas
- [ ] **Webhooks** - Notificaciones a sistemas externos
- [ ] **Dashboard personalizable** - Widgets configurables
- [ ] **Competidores** - Tracking de competencia en deals

---

## Estructura de Archivos

```
app/
├── crm/
│   ├── page.tsx                    # Dashboard CRM
│   ├── activities/
│   │   └── page.tsx                # Lista de actividades
│   ├── clients/
│   │   ├── page.tsx                # Lista de clientes CRM
│   │   └── [id]/
│   │       └── page.tsx            # Perfil de cliente
│   ├── contacts/
│   │   └── page.tsx                # Lista de contactos
│   ├── deals/
│   │   ├── page.tsx                # Pipeline Kanban
│   │   └── [id]/
│   │       └── page.tsx            # Detalle del deal
│   └── reports/
│       └── page.tsx                # Reportes CRM
├── admin/
│   └── pipeline/
│       └── page.tsx                # Gestión de etapas (admin)
└── api/
    └── crm/
        ├── deals/
        │   ├── route.ts            # CRUD deals
        │   └── [id]/
        │       └── route.ts        # Deal individual
        ├── contacts/
        │   ├── route.ts            # CRUD contactos
        │   └── [id]/
        │       └── route.ts        # Contacto individual
        ├── activities/
        │   ├── route.ts            # CRUD actividades
        │   └── [id]/
        │       └── route.ts        # Actividad individual
        ├── pipeline-stages/
        │   ├── route.ts            # CRUD etapas
        │   └── [id]/
        │       └── route.ts        # Etapa individual
        └── reports/
            └── route.ts            # Reportes/métricas

components/
└── crm/
    └── ActivityModal.tsx           # Modal para crear actividades

models/
├── Deal.ts                         # Modelo de deals
├── Contact.ts                      # Modelo de contactos
├── Activity.ts                     # Modelo de actividades
├── PipelineStage.ts                # Modelo de etapas
└── Client.ts                       # Modelo de clientes (compartido)

hooks/
└── usePermissions.ts               # Hook de permisos (incluye CRM)
```

---

*Última actualización: Noviembre 2024*
