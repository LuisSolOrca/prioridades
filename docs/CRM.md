# Sistema CRM - Documentación Completa

## Índice
1. [Introducción](#introducción)
2. [Características Principales](#características-principales)
3. [Permisos y Acceso](#permisos-y-acceso)
4. [Dashboard CRM](#dashboard-crm)
5. [Pipeline de Ventas](#pipeline-de-ventas)
   - [Multi-Pipeline](#multi-pipeline)
   - [Tablero Kanban](#tablero-kanban)
   - [Etapas del Pipeline](#etapas-del-pipeline)
   - [Gestión de Pipelines (Admin)](#gestión-de-pipelines-admin)
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
16. [Email Tracking](#email-tracking)
17. [Lead Scoring](#lead-scoring)
18. [Workflows y Automatizaciones](#workflows-y-automatizaciones)
19. [Secuencias de Email](#secuencias-de-email)
    - [Editor Visual de Plantillas](#editor-visual-de-plantillas-de-email)
    - [Variables Disponibles](#variables-disponibles)
    - [Biblioteca de Plantillas](#biblioteca-de-plantillas)
20. [Campos Personalizados](#campos-personalizados)
21. [Detección de Duplicados](#detección-de-duplicados)
22. [Cuotas y Metas de Ventas](#cuotas-y-metas-de-ventas)
23. [Integración con Canales](#integración-con-canales)
24. [Limitaciones y Consideraciones](#limitaciones-y-consideraciones)
25. [Competidores](#competidores)
26. [Changelog](#changelog)

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
- 📊 **Multi-Pipeline** - Múltiples pipelines para diferentes procesos de venta
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
- 🏆 **Tracking de Competidores** - Inteligencia competitiva con win rate analysis
- ✉️ **Editor Visual de Plantillas** - Editor WYSIWYG para emails con variables dinámicas

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

### Multi-Pipeline

El sistema soporta múltiples pipelines para diferentes procesos de venta. Por ejemplo:
- **Ventas Nuevas** - Pipeline para nuevos clientes
- **Renovaciones** - Pipeline para renovación de contratos
- **Enterprise** - Pipeline para ventas corporativas de alto valor
- **Upselling** - Pipeline para venta cruzada a clientes existentes

**Selector de Pipeline:**
En la vista de deals (`/crm/deals`), un dropdown permite cambiar entre pipelines disponibles. Cada pipeline tiene su propio conjunto de etapas y métricas independientes.

**Beneficios:**
- 📊 Procesos de venta separados con etapas específicas
- 📈 Métricas independientes por tipo de negocio
- 🎯 Reportes y forecast por pipeline
- 🔄 Etapas personalizables para cada proceso

### Tablero Kanban

**Ubicación:** `/crm/deals`

El pipeline es un tablero Kanban interactivo donde cada columna representa una etapa del proceso de ventas.

**Características:**
- ✅ **Drag & Drop** - Mueve deals entre columnas arrastrando
- ✅ **Actualización en tiempo real** - Los cambios se guardan automáticamente
- ✅ **Búsqueda** - Filtra deals por nombre o cliente
- ✅ **Métricas por Etapa** - Cada columna muestra cantidad de deals y valor total
- ✅ **Valor Total y Ponderado** - Header muestra totales del pipeline
- ✅ **Selector de Pipeline** - Cambia entre diferentes pipelines activos

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

### Gestión de Pipelines (Admin)

**Ubicación:** `/admin/pipelines`

Los administradores pueden crear y gestionar múltiples pipelines:

**Funcionalidades de Pipelines:**
- ➕ **Crear nuevos pipelines** con nombre, descripción y color
- ✏️ **Editar pipelines** existentes
- 🗑️ **Eliminar pipelines** (solo si no tienen deals)
- ⭐ **Marcar pipeline por defecto** (para nuevos deals)
- 📋 **Copiar etapas** de otro pipeline al crear uno nuevo

**Campos de cada Pipeline:**

| Campo | Descripción |
|-------|-------------|
| `name` | Nombre del pipeline |
| `description` | Descripción del proceso de venta |
| `color` | Color hex para identificación visual |
| `isDefault` | Si es el pipeline predeterminado |
| `isActive` | Si el pipeline está activo |

### Gestión de Etapas (Admin)

**Ubicación:** `/admin/pipeline`

Los administradores pueden gestionar las etapas de cada pipeline:

**Funcionalidades:**
- ➕ **Crear nuevas etapas** asociadas a un pipeline
- ✏️ **Editar nombre, color, probabilidad**
- 🔄 **Reordenar etapas** con drag & drop
- 🗑️ **Eliminar etapas** (solo si no tienen deals)
- ⭐ **Marcar etapa por defecto** (para nuevos deals del pipeline)
- ✅ **Marcar como cerrada** (ganada o perdida)

**Campos de cada etapa:**

| Campo | Descripción |
|-------|-------------|
| `name` | Nombre de la etapa |
| `pipelineId` | Pipeline al que pertenece |
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

### Pipeline

```typescript
interface IPipeline {
  _id: ObjectId;
  name: string;
  description?: string;
  color?: string;           // Código hex
  isDefault: boolean;       // Pipeline predeterminado
  isActive: boolean;
  createdBy: ObjectId;      // ref: User
  createdAt: Date;
  updatedAt: Date;
}
```

### Deal

```typescript
interface IDeal {
  _id: ObjectId;
  title: string;
  clientId: ObjectId;      // ref: Client
  contactId?: ObjectId;    // ref: Contact
  pipelineId?: ObjectId;   // ref: Pipeline
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
  pipelineId?: ObjectId;   // ref: Pipeline (opcional para retrocompatibilidad)
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
- `pipelineId` - Filtrar por pipeline
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

### Pipelines

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/pipelines` | Listar pipelines |
| POST | `/api/crm/pipelines` | Crear pipeline (admin) |
| GET | `/api/crm/pipelines/[id]` | Obtener pipeline con etapas y stats |
| PUT | `/api/crm/pipelines/[id]` | Actualizar pipeline (admin) |
| DELETE | `/api/crm/pipelines/[id]` | Eliminar pipeline (admin) |

**Parámetros de query (GET /api/crm/pipelines):**
- `includeInactive` - Incluir pipelines inactivos
- `includeStats` - Incluir estadísticas (etapas, deals, valor)

**Body POST:**
```typescript
{
  name: string;           // Requerido
  description?: string;
  color?: string;         // Default: #3B82F6
  isDefault?: boolean;
  copyStagesFrom?: string; // ID de pipeline para copiar etapas
}
```

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
- `pipelineId` - Filtrar por pipeline

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

## Email Tracking

**Ubicación:** `/crm/email-tracking`

El sistema de Email Tracking permite monitorear el engagement de los emails enviados desde el CRM.

### Funcionalidades

- 📬 **Tracking de Aperturas** - Detecta cuándo un destinatario abre un email
- 🔗 **Tracking de Clicks** - Registra clicks en enlaces dentro del email
- 💬 **Detección de Respuestas** - Identifica cuando el contacto responde
- 📊 **Métricas por Periodo** - Dashboard con estadísticas de engagement

### Métricas Disponibles

| Métrica | Descripción |
|---------|-------------|
| Emails Enviados | Total de emails con tracking activo |
| Aperturas | Cantidad de emails abiertos |
| Tasa de Apertura | % de emails abiertos vs enviados |
| Clicks | Total de clicks en enlaces |
| Tasa de Clicks | % de emails con al menos un click |
| Respuestas | Emails que recibieron respuesta |

### Cómo Funciona

1. Al enviar un email desde el CRM, se inserta un pixel de tracking invisible
2. Cuando el destinatario abre el email, el pixel carga y registra la apertura
3. Los enlaces se reescriben para pasar por el servidor de tracking
4. Las respuestas se detectan mediante monitoreo del inbox (si está configurado)

### API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/email-tracking` | Obtener estadísticas de tracking |
| GET | `/api/crm/email-tracking/[id]` | Detalle de un email específico |

---

## Lead Scoring

**Ubicación:** `/crm/lead-scoring`

El sistema de Lead Scoring permite calificar automáticamente a los contactos y clientes basándose en criterios de FIT (perfil ideal) y ENGAGEMENT (interacción).

### Componentes del Score

**FIT Score (0-50 puntos)**
- Califica qué tan bien coincide el lead con el perfil de cliente ideal
- Basado en atributos demográficos y firmográficos
- Ejemplo: industria, tamaño de empresa, cargo del contacto

**Engagement Score (0-50 puntos)**
- Mide la actividad e interacción del lead
- Basado en comportamiento y acciones
- Ejemplo: emails abiertos, reuniones, visitas al sitio

**Score Total: FIT + Engagement = 0-100 puntos**

### Reglas de FIT

Las reglas de FIT evalúan características estáticas del lead:

| Campo | Operadores | Ejemplo |
|-------|------------|---------|
| Industria | igual, contiene | Industria = "Tecnología" (+15 pts) |
| Empleados | mayor que, menor que, entre | Empleados > 100 (+10 pts) |
| Cargo | igual, contiene | Cargo contiene "Director" (+20 pts) |
| País/Región | igual | País = "México" (+5 pts) |
| Ingresos Anuales | mayor que | Ingresos > $1M (+15 pts) |

### Reglas de Engagement

Las reglas de Engagement evalúan comportamiento reciente:

| Acción | Puntos Sugeridos | Decaimiento |
|--------|------------------|-------------|
| Email abierto | +2 | 7 días |
| Click en email | +5 | 14 días |
| Respuesta a email | +10 | 30 días |
| Reunión agendada | +15 | 30 días |
| Reunión completada | +20 | 60 días |
| Cotización solicitada | +25 | 90 días |
| Visita a pricing | +10 | 14 días |

### Temperatura del Lead

El score total determina la temperatura visual:

| Rango | Temperatura | Color | Badge |
|-------|-------------|-------|-------|
| 0-25 | Frío | Azul | 🧊 |
| 26-50 | Tibio | Amarillo | 🌤️ |
| 51-75 | Caliente | Naranja | 🔥 |
| 76-100 | Muy Caliente | Rojo | 🌋 |

### Gestión de Reglas (Admin)

**Ubicación:** `/crm/lead-scoring` → Tab "Configuración"

Los administradores pueden:
- ➕ Crear nuevas reglas de FIT y Engagement
- ✏️ Editar puntuación y criterios
- 🔄 Activar/desactivar reglas
- 📊 Ver impacto de cada regla

### API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/lead-scoring/rules` | Listar reglas |
| POST | `/api/crm/lead-scoring/rules` | Crear regla |
| PUT | `/api/crm/lead-scoring/rules/[id]` | Actualizar regla |
| DELETE | `/api/crm/lead-scoring/rules/[id]` | Eliminar regla |
| POST | `/api/crm/lead-scoring/calculate` | Recalcular scores |

---

## Workflows y Automatizaciones

**Ubicación:** `/crm/workflows`

El sistema de Workflows permite automatizar acciones basadas en triggers y condiciones.

### Estructura de un Workflow

```
Trigger (Evento) → Condiciones (Filtros) → Acciones (Automatización)
```

### Triggers Disponibles

| Trigger | Descripción |
|---------|-------------|
| `deal_created` | Cuando se crea un nuevo deal |
| `deal_stage_changed` | Cuando un deal cambia de etapa |
| `deal_won` | Cuando un deal se marca como ganado |
| `deal_lost` | Cuando un deal se marca como perdido |
| `contact_created` | Cuando se crea un nuevo contacto |
| `activity_completed` | Cuando se completa una actividad |
| `lead_score_changed` | Cuando cambia el score de un lead |
| `email_opened` | Cuando se abre un email tracked |
| `email_replied` | Cuando se recibe respuesta a email |

### Condiciones

Las condiciones filtran cuándo debe ejecutarse el workflow:

```typescript
interface WorkflowCondition {
  field: string;       // Campo a evaluar
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;          // Valor a comparar
}
```

**Ejemplo:** Solo ejecutar si el valor del deal > $10,000

### Acciones Disponibles

| Acción | Descripción |
|--------|-------------|
| `send_email` | Enviar email automático |
| `create_task` | Crear tarea para el vendedor |
| `update_field` | Actualizar campo del registro |
| `add_tag` | Agregar etiqueta |
| `assign_owner` | Cambiar vendedor asignado |
| `send_notification` | Enviar notificación in-app |
| `add_to_sequence` | Agregar a secuencia de emails |
| `webhook` | Llamar webhook externo |

### Ejemplos de Workflows

**1. Notificación de Deal Grande:**
- Trigger: `deal_created`
- Condición: `value > 50000`
- Acción: `send_notification` al gerente de ventas

**2. Follow-up Automático:**
- Trigger: `deal_stage_changed` a "Propuesta Enviada"
- Condición: ninguna
- Acciones:
  - `create_task` "Llamar en 3 días"
  - `add_to_sequence` "Follow-up Propuesta"

**3. Alerta de Deal Inactivo:**
- Trigger: `scheduled` (diario)
- Condición: `days_since_activity > 7`
- Acción: `send_notification` al vendedor

### API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/workflows` | Listar workflows |
| POST | `/api/crm/workflows` | Crear workflow |
| PUT | `/api/crm/workflows/[id]` | Actualizar workflow |
| DELETE | `/api/crm/workflows/[id]` | Eliminar workflow |
| POST | `/api/crm/workflows/[id]/toggle` | Activar/desactivar |
| GET | `/api/crm/workflows/[id]/logs` | Ver historial de ejecución |

---

## Secuencias de Email

**Ubicación:** `/crm/sequences`

Las secuencias permiten automatizar series de emails de seguimiento con delays configurables.

### Estructura de una Secuencia

```
Paso 1 (Día 0) → [Espera 3 días] → Paso 2 → [Espera 5 días] → Paso 3 → ...
```

### Elementos de la Secuencia

**Pasos (Steps):**
- Cada paso puede ser: Email, Tarea o Acción de LinkedIn
- Soporta variables dinámicas: `{{contact.firstName}}`, `{{client.name}}`, etc.
- Puede incluir tracking de apertura y clicks

**Delays:**
- Tiempo de espera entre pasos
- Configurable en días u horas
- Excluye fines de semana (opcional)

**Condiciones de Salida:**
- Si el contacto responde → Sale de la secuencia
- Si se agenda una reunión → Sale de la secuencia
- Si el deal se gana/pierde → Sale de la secuencia
- Manual: El vendedor puede pausar o remover

### Tipos de Pasos

| Tipo | Icono | Descripción |
|------|-------|-------------|
| `email` | 📧 | Email con editor visual completo |
| `task` | ✅ | Tarea para el vendedor |
| `linkedin` | 🔗 | Acción de LinkedIn (conectar, mensaje, ver perfil) |

### Crear una Secuencia

1. Ve a `/crm/sequences`
2. Click en "Nueva Secuencia"
3. Configura nombre y descripción
4. Agrega pasos con el constructor visual
5. Configura delays entre pasos
6. Define condiciones de salida
7. Activa la secuencia

### Editor Visual de Plantillas de Email

**Ubicación:** `/crm/sequences/[id]` → Al agregar/editar paso de email

El editor visual permite crear emails profesionales sin conocimientos técnicos:

**Características del Editor:**

| Funcionalidad | Descripción |
|---------------|-------------|
| 🔤 **Formato de Texto** | Negritas, cursivas, enlaces, listas ordenadas y no ordenadas |
| 📝 **Variables Dinámicas** | Inserción de variables con dropdown organizado por categorías |
| 📚 **Biblioteca de Plantillas** | Acceso a plantillas guardadas con búsqueda y filtros |
| 👁️ **Vista Previa** | Previsualización en tiempo real con datos de ejemplo |
| 💾 **Guardar como Plantilla** | Guardar el email actual para reutilizar |

**Barra de Herramientas:**
- **B** - Texto en negritas (`**texto**`)
- **I** - Texto en cursiva (`*texto*`)
- **🔗** - Insertar enlace (`[texto](url)`)
- **• Lista** - Lista con viñetas
- **1. Lista** - Lista numerada
- **{x}** - Insertar variable dinámica

### Variables Disponibles

Las variables se insertan usando la sintaxis `{{categoria.campo}}`:

**Contacto:**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{contact.firstName}}` | Nombre | Juan |
| `{{contact.lastName}}` | Apellido | Pérez |
| `{{contact.fullName}}` | Nombre completo | Juan Pérez |
| `{{contact.email}}` | Email | juan@empresa.com |
| `{{contact.phone}}` | Teléfono | +52 55 1234 5678 |
| `{{contact.position}}` | Cargo | Director de TI |

**Empresa:**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{client.name}}` | Nombre empresa | Empresa ABC |
| `{{client.industry}}` | Industria | Tecnología |
| `{{client.website}}` | Sitio web | www.empresa.com |

**Oportunidad:**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{deal.title}}` | Título del deal | Implementación CRM |
| `{{deal.value}}` | Valor | $150,000 |
| `{{deal.stage}}` | Etapa | Propuesta |

**Remitente:**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{user.name}}` | Tu nombre | María García |
| `{{user.email}}` | Tu email | maria@miempresa.com |
| `{{user.phone}}` | Tu teléfono | +52 55 9876 5432 |
| `{{user.signature}}` | Tu firma | María García, Gerente de Ventas |

**Fechas:**
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{date.today}}` | Fecha de hoy | 28 de noviembre, 2025 |
| `{{date.tomorrow}}` | Fecha de mañana | 29 de noviembre, 2025 |
| `{{date.nextWeek}}` | Próxima semana | 5 de diciembre, 2025 |

### Biblioteca de Plantillas

El editor incluye acceso a una biblioteca de plantillas reutilizables:

**Funcionalidades:**
- 🔍 **Búsqueda** - Buscar por nombre o contenido
- 🏷️ **Categorías** - Filtrar por tipo de plantilla
- 📊 **Uso** - Ver cuántas veces se ha usado cada plantilla
- ⭐ **Recientes** - Acceso rápido a plantillas usadas recientemente

**Categorías de Plantillas:**
| Categoría | Descripción |
|-----------|-------------|
| `outreach` | Prospección - Primer contacto con prospectos |
| `follow_up` | Seguimiento - Recordatorios y seguimientos |
| `nurture` | Nutrición - Mantener relación a largo plazo |
| `closing` | Cierre - Cerrar ventas y negociaciones |
| `other` | Otros - Plantillas generales |

### Guardar como Plantilla

Al crear un email en una secuencia, se puede guardar como plantilla reutilizable:

1. Click en "Guardar como Plantilla" en el editor
2. Asignar nombre descriptivo
3. Agregar descripción (opcional)
4. Seleccionar categoría
5. Marcar si es compartida con el equipo
6. Guardar

**Campos del Modal:**
| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| Nombre | ✅ | Nombre identificativo de la plantilla |
| Descripción | ❌ | Cuándo usar esta plantilla |
| Categoría | ✅ | Tipo de plantilla |
| Compartir | ❌ | Si otros usuarios pueden usarla |

### Estados de Contacto en Secuencia

| Estado | Descripción |
|--------|-------------|
| `active` | En progreso, esperando siguiente paso |
| `paused` | Pausado manualmente |
| `completed` | Completó todos los pasos |
| `replied` | Respondió a un email (salió) |
| `bounced` | Email rebotó |
| `unsubscribed` | Se desuscribió |

### API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/sequences` | Listar secuencias |
| POST | `/api/crm/sequences` | Crear secuencia |
| PUT | `/api/crm/sequences/[id]` | Actualizar secuencia |
| DELETE | `/api/crm/sequences/[id]` | Eliminar secuencia |
| POST | `/api/crm/sequences/[id]/enroll` | Agregar contacto a secuencia |
| POST | `/api/crm/sequences/[id]/unenroll` | Remover contacto |
| GET | `/api/crm/sequences/[id]/enrollments` | Ver contactos en secuencia |

### Email Templates

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/email-templates` | Listar plantillas de email |
| POST | `/api/crm/email-templates` | Crear nueva plantilla |
| GET | `/api/crm/email-templates/[id]` | Obtener plantilla |
| PUT | `/api/crm/email-templates/[id]` | Actualizar plantilla |
| DELETE | `/api/crm/email-templates/[id]` | Eliminar plantilla |

**Parámetros de query (GET):**
- `category` - Filtrar por categoría
- `search` - Buscar por nombre/contenido
- `shared` - Solo plantillas compartidas

---

## Campos Personalizados

**Ubicación:** `/crm/settings/custom-fields`

El sistema de campos personalizados permite a los administradores crear campos adicionales para las entidades del CRM.

### Entidades Soportadas

| Entidad | Descripción |
|---------|-------------|
| `client` | Clientes/Empresas |
| `contact` | Contactos/Personas |
| `deal` | Deals/Oportunidades |
| `product` | Productos/Servicios |

### Tipos de Campo

| Tipo | Descripción | Validaciones |
|------|-------------|--------------|
| `text` | Texto libre | minLength, maxLength |
| `number` | Número entero o decimal | minValue, maxValue |
| `date` | Selector de fecha | - |
| `boolean` | Checkbox Sí/No | - |
| `select` | Lista desplegable | opciones definidas |
| `multiselect` | Selección múltiple | opciones definidas |
| `url` | URL/Link | formato URL |
| `email` | Correo electrónico | formato email |
| `phone` | Teléfono | - |
| `currency` | Valor monetario | currencyCode, minValue, maxValue |
| `formula` | Valor calculado | formula, decimalPlaces, prefix, suffix |

### Propiedades del Campo

| Propiedad | Descripción |
|-----------|-------------|
| `name` | Identificador único (snake_case) |
| `label` | Etiqueta visible para usuarios |
| `description` | Texto de ayuda |
| `fieldType` | Tipo de campo |
| `required` | Si es obligatorio |
| `defaultValue` | Valor por defecto |
| `placeholder` | Texto placeholder |
| `options` | Opciones para select/multiselect |
| `showInList` | Mostrar en listas |
| `showInCard` | Mostrar en cards/vista rápida |
| `order` | Posición en formularios |

### Opciones de Select/Multiselect

```typescript
interface SelectOption {
  value: string;   // Valor almacenado
  label: string;   // Texto visible
  color?: string;  // Color hex opcional
}
```

### Campos de Fórmula

Los campos de fórmula permiten crear valores calculados automáticamente basados en otros campos del mismo registro.

**Configuración:**

| Propiedad | Descripción | Ejemplo |
|-----------|-------------|---------|
| `formula` | Expresión matemática | `value * 0.05` |
| `decimalPlaces` | Decimales a mostrar | `2` |
| `formulaPrefix` | Prefijo del resultado | `$` |
| `formulaSuffix` | Sufijo del resultado | `%` |

**Variables Disponibles:**

| Variable | Entidad | Descripción |
|----------|---------|-------------|
| `value` | Deal | Valor del deal |
| `probability` | Deal | Probabilidad de cierre |
| `quantity` | Product | Cantidad del producto |
| `price` | Product | Precio del producto |
| `discount` | Deal/Product | Descuento aplicado |

También puedes referenciar otros campos personalizados por su nombre.

**Funciones Soportadas:**

| Función | Descripción | Ejemplo |
|---------|-------------|---------|
| `SUM` | Suma | `SUM(a, b, c)` |
| `AVERAGE` | Promedio | `AVERAGE(a, b, c)` |
| `MAX` | Máximo | `MAX(a, b)` |
| `MIN` | Mínimo | `MIN(a, b)` |
| `IF` | Condicional | `IF(value > 10000, 0.1, 0.05)` |
| `ROUND` | Redondear | `ROUND(value * 0.05, 2)` |
| `ABS` | Valor absoluto | `ABS(value)` |
| `SQRT` | Raíz cuadrada | `SQRT(value)` |
| `POWER` | Potencia | `POWER(value, 2)` |

**Ejemplos de Fórmulas:**

```
# Comisión del 5%
value * 0.05

# Subtotal de producto
price * quantity

# Comisión escalonada
IF(value > 10000, value * 0.1, value * 0.05)

# Precio con descuento
price * quantity * (1 - discount / 100)

# Valor ponderado del deal
value * probability / 100
```

**Comportamiento:**
- Los campos de fórmula se calculan en tiempo real
- No se pueden editar manualmente (son de solo lectura)
- No pueden ser marcados como "requeridos"
- El valor se recalcula automáticamente cuando cambian los campos referenciados

### Uso en Formularios

Los campos personalizados se renderizan automáticamente en:
- Formularios de creación/edición
- Cards de vista rápida (si `showInCard: true`)
- Columnas de lista (si `showInList: true`)

**Componente Reutilizable:**

```tsx
import CustomFieldsRenderer from '@/components/crm/CustomFieldsRenderer';

<CustomFieldsRenderer
  entityType="client"
  values={customFields}
  onChange={setCustomFields}
  mode="form" // 'form' | 'display' | 'list'
/>
```

### API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/custom-fields` | Listar campos |
| POST | `/api/crm/custom-fields` | Crear campo (admin) |
| GET | `/api/crm/custom-fields/[id]` | Obtener campo |
| PUT | `/api/crm/custom-fields/[id]` | Actualizar campo (admin) |
| DELETE | `/api/crm/custom-fields/[id]` | Desactivar campo (admin) |

**Parámetros de query (GET):**
- `entityType` - Filtrar por entidad
- `includeInactive` - Incluir campos desactivados

### Modelo de Datos

```typescript
interface ICustomField {
  _id: ObjectId;
  name: string;              // Identificador único
  label: string;             // Etiqueta visible
  description?: string;
  fieldType: CustomFieldType;
  entityType: 'client' | 'contact' | 'deal' | 'product';
  options?: SelectOption[];  // Para select/multiselect
  defaultValue?: any;
  placeholder?: string;
  required: boolean;
  minLength?: number;        // Para text
  maxLength?: number;        // Para text
  minValue?: number;         // Para number/currency
  maxValue?: number;         // Para number/currency
  currencyCode?: string;     // Para currency (MXN, USD, EUR)
  order: number;
  showInList: boolean;
  showInCard: boolean;
  isActive: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Detección de Duplicados

**Ubicación:** `/crm/duplicates`

El sistema de detección de duplicados ayuda a mantener datos limpios identificando y fusionando registros duplicados.

### Funcionalidades

- 🔍 **Detección Automática** - Fuzzy matching con algoritmo Levenshtein
- ⚠️ **Advertencias en Creación** - Modal de alerta al crear registros similares
- 🔄 **Fusión de Registros** - Merge manual con selección de campos
- 📊 **Dashboard de Duplicados** - Vista de todos los duplicados potenciales

### Algoritmo de Detección

El sistema utiliza múltiples técnicas para identificar duplicados:

**1. Similitud de Nombres (Levenshtein Distance):**
```typescript
// Normalización: quita acentos, sufijos empresariales (S.A., S.C., etc.)
// Umbral: 80% de similitud

"Empresa ABC S.A. de C.V." → "empresa abc"
"Empresa ABC, SA"          → "empresa abc"
// Similitud: 100%
```

**2. Coincidencia de Email:**
- Normalización de Gmail (ignorar +tags y puntos)
- Detección exacta después de normalización

**3. Coincidencia de Teléfono:**
- Normalización: solo dígitos
- Manejo de códigos de país

### Campos de Verificación por Entidad

| Entidad | Campos Verificados | Umbral |
|---------|-------------------|--------|
| Cliente | name, phone | 80% nombre |
| Contacto | name, email, phone | Email exacto o 80% nombre |

### Flujo de Detección

```
Usuario ingresa datos → API verifica duplicados →
Si duplicados: Mostrar modal de advertencia →
  - "Usar existente" → Seleccionar registro
  - "Ignorar" → Crear de todos modos
  - "Cancelar" → Volver al formulario
```

### Componente de Advertencia

```tsx
import DuplicateWarning from '@/components/crm/DuplicateWarning';

// En formulario de creación
<DuplicateWarning
  type="client"
  name={formData.name}
  phone={formData.phone}
  onSelect={(id) => router.push(`/crm/clients/${id}`)}
  onIgnore={() => setDismissed(true)}
/>
```

### Hook para Verificación Programática

```tsx
import { useDuplicateCheck } from '@/components/crm/DuplicateWarning';

const { duplicates, loading, checkDuplicates, hasDuplicates } = useDuplicateCheck('client');

// Verificar antes de guardar
const handleSubmit = async () => {
  const result = await checkDuplicates({ name, phone });
  if (result.hasDuplicates) {
    // Mostrar confirmación
  } else {
    // Proceder con guardado
  }
};
```

### Fusión de Registros (Admin)

Los administradores pueden fusionar duplicados desde `/crm/duplicates`:

1. **Seleccionar registro a conservar** - El registro "master"
2. **Seleccionar campos a copiar** - Campos del registro eliminado
3. **Confirmar fusión**:
   - Deals, contactos y actividades se transfieren
   - Registro eliminado se marca como `[FUSIONADO]`

### API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/duplicates/check` | Verificar duplicados antes de crear |
| GET | `/api/crm/duplicates` | Listar todos los duplicados |
| POST | `/api/crm/duplicates` | Fusionar dos registros |

**Parámetros de /check:**
- `type` - 'client' | 'contact'
- `name` - Nombre a verificar
- `email` - Email a verificar (contactos)
- `phone` - Teléfono a verificar
- `excludeId` - ID a excluir (para edición)

**Respuesta:**
```typescript
interface DuplicateCheckResponse {
  hasDuplicates: boolean;
  duplicates: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    similarity: number;    // 0-1
    matchedOn: string[];   // ['name', 'email', 'phone']
  }[];
}
```

---

## Cuotas y Metas de Ventas

**Ubicación:** `/crm/quotas`

El sistema de cuotas permite establecer y dar seguimiento a metas de ventas por vendedor y período.

### Funcionalidades

- 🎯 **Metas por Vendedor** - Cuotas individuales
- 📅 **Períodos Configurables** - Mensual, trimestral, anual
- 📊 **Seguimiento de Progreso** - % de cumplimiento en tiempo real
- 🏆 **Ranking de Vendedores** - Comparativo de rendimiento

### Configuración de Cuotas (Admin)

Los administradores pueden configurar cuotas en `/crm/quotas`:

**Campos de Cuota:**

| Campo | Descripción |
|-------|-------------|
| `userId` | Vendedor asignado |
| `period` | Tipo de período (monthly, quarterly, yearly) |
| `year` | Año fiscal |
| `month/quarter` | Mes o trimestre (según período) |
| `targetAmount` | Monto objetivo |
| `currency` | Moneda (MXN, USD, EUR) |

### Métricas de Cumplimiento

El sistema calcula automáticamente:

| Métrica | Descripción |
|---------|-------------|
| **Logrado** | Suma de deals ganados en el período |
| **Pipeline** | Valor de deals abiertos |
| **Proyectado** | Pipeline × probabilidad promedio |
| **% Cumplimiento** | Logrado / Meta × 100 |
| **Gap** | Meta - Logrado |

### Estados de Cumplimiento

| Estado | Condición | Color |
|--------|-----------|-------|
| Superado | > 100% | Verde |
| En meta | 80-100% | Azul |
| En riesgo | 50-80% | Amarillo |
| Crítico | < 50% | Rojo |

### Vista del Vendedor

Cada vendedor puede ver su cuota actual y progreso en el dashboard:

- 📊 Gráfico de progreso circular
- 📈 Tendencia histórica
- 🎯 Deals necesarios para alcanzar meta
- 📅 Días restantes en el período

### API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/quotas` | Listar cuotas |
| POST | `/api/crm/quotas` | Crear cuota (admin) |
| PUT | `/api/crm/quotas/[id]` | Actualizar cuota (admin) |
| DELETE | `/api/crm/quotas/[id]` | Eliminar cuota (admin) |
| GET | `/api/crm/quotas/progress` | Obtener progreso del usuario actual |
| GET | `/api/crm/quotas/ranking` | Ranking de cumplimiento |

**Parámetros de query:**
- `userId` - Filtrar por vendedor
- `period` - Tipo de período
- `year` - Año
- `month` - Mes (para mensual)
- `quarter` - Trimestre (para trimestral)

### Modelo de Datos

```typescript
interface IQuota {
  _id: ObjectId;
  userId: ObjectId;       // ref: User
  period: 'monthly' | 'quarterly' | 'yearly';
  year: number;
  month?: number;         // 1-12 para monthly
  quarter?: number;       // 1-4 para quarterly
  targetAmount: number;
  currency: 'MXN' | 'USD' | 'EUR';
  achievedAmount: number; // Calculado
  isActive: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

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

## Competidores

**Ubicación:** `/crm/competitors`

El sistema de tracking de competidores permite capturar información sobre la competencia en cada deal para análisis de inteligencia de mercado.

### Funcionalidades

- 🏢 **Catálogo de Competidores** - Base de datos centralizada de competidores
- 📊 **Tracking por Deal** - Asociar competidores a deals específicos
- 📈 **Win Rate Analysis** - Estadísticas de victorias/derrotas por competidor
- 💡 **Intelligence** - Fortalezas, debilidades, precios de la competencia

### Catálogo de Competidores

**Ubicación:** `/crm/competitors`

El catálogo mantiene la información maestra de cada competidor:

| Campo | Descripción |
|-------|-------------|
| `name` | Nombre del competidor |
| `website` | Sitio web |
| `description` | Descripción general |
| `strengths` | Fortalezas generales (array) |
| `weaknesses` | Debilidades generales (array) |
| `pricing` | Información de precios |
| `marketPosition` | Posición de mercado (leader, challenger, niche, unknown) |
| `logo` | URL del logo |

### Competidores en Deals

**Ubicación:** `/crm/deals/[id]` → Tab "Competidores"

En cada deal, se pueden registrar los competidores involucrados:

**Campos de seguimiento:**

| Campo | Descripción |
|-------|-------------|
| `competitorId` | Competidor del catálogo |
| `status` | Estado: active, won_against, lost_to, no_decision |
| `threatLevel` | Nivel de amenaza: low, medium, high |
| `notes` | Notas específicas del deal |
| `contactedBy` | Quién del cliente los contactó |
| `theirPrice` | Precio que ofrece el competidor |
| `theirStrengths` | Fortalezas específicas en este deal |
| `theirWeaknesses` | Debilidades específicas en este deal |

### Flujo de Trabajo

1. **Agregar competidor al deal** - Seleccionar del catálogo o crear nuevo
2. **Establecer nivel de amenaza** - Evaluar qué tan fuerte es la competencia
3. **Registrar información** - Precio, fortalezas, debilidades específicas
4. **Actualizar resultado** - Marcar si ganamos o perdimos contra ellos

### Estadísticas de Competidores

El sistema calcula automáticamente:

| Métrica | Descripción |
|---------|-------------|
| **Win Rate** | % de deals ganados contra cada competidor |
| **Value Won/Lost** | Valor monetario ganado y perdido |
| **Tendencia Mensual** | Wins/losses por mes |
| **Top Razones de Pérdida** | Análisis de notas de deals perdidos |

### API Endpoints

**Catálogo de Competidores:**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/competitors` | Listar competidores |
| POST | `/api/crm/competitors` | Crear competidor |
| GET | `/api/crm/competitors/[id]` | Obtener competidor con stats |
| PUT | `/api/crm/competitors/[id]` | Actualizar competidor |
| DELETE | `/api/crm/competitors/[id]` | Eliminar competidor (admin) |
| GET | `/api/crm/competitors/stats` | Estadísticas globales |

**Competidores en Deals:**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/crm/deals/[id]/competitors` | Listar competidores del deal |
| POST | `/api/crm/deals/[id]/competitors` | Agregar competidor al deal |
| PUT | `/api/crm/deals/[id]/competitors` | Actualizar competidor en deal |
| DELETE | `/api/crm/deals/[id]/competitors` | Remover competidor del deal |

### Modelos de Datos

**Competitor:**

```typescript
interface ICompetitor {
  _id: ObjectId;
  name: string;
  website?: string;
  description?: string;
  strengths: string[];
  weaknesses: string[];
  pricing?: string;
  marketPosition: 'leader' | 'challenger' | 'niche' | 'unknown';
  logo?: string;
  isActive: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

**DealCompetitor:**

```typescript
interface IDealCompetitor {
  _id: ObjectId;
  dealId: ObjectId;           // ref: Deal
  competitorId: ObjectId;     // ref: Competitor
  status: 'active' | 'won_against' | 'lost_to' | 'no_decision';
  threatLevel: 'low' | 'medium' | 'high';
  notes?: string;
  contactedBy?: string;
  theirPrice?: number;
  theirStrengths: string[];
  theirWeaknesses: string[];
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Roadmap Futuro

### Próximas Funcionalidades Planificadas

- [ ] **Campos calculados** - Fórmulas personalizadas
- [ ] **API pública** - Endpoints para integraciones externas
- [ ] **Webhooks** - Notificaciones a sistemas externos
- [ ] **Dashboard personalizable** - Widgets configurables

### Funcionalidades Implementadas

- [x] **Multi-pipeline** - Pipelines separados por tipo de negocio
- [x] **Email tracking** - Tracking de aperturas, clicks y respuestas
- [x] **Lead Scoring** - Calificación automática de leads (FIT + Engagement)
- [x] **Workflows** - Automatizaciones basadas en triggers y condiciones
- [x] **Secuencias de Email** - Series de emails automatizados
- [x] **Editor Visual de Plantillas** - Editor WYSIWYG con variables dinámicas y biblioteca de plantillas
- [x] **Campos Personalizados** - Campos custom por entidad con soporte para fórmulas calculadas
- [x] **Detección de Duplicados** - Fuzzy matching y fusión de registros
- [x] **Cuotas de Venta** - Metas por vendedor y período
- [x] **Competidores** - Tracking de competencia en deals con win rate analysis

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
│   ├── competitors/
│   │   └── page.tsx                # Catálogo de competidores
│   ├── deals/
│   │   ├── page.tsx                # Pipeline Kanban
│   │   └── [id]/
│   │       └── page.tsx            # Detalle del deal (con tabs: actividades, productos, cotizaciones, competidores)
│   ├── email-tracking/
│   │   └── page.tsx                # Dashboard de email tracking
│   ├── import/
│   │   └── page.tsx                # Wizard de importación
│   ├── lead-scoring/
│   │   └── page.tsx                # Lead scoring y reglas
│   ├── products/
│   │   └── page.tsx                # Catálogo de productos
│   ├── reports/
│   │   └── page.tsx                # Reportes CRM
│   ├── sequences/
│   │   ├── page.tsx                # Lista de secuencias
│   │   └── [id]/
│   │       └── page.tsx            # Constructor de secuencia con editor visual
│   ├── duplicates/
│   │   └── page.tsx                # Gestión de duplicados
│   ├── settings/
│   │   └── custom-fields/
│   │       └── page.tsx            # Gestión de campos personalizados
│   └── workflows/
│       └── page.tsx                # Gestión de workflows
├── admin/
│   ├── pipeline/
│   │   └── page.tsx                # Gestión de etapas (admin)
│   └── pipelines/
│       └── page.tsx                # Gestión de pipelines (admin)
└── api/
    └── crm/
        ├── competitors/
        │   ├── route.ts            # CRUD competidores
        │   ├── stats/
        │   │   └── route.ts        # Estadísticas de competidores
        │   └── [id]/
        │       └── route.ts        # Competidor individual
        ├── deals/
        │   ├── route.ts            # CRUD deals
        │   └── [id]/
        │       ├── route.ts        # Deal individual
        │       ├── products/
        │       │   └── route.ts    # Productos del deal
        │       └── competitors/
        │           └── route.ts    # Competidores del deal
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
        ├── pipelines/
        │   ├── route.ts            # CRUD pipelines
        │   └── [id]/
        │       └── route.ts        # Pipeline individual
        ├── pipeline-stages/
        │   ├── route.ts            # CRUD etapas
        │   └── [id]/
        │       └── route.ts        # Etapa individual
        ├── reports/
        │   └── route.ts            # Reportes/métricas
        ├── custom-fields/
        │   ├── route.ts            # CRUD campos personalizados
        │   └── [id]/
        │       └── route.ts        # Campo individual
        ├── duplicates/
        │   ├── route.ts            # Listar y fusionar duplicados
        │   └── check/
        │       └── route.ts        # Verificar duplicados
        ├── email-tracking/
        │   └── route.ts            # Estadísticas de tracking
        ├── lead-scoring/
        │   └── rules/
        │       └── route.ts        # CRUD reglas de scoring
        ├── workflows/
        │   ├── route.ts            # CRUD workflows
        │   └── [id]/
        │       └── route.ts        # Workflow individual
        ├── sequences/
        │   ├── route.ts            # CRUD secuencias
        │   └── [id]/
        │       ├── route.ts        # Secuencia individual
        │       └── enroll/
        │           └── route.ts    # Enrollar/desenrollar contactos
        └── email-templates/
            ├── route.ts            # CRUD plantillas de email
            └── [id]/
                └── route.ts        # Plantilla individual

models/
├── Deal.ts                         # Modelo de deals
├── DealProduct.ts                  # Modelo de productos en deal
├── DealCompetitor.ts               # Modelo de competidores en deal
├── Product.ts                      # Modelo de productos
├── Competitor.ts                   # Modelo de competidores
├── Quote.ts                        # Modelo de cotizaciones
├── Contact.ts                      # Modelo de contactos
├── Activity.ts                     # Modelo de actividades
├── Pipeline.ts                     # Modelo de pipelines
├── PipelineStage.ts                # Modelo de etapas
├── Client.ts                       # Modelo de clientes (compartido)
├── CustomField.ts                  # Modelo de campos personalizados
├── LeadScoringRule.ts              # Modelo de reglas de scoring
├── Workflow.ts                     # Modelo de workflows
├── EmailSequence.ts                # Modelo de secuencias
└── EmailTemplate.ts                # Modelo de plantillas de email

hooks/
└── usePermissions.ts               # Hook de permisos (incluye CRM)

components/
└── crm/
    ├── CustomFieldsRenderer.tsx    # Componente para renderizar campos custom
    ├── DuplicateWarning.tsx        # Componente de advertencia de duplicados
    ├── EmailTemplateEditor.tsx     # Editor visual de plantillas de email
    └── SaveTemplateModal.tsx       # Modal para guardar email como plantilla

lib/
└── crm/
    └── duplicateDetection.ts       # Utilidades de detección de duplicados
```

---

## Changelog

### v2.6.0 - 29 de Noviembre 2025
- ✨ **Campos de Fórmula** - Nuevo tipo de campo personalizado calculado
  - Fórmulas usando hot-formula-parser (380+ funciones)
  - Variables: value, probability, quantity, price, discount
  - Referencias a otros campos personalizados
  - Cálculo en tiempo real
  - Configuración de decimales, prefijo y sufijo
  - Ejemplos: comisión = value * 0.05, subtotal = price * quantity

### v2.5.0 - 29 de Noviembre 2025
- ✨ **Editor Visual de Plantillas de Email** - Nuevo editor WYSIWYG para crear emails en secuencias
  - Barra de herramientas de formato (negritas, cursivas, enlaces, listas)
  - Inserción de variables con dropdown organizado por categorías
  - Vista previa en tiempo real con sustitución de variables
  - Biblioteca de plantillas integrada con búsqueda y filtros
  - Guardar emails como plantillas reutilizables
- 🧩 Nuevos componentes: `EmailTemplateEditor`, `SaveTemplateModal`

### v2.4.0 - Noviembre 2025
- ✨ **Tracking de Competidores** - Sistema completo de inteligencia competitiva
  - Catálogo centralizado de competidores
  - Tracking de competidores por deal
  - Win rate analysis y estadísticas
- ✨ **Multi-Pipeline** - Soporte para múltiples pipelines de venta
  - Crear y gestionar pipelines independientes
  - Etapas personalizables por pipeline
  - Métricas y reportes por pipeline

### v2.3.0 - Noviembre 2025
- ✨ **Secuencias de Email** - Automatización de seguimientos
  - Constructor visual de secuencias
  - Pasos de email, tareas y LinkedIn
  - Condiciones de salida configurables
- ✨ **Workflows y Automatizaciones** - Motor de automatización basado en triggers

### v2.2.0 - Noviembre 2025
- ✨ **Lead Scoring** - Calificación automática de leads
  - Reglas de FIT y Engagement configurables
  - Temperatura visual del lead
- ✨ **Email Tracking** - Monitoreo de engagement de emails
  - Tracking de aperturas y clicks
  - Detección de respuestas

### v2.1.0 - Octubre 2025
- ✨ **Campos Personalizados** - Sistema de custom fields por entidad
- ✨ **Detección de Duplicados** - Fuzzy matching con algoritmo Levenshtein
- ✨ **Cuotas de Venta** - Metas por vendedor y período

### v2.0.0 - Octubre 2025
- ✨ **Cotizaciones** - Generación de cotizaciones PDF profesionales
- ✨ **Productos con Pricing Tiers** - Niveles de precio por volumen
- ✨ **Importación CSV/Excel** - Carga masiva de datos

### v1.0.0 - Septiembre 2025
- 🎉 **Lanzamiento inicial del CRM**
  - Dashboard con métricas clave
  - Pipeline Kanban con drag & drop
  - Gestión de deals, clientes y contactos
  - Registro de actividades
  - Reportes básicos con exportación PDF

---

*Última actualización: 29 de Noviembre 2025*
