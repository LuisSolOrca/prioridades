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
   - [Productos del Deal](#productos-del-deal)
   - [Cotizaciones del Deal](#cotizaciones-del-deal)
7. [Clientes](#clientes)
   - [Perfil de Cliente](#perfil-de-cliente)
   - [Información CRM del Cliente](#información-crm-del-cliente)
8. [Contactos](#contactos)
   - [Gestión de Contactos](#gestión-de-contactos)
   - [Contacto Principal](#contacto-principal)
9. [Productos](#productos)
   - [Catálogo de Productos](#catálogo-de-productos)
   - [Niveles de Precio](#niveles-de-precio)
10. [Cotizaciones](#cotizaciones)
    - [Crear Cotización](#crear-cotización)
    - [Generar PDF](#generar-pdf)
    - [Enviar por Email](#enviar-por-email)
11. [Actividades](#actividades)
    - [Tipos de Actividad](#tipos-de-actividad)
    - [Registro de Actividades](#registro-de-actividades)
    - [Tareas Pendientes](#tareas-pendientes)
12. [Importación de Datos](#importación-de-datos)
    - [Tipos de Importación](#tipos-de-importación)
    - [Flujo de Importación](#flujo-de-importación)
    - [Mapeo de Columnas](#mapeo-de-columnas)
13. [Reportes CRM](#reportes-crm)
    - [Métricas del Pipeline](#métricas-del-pipeline)
    - [Tendencia Mensual](#tendencia-mensual)
    - [Forecast](#forecast)
    - [Rendimiento por Vendedor](#rendimiento-por-vendedor)
    - [Exportación PDF](#exportación-pdf)
14. [Modelos de Datos](#modelos-de-datos)
15. [API Endpoints](#api-endpoints)
16. [Integración con Canales](#integración-con-canales)
17. [Limitaciones y Consideraciones](#limitaciones-y-consideraciones)
18. [Roadmap Futuro](#roadmap-futuro)

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
- **PDFKit** para generación de cotizaciones PDF
- **Nodemailer** para envío de emails con cotizaciones
- **XLSX** para importación de datos CSV/Excel

---

## Características Principales

### ✅ Funcionalidades Disponibles

- 📊 **Dashboard CRM** - Vista general con métricas clave
- 🎯 **Pipeline Kanban** - Tablero visual drag & drop para gestión de deals
- 💰 **Gestión de Deals** - Crear, editar, mover entre etapas
- 🏢 **Gestión de Clientes** - Perfil completo con información CRM
- 👥 **Gestión de Contactos** - Contactos asociados a clientes con datos profesionales
- 📦 **Catálogo de Productos** - Productos con niveles de precio por volumen
- 📋 **Cotizaciones** - Crear, generar PDF y enviar por email
- 📝 **Registro de Actividades** - Llamadas, emails, reuniones, notas, tareas
- 📈 **Reportes Profesionales** - Métricas, gráficos y exportación PDF
- ⚙️ **Configuración de Pipeline** - Admin puede crear/editar/reordenar etapas
- 🔐 **Control de Permisos** - Acceso basado en rol y permisos específicos
- 🎨 **Valor Ponderado** - Cálculo automático según probabilidad de etapa
- 📅 **Forecast** - Proyección de ventas a 3 meses
- 👤 **Asignación de Vendedor** - Cada deal tiene un responsable asignado
- 🏷️ **Tags y Campos Personalizados** - Categorización flexible
- 📥 **Importación CSV/Excel** - Carga masiva de datos con mapeo de columnas

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
| `/crm/products` | `viewCRM` |
| `/crm/activities` | `viewCRM` |
| `/crm/reports` | `viewCRM` |
| `/crm/import` | `canManagePipelineStages` |
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
5. **Accesos Rápidos** - Botones para navegar a secciones principales:
   - Pipeline de Ventas
   - Contactos
   - Clientes
   - Productos
   - Importar

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

### Productos del Deal

**Ubicación:** `/crm/deals/[id]` → Tab "Productos"

Cada deal puede tener múltiples productos asociados:

**Funcionalidades:**
- ➕ **Agregar productos** del catálogo
- 📦 **Cantidad** ajustable
- 💰 **Precio unitario** - Automático según niveles de precio
- 🏷️ **Descuento** por línea (%)
- 📊 **Cálculo automático** de subtotal, impuestos y total
- 🔄 **Sincronización** - El valor del deal se actualiza automáticamente

**Columnas visibles:**
| Columna | Descripción |
|---------|-------------|
| Producto | Nombre y SKU |
| Cantidad | Cantidad solicitada |
| Precio Unit. | Precio según nivel de volumen |
| Descuento | Porcentaje de descuento |
| IVA | Tasa de impuesto |
| Total | Total de la línea |

### Cotizaciones del Deal

**Ubicación:** `/crm/deals/[id]` → Tab "Cotizaciones"

Desde el detalle del deal se pueden crear y gestionar cotizaciones:

**Funcionalidades:**
- ➕ **Crear cotización** a partir de los productos del deal
- 📄 **Descargar PDF** profesional
- 📧 **Enviar por email** con PDF adjunto
- 📝 **Múltiples versiones** de cotización por deal
- 🔄 **Estados** - Borrador, Enviada, Aceptada, Rechazada, Expirada

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

## Productos

**Ubicación:** `/crm/products`

### Catálogo de Productos

El catálogo de productos permite gestionar todos los productos y servicios disponibles para cotizar.

**Campos del producto:**

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| `name` | ✅ | Nombre del producto |
| `sku` | ❌ | Código único (Stock Keeping Unit) |
| `description` | ❌ | Descripción detallada |
| `price` | ✅ | Precio base |
| `currency` | ✅ | Moneda (MXN, USD, EUR) |
| `category` | ❌ | Categoría del producto |
| `unit` | ❌ | Unidad de medida |
| `taxRate` | ❌ | Tasa de IVA (default: 16%) |
| `isActive` | ❌ | Si está disponible |

**Categorías sugeridas:**
- Software
- Hardware
- Servicios
- Consultoría
- Capacitación
- Mantenimiento
- Licencias
- Suscripción

### Niveles de Precio

Los productos pueden tener **niveles de precio por volumen** (pricing tiers):

```typescript
interface IPricingTier {
  minQuantity: number;  // Cantidad mínima para aplicar
  price: number;        // Precio en esta tier
}
```

**Ejemplo:**
| Cantidad | Precio |
|----------|--------|
| 1-9 | $100 |
| 10-49 | $90 |
| 50+ | $80 |

El sistema selecciona automáticamente el precio correcto según la cantidad solicitada.

---

## Cotizaciones

**Ubicación:** `/crm/deals/[id]` → Tab "Cotizaciones"

### Crear Cotización

1. Ve al detalle del deal
2. Asegúrate de tener productos agregados
3. Ve a la pestaña "Cotizaciones"
4. Click en "Crear Cotización"

**Datos de la cotización:**
- **Número automático** - Formato: `COT-2025-0001`
- **Versión** - Incrementa automáticamente
- **Datos del cliente** - Nombre, contacto, email
- **Items** - Copia de los productos del deal
- **Totales** - Subtotal, descuento, IVA, total
- **Validez** - 30 días por defecto
- **Notas y términos** - Personalizables

### Generar PDF

Click en el ícono de PDF para descargar una cotización profesional que incluye:

- Encabezado con número de cotización y fecha
- Información del cliente
- Tabla de productos con cantidades, precios y totales
- Resumen de subtotal, descuentos, IVA y total
- Notas y términos y condiciones
- Pie de página con número de página

### Enviar por Email

Click en el ícono de email para enviar la cotización:

1. **Destinatario** - Email del contacto o personalizado
2. **Asunto** - Generado automáticamente
3. **Mensaje** - Texto personalizable
4. **PDF adjunto** - Se genera y adjunta automáticamente

**El email incluye:**
- Saludo personalizado
- Resumen de la cotización
- Fecha de validez
- PDF adjunto con el detalle completo

**Estados de cotización:**
| Estado | Descripción |
|--------|-------------|
| `draft` | Borrador, no enviada |
| `sent` | Enviada al cliente |
| `accepted` | Aceptada por el cliente |
| `rejected` | Rechazada por el cliente |
| `expired` | Fecha de validez vencida |

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

## Importación de Datos

**Ubicación:** `/crm/import`

### Tipos de Importación

| Tipo | Campos Requeridos | Campos Opcionales |
|------|-------------------|-------------------|
| **Clientes** | name | description, industry, website, phone, address, annualRevenue, employeeCount, source, tags |
| **Contactos** | firstName, lastName, clientName* | email, phone, position, department, linkedInUrl, tags |
| **Deals** | title, clientName*, value | contactName, stageName, currency, expectedCloseDate, probability, description, ownerEmail, tags |
| **Productos** | name, price | sku, description, currency, category, unit, taxRate |

*El cliente debe existir previamente en el sistema.

### Flujo de Importación

1. **Seleccionar tipo** - Clientes, Contactos, Deals o Productos
2. **Subir archivo** - CSV o Excel (.xlsx, .xls)
3. **Mapear columnas** - Asociar columnas del archivo con campos del sistema
4. **Validar datos** - Revisar errores y advertencias
5. **Ejecutar importación** - Procesar y crear/actualizar registros
6. **Ver resultados** - Resumen de creados, actualizados, omitidos y errores

### Mapeo de Columnas

El sistema ofrece dos formas de mapear columnas:

**1. Mapeo Automático:**
- El sistema sugiere mapeos basados en nombres similares de columnas
- Por ejemplo, "Nombre" se mapea automáticamente a "name"

**2. Mapeo Manual:**
- Arrastra campos a las columnas del archivo (drag & drop)
- O usa el selector desplegable en cada campo

**Opciones de importación:**
- **Actualizar existentes** - Si se encuentra un registro existente (por nombre, SKU, etc.), se actualiza con los nuevos datos

**Validaciones:**
- Campos requeridos presentes
- Formatos correctos (email, URL, números)
- Referencias válidas (cliente existe para contactos)
- Valores únicos (SKU de productos)

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

### Product

```typescript
interface IProduct {
  _id: ObjectId;
  name: string;
  sku?: string;
  description?: string;
  price: number;
  currency: 'MXN' | 'USD' | 'EUR';
  category?: string;
  unit?: string;
  taxRate?: number;        // Default: 16%
  isActive: boolean;
  pricingTiers?: IPricingTier[];
  imageUrl?: string;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IPricingTier {
  minQuantity: number;
  price: number;
}
```

### DealProduct

```typescript
interface IDealProduct {
  _id: ObjectId;
  dealId: ObjectId;        // ref: Deal
  productId: ObjectId;     // ref: Product
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  discount: number;        // Porcentaje
  taxRate: number;
  subtotal: number;        // Calculado
  discountAmount: number;  // Calculado
  taxAmount: number;       // Calculado
  total: number;           // Calculado
  notes?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Quote

```typescript
interface IQuote {
  _id: ObjectId;
  quoteNumber: string;     // Auto: COT-2025-0001
  version: number;
  dealId: ObjectId;        // ref: Deal
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  contactName?: string;
  contactEmail?: string;
  items: IQuoteItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  validUntil: Date;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  sentAt?: Date;
  sentTo?: string;
  notes?: string;
  terms?: string;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IQuoteItem {
  productId: ObjectId;
  productName: string;
  productSku?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
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

### Deal Products

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/deals/[id]/products` | Listar productos del deal |
| POST | `/api/crm/deals/[id]/products` | Agregar producto al deal |
| PUT | `/api/crm/deals/[id]/products` | Actualizar/reordenar productos |
| DELETE | `/api/crm/deals/[id]/products` | Eliminar producto del deal |

### Products

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/products` | Listar productos |
| POST | `/api/crm/products` | Crear producto |
| GET | `/api/crm/products/[id]` | Obtener producto |
| PUT | `/api/crm/products/[id]` | Actualizar producto |
| DELETE | `/api/crm/products/[id]` | Eliminar producto |

**Parámetros de query:**
- `activeOnly` - Solo productos activos
- `category` - Filtrar por categoría
- `search` - Buscar por nombre/SKU

### Quotes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/quotes` | Listar cotizaciones |
| POST | `/api/crm/quotes` | Crear cotización |
| GET | `/api/crm/quotes/[id]` | Obtener cotización |
| PUT | `/api/crm/quotes/[id]` | Actualizar cotización |
| DELETE | `/api/crm/quotes/[id]` | Eliminar cotización |
| GET | `/api/crm/quotes/[id]/pdf` | Generar PDF |
| POST | `/api/crm/quotes/[id]/send` | Enviar por email |

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

### Import

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/crm/import/parse` | Parsear archivo y obtener columnas |
| POST | `/api/crm/import/validate` | Validar datos mapeados |
| POST | `/api/crm/import/execute` | Ejecutar importación |

**Body (FormData):**
- `file` - Archivo CSV o Excel
- `type` - Tipo: clients, contacts, deals, products
- `mapping` - JSON con mapeo de columnas
- `updateExisting` - Boolean para actualizar existentes

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
2. **Sin cuotas de venta**: No hay gestión de metas por vendedor
3. **Sin automatizaciones**: No hay workflows automáticos al cambiar etapa
4. **Sin integración email**: No hay tracking de emails automático
5. **Sin duplicados**: No hay detección automática de duplicados

### Consideraciones Técnicas

- **Permisos**: Verificar `permissionsLoading` antes de redirigir
- **Charts vacíos**: Los gráficos de Recharts requieren datos válidos
- **Etapa por defecto**: Siempre debe existir una etapa marcada como default
- **Contacto principal**: Solo uno por cliente
- **SKU único**: Los productos con SKU deben tener código único

### Validaciones Importantes

- Un deal siempre requiere cliente y etapa
- Una actividad requiere al menos una relación (cliente, deal o contacto)
- No se puede eliminar una etapa con deals asociados
- No se puede eliminar la etapa por defecto
- No se puede eliminar un producto si está en uso en deals

---

## Roadmap Futuro

### Próximas Funcionalidades Planificadas

- [ ] **Cuotas de venta** - Metas mensuales/trimestrales/anuales por vendedor
- [ ] **Multi-pipeline** - Pipelines separados por tipo de negocio
- [ ] **Automatizaciones** - Workflows al cambiar etapa
- [ ] **Email tracking** - Integración con correo electrónico
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
│   │       └── page.tsx            # Detalle del deal (con tabs)
│   ├── import/
│   │   └── page.tsx                # Wizard de importación
│   ├── products/
│   │   └── page.tsx                # Catálogo de productos
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
        │       ├── route.ts        # Deal individual
        │       └── products/
        │           └── route.ts    # Productos del deal
        ├── contacts/
        │   ├── route.ts            # CRUD contactos
        │   └── [id]/
        │       └── route.ts        # Contacto individual
        ├── activities/
        │   ├── route.ts            # CRUD actividades
        │   └── [id]/
        │       └── route.ts        # Actividad individual
        ├── products/
        │   ├── route.ts            # CRUD productos
        │   └── [id]/
        │       └── route.ts        # Producto individual
        ├── quotes/
        │   ├── route.ts            # CRUD cotizaciones
        │   └── [id]/
        │       ├── route.ts        # Cotización individual
        │       ├── pdf/
        │       │   └── route.ts    # Generar PDF
        │       └── send/
        │           └── route.ts    # Enviar por email
        ├── import/
        │   ├── parse/
        │   │   └── route.ts        # Parsear archivo
        │   ├── validate/
        │   │   └── route.ts        # Validar datos
        │   └── execute/
        │       └── route.ts        # Ejecutar importación
        ├── pipeline-stages/
        │   ├── route.ts            # CRUD etapas
        │   └── [id]/
        │       └── route.ts        # Etapa individual
        └── reports/
            └── route.ts            # Reportes/métricas

models/
├── Deal.ts                         # Modelo de deals
├── DealProduct.ts                  # Modelo de productos en deal
├── Product.ts                      # Modelo de productos
├── Quote.ts                        # Modelo de cotizaciones
├── Contact.ts                      # Modelo de contactos
├── Activity.ts                     # Modelo de actividades
├── PipelineStage.ts                # Modelo de etapas
└── Client.ts                       # Modelo de clientes (compartido)

hooks/
└── usePermissions.ts               # Hook de permisos (incluye CRM)
```

---

*Última actualización: Noviembre 2024*
