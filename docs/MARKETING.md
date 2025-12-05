# Marketing Hub

Sistema integral de gestión de marketing digital con integraciones a múltiples plataformas publicitarias y herramientas de análisis.

## Índice

1. [Resumen](#resumen)
2. [Integraciones de Plataformas](#integraciones-de-plataformas)
3. [Gestión de Campañas](#gestión-de-campañas)
4. [Email Campaigns](#email-campaigns)
5. [Marketing Automations](#marketing-automations)
6. [Landing Pages Builder](#landing-pages-builder)
7. [Attribution Reporting](#attribution-reporting)
8. [CAC Dashboard](#cac-dashboard)
9. [Píxeles de Retargeting](#píxeles-de-retargeting)
10. [Asistente IA de Copywriting](#asistente-ia-de-copywriting)
11. [Constructor de Audiencias](#constructor-de-audiencias)
12. [Constructor de Creativos](#constructor-de-creativos)
13. [Web Analytics](#web-analytics)
14. [WhatsApp Business](#whatsapp-business)
15. [Sincronización](#sincronización)
16. [API Reference](#api-reference)
17. [Modelos de Datos](#modelos-de-datos)
18. [Flujo de Creación de Touchpoints](#flujo-de-creación-de-touchpoints)

---

## Resumen

El Marketing Hub centraliza la gestión de campañas publicitarias en múltiples plataformas, permitiendo:

- Conexión OAuth con plataformas publicitarias
- Creación y gestión de campañas multi-plataforma
- Segmentación avanzada de audiencias con lógica AND/OR
- Constructor visual de creativos con soporte para imágenes, videos y carruseles
- Tracking de métricas y analytics web
- Gestión de plantillas de WhatsApp Business

### Acceso

| Ruta | Descripción |
|------|-------------|
| `/marketing` | Dashboard principal |
| `/marketing/campaigns` | Lista de campañas Ads |
| `/marketing/campaigns/new` | Crear nueva campaña Ads |
| `/marketing/email-campaigns` | Campañas de email |
| `/marketing/email-campaigns/new` | Crear campaña de email |
| `/marketing/landing-pages` | Constructor de landing pages |
| `/marketing/landing-pages/new` | Crear landing page |
| `/marketing/attribution` | Dashboard de atribución |
| `/marketing/attribution/compare` | Comparar modelos de atribución |
| `/marketing/attribution/conversions` | Lista de conversiones |
| `/marketing/audiences` | Biblioteca de audiencias |
| `/marketing/creatives` | Biblioteca de creativos |
| `/marketing/web-tracking` | Web Analytics |
| `/marketing/analytics` | Analytics de campañas |
| `/marketing/automations` | Automatizaciones de marketing |
| `/marketing/automations/new` | Crear automatización |
| `/marketing/whatsapp` | WhatsApp Business |
| `/marketing/whatsapp/templates` | Plantillas de WhatsApp |
| `/marketing/cac` | Dashboard de CAC |
| `/marketing/tracking-pixels` | Gestión de píxeles de retargeting |
| `/marketing/sentiment` | Análisis de sentimiento IA |
| `/unsubscribe` | Centro de preferencias (público) |

### Permisos Requeridos

| Permiso | Descripción |
|---------|-------------|
| `viewMarketing` | Acceso al Marketing Hub |
| `canManageCampaigns` | Crear/editar campañas, audiencias y creativos |
| `canViewWebAnalytics` | Ver analytics web |
| `canManageWhatsApp` | Gestionar plantillas de WhatsApp |

---

## Integraciones de Plataformas

### Plataformas Soportadas

| Plataforma | OAuth | Campañas | Métricas | Estado |
|------------|-------|----------|----------|--------|
| Meta (Facebook/Instagram) | ✅ | ✅ | ✅ | Completo |
| Google Ads | ✅ | ✅ | ✅ | Completo |
| LinkedIn | ✅ | ✅ | ✅ | Completo |
| Twitter/X | ✅ | ✅ | ✅ | Completo |
| TikTok | ✅ | ✅ | ✅ | Completo |
| YouTube | ✅ | ✅ | ✅ | Completo |
| WhatsApp Business | ✅ | - | ✅ | Templates |
| Google Analytics 4 | ✅ | - | ✅ | Solo métricas |

### Configuración de Integraciones

**Admin Panel**: `/admin/marketing-integrations`

Variables de entorno requeridas:

```env
# Meta (Facebook/Instagram)
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=

# Twitter
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
TWITTER_REDIRECT_URI=

# TikTok
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=

# YouTube (Google)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Google Ads
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_REDIRECT_URI=

# WhatsApp Business
WHATSAPP_BUSINESS_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# Google Analytics 4
GA4_MEASUREMENT_ID=
GA4_API_SECRET=

# Cloudflare R2 (para creativos)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

### Flujo de Conexión OAuth

1. Usuario accede a `/admin/marketing-integrations`
2. Selecciona plataforma a conectar
3. Se redirige al proveedor OAuth
4. Callback procesa tokens en `/api/marketing/oauth/[platform]/callback`
5. Tokens se almacenan encriptados en `MarketingPlatformConfig`

---

## Gestión de Campañas

### Crear Campaña

**Ruta**: `/marketing/campaigns/new`

El wizard de creación tiene 6 pasos:

#### Paso 1: Plataforma
Seleccionar la plataforma de destino:
- Meta (Facebook/Instagram)
- LinkedIn
- Twitter
- TikTok
- YouTube

#### Paso 2: Objetivo
Definir el objetivo de la campaña:

| Objetivo | Descripción |
|----------|-------------|
| Reconocimiento | Aumentar el alcance de tu marca |
| Tráfico | Dirigir visitantes a tu sitio web |
| Interacción | Obtener más likes, comentarios y compartidos |
| Leads | Capturar información de contacto |
| Conversiones | Impulsar ventas o acciones específicas |
| Mensajes | Iniciar conversaciones con clientes |
| Vistas de Video | Maximizar visualizaciones de video |

#### Paso 3: Presupuesto
Configurar presupuesto y fechas:
- **Nombre**: Nombre descriptivo de la campaña
- **Descripción**: Descripción opcional
- **Tipo de presupuesto**: Diario o Total
- **Monto**: Cantidad en MXN
- **Fechas**: Inicio y fin de la campaña

#### Paso 4: Audiencia
Definir segmentación usando el Constructor de Audiencias (ver sección dedicada)

#### Paso 5: Creativo
Diseñar el anuncio usando el Constructor de Creativos (ver sección dedicada)

#### Paso 6: Revisar
Confirmar todos los detalles antes de crear la campaña

### Estados de Campaña

| Estado | Descripción |
|--------|-------------|
| `DRAFT` | Borrador, no publicada |
| `PENDING_REVIEW` | Enviada para revisión |
| `ACTIVE` | Campaña activa |
| `PAUSED` | Pausada manualmente |
| `COMPLETED` | Finalizada por fecha |
| `REJECTED` | Rechazada por la plataforma |
| `ARCHIVED` | Archivada |

### Métricas de Campaña

Las campañas activas sincronizan métricas automáticamente:

| Métrica | Descripción |
|---------|-------------|
| Alcance | Usuarios únicos alcanzados |
| Impresiones | Veces que se mostró el anuncio |
| Clics | Clics en el anuncio |
| CTR | Click-Through Rate (%) |
| CPC | Costo por Clic |
| CPM | Costo por Mil Impresiones |
| Conversiones | Acciones completadas |
| Costo por Conversión | Gasto / Conversiones |
| ROAS | Return on Ad Spend |
| Frecuencia | Promedio de veces mostrado por usuario |

---

## Email Campaigns

### Descripción

Sistema completo para crear y enviar campañas de email marketing con builder visual, templates, A/B testing y analytics detallados.

**Ruta**: `/marketing/email-campaigns`

### Características

- **Builder Visual**: Editor drag-drop tipo Mailchimp con bloques predefinidos
- **Generador de Contenido IA**: Crear contenido de marketing con inteligencia artificial
- **Templates**: Biblioteca de 8 plantillas predefinidas por tipo de campaña
- **A/B Testing**: Probar variantes de asunto, contenido y horarios con UI dedicada
- **Segmentación**: Usar audiencias del CRM o crear segmentos personalizados
- **Envío Real**: Integración con Resend para envío de emails
- **Tracking Automático**: Pixel de apertura y tracking de clicks en enlaces
- **Programación**: Cron job para envío de campañas programadas
- **Centro de Preferencias**: Página pública para gestionar suscripciones
- **Personalización**: Merge tags para contenido dinámico (`{{firstName}}`, `{{lastName}}`, etc.)

### Proveedor de Email: Resend

El sistema usa **Resend** para el envío de emails. Configuración requerida:

```env
# Resend API (for Email Campaigns) - https://resend.com
RESEND_API_KEY=re_your_api_key_here
RESEND_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

#### Configurar Webhook

1. Ir a https://resend.com/webhooks
2. Crear webhook con URL: `https://tu-dominio.com/api/webhooks/resend`
3. Seleccionar eventos: `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`
4. Copiar el webhook secret y agregarlo a `RESEND_WEBHOOK_SECRET`

#### Límites de Envío

- **Batch**: Hasta 100 emails por lote (manejado automáticamente)
- **Rate Limit**: Depende del plan de Resend
- **Free Tier**: 100 emails/día, 3,000 emails/mes

### Generador de Contenido IA

El editor incluye un generador de contenido con IA que puede crear:

| Tipo | Descripción |
|------|-------------|
| Línea de asunto | 3 opciones optimizadas para aperturas |
| Titular | Titulares impactantes para el email |
| Cuerpo del email | Contenido persuasivo en HTML |
| Botón CTA | Textos de call-to-action efectivos |
| Preheader | Textos de previsualización |

**Configuración**: Usa la API de Groq con el modelo `llama-3.3-70b-versatile`.

### Tipos de Bloques

| Bloque | Descripción |
|--------|-------------|
| Text | Bloque de texto enriquecido |
| Image | Imagen con link opcional |
| Button | Botón de CTA |
| Columns | Diseño en columnas (2 o 3) |
| Divider | Línea separadora |
| Spacer | Espacio vertical |
| Social | Links a redes sociales |
| Video | Embed de YouTube/Vimeo |
| HTML | Código HTML personalizado |
| Menu | Menú de navegación |
| Product | Tarjeta de producto |

### Personalización con Merge Tags

El contenido puede personalizarse usando merge tags:

| Tag | Descripción |
|-----|-------------|
| `{{firstName}}` | Nombre del contacto |
| `{{lastName}}` | Apellido del contacto |
| `{{email}}` | Email del contacto |
| `{{fullName}}` | Nombre completo |

Ejemplo:
```html
<p>Hola {{firstName}},</p>
<p>Gracias por tu interés en nuestros productos...</p>
```

### Segmentación de Audiencia

Al enviar una campaña, puedes segmentar por:

1. **Todos los contactos**: Envía a todos los contactos activos
2. **Segmento**: Aplica reglas de segmentación (AND/OR) del constructor de audiencias
3. **Lista**: Envía a una lista específica de contactos

Las reglas de segmento soportan:
- Ubicación (ciudad)
- Industria/Empresa
- Cargo/Posición
- Tags de contacto
- Tipo de contacto (cliente, lead, etc.)

### Estados de Campaña

| Estado | Descripción |
|--------|-------------|
| `draft` | Borrador en edición |
| `scheduled` | Programada para envío |
| `sending` | En proceso de envío |
| `sent` | Enviada completamente |
| `paused` | Pausada (todos los envíos fallaron) |
| `cancelled` | Cancelada |

### Métricas de Email

| Métrica | Descripción | Tracking |
|---------|-------------|----------|
| Enviados | Total de emails enviados | API Resend |
| Entregados | Emails que llegaron a inbox | Webhook |
| Abiertos | Emails abiertos (open rate) | Webhook |
| Clicks | Clicks en enlaces (CTR) | Webhook |
| Bounces | Emails rebotados (hard/soft) | Webhook |
| Quejas | Marcados como spam | Webhook |
| Desuscripciones | Desuscripciones | Webhook |

### A/B Testing

Probar variantes de:
- **Asunto**: Diferentes líneas de asunto
- **Contenido**: Diferentes diseños/textos
- **Remitente**: Diferentes nombres/emails de remitente
- **Horario de envío**: Diferentes horas

Configurar porcentaje por variante y criterio de ganador (open rate, click rate).

#### Componente ABTestManager

El componente `ABTestManager` proporciona una UI completa para configurar pruebas A/B:

```typescript
import ABTestManager from '@/components/marketing/ABTestManager';

<ABTestManager
  variants={variants}
  onChange={setVariants}
  winnerCriteria={criteria}
  onCriteriaChange={setCriteria}
  showMetrics={true}  // Mostrar métricas si hay datos
/>
```

**Características:**
- Hasta 6 variantes (A, B, C, D, E, F)
- Distribución visual de pesos con barras de progreso
- Criterio de ganador configurable (aperturas, clicks, conversiones)
- Visualización de métricas cuando `showMetrics=true`

### Biblioteca de Templates

El sistema incluye 8 plantillas predefinidas listas para usar:

| Template | Categoría | Descripción |
|----------|-----------|-------------|
| `welcome-simple` | welcome | Bienvenida limpia y profesional |
| `newsletter-modern` | newsletter | Newsletter con imagen destacada |
| `promo-sale` | promotional | Promoción con descuento |
| `event-invitation` | event | Invitación a evento |
| `product-announcement` | announcement | Anuncio de producto |
| `follow-up-simple` | follow_up | Seguimiento personalizado |
| `abandoned-cart` | promotional | Recordatorio de carrito |
| `holiday-greeting` | seasonal | Mensaje de temporada |

**API de Templates:**

```bash
# Listar templates disponibles
GET /api/marketing/email-templates

# Obtener template específico
GET /api/marketing/email-templates/[id]

# Crear template personalizado
POST /api/marketing/email-templates
```

### Email Tracking

El sistema implementa tracking de aperturas y clicks sin dependencia de webhooks externos.

#### Tracking de Aperturas

Se inserta automáticamente un pixel de 1x1 transparente al final de cada email:

```html
<img src="https://tu-dominio.com/api/email/track/open?c=CONTACT_ID&m=CAMPAIGN_ID"
     width="1" height="1" style="display:block" />
```

**Endpoint**: `GET /api/email/track/open`
- Devuelve GIF transparente de 1x1
- Registra apertura en `EmailCampaignRecipient`
- Actualiza métricas de la campaña

#### Tracking de Clicks

Los enlaces del email se reescriben para pasar por el tracker:

```
Original: https://ejemplo.com/producto
Trackeado: https://tu-dominio.com/api/email/track/click?u=URL_ENCODED&c=CONTACT_ID&m=CAMPAIGN_ID&l=LINK_ID
```

**Endpoint**: `GET /api/email/track/click`
- Registra click con ID de enlace
- Redirige al URL original
- Actualiza métricas de la campaña

#### Utilidades de Tracking

```typescript
import {
  prepareEmailHtml,
  generateUnsubscribeUrl,
  generateTrackedLink
} from '@/lib/emailUtils';

// Preparar HTML con tracking completo
const html = prepareEmailHtml(originalHtml, contactId, campaignId, {
  trackOpens: true,
  trackClicks: true,
  includeUnsubscribe: true,
  companyName: 'Mi Empresa'
});
```

### Programación de Envíos

Las campañas con estado `scheduled` y `scheduledAt` se envían automáticamente.

#### Cron Job

**Endpoint**: `GET /api/cron/send-scheduled-emails`

Configurar cron externo (cron-job.org, Vercel Cron, etc.) para ejecutar cada minuto:

```bash
# Cada minuto
* * * * * curl https://tu-dominio.com/api/cron/send-scheduled-emails
```

**Funcionamiento:**
1. Busca campañas con `status: 'scheduled'` y `scheduledAt <= now`
2. Procesa hasta 5 campañas por ejecución
3. Genera HTML desde bloques del editor
4. Aplica personalización con merge tags
5. Añade tracking de aperturas y clicks
6. Envía en lotes de 100 (límite de Resend)
7. Actualiza estado a `sent` y registra métricas

### Centro de Preferencias (Unsubscribe)

Página pública para que los contactos gestionen sus preferencias de email.

**Ruta**: `/unsubscribe?token=ENCRYPTED_TOKEN`

#### Funcionalidades

- **Ver preferencias actuales**: Estado de cada tipo de suscripción
- **Darse de baja de todo**: Desuscripción completa con razón opcional
- **Actualizar preferencias**: Activar/desactivar categorías individualmente
- **Resuscribirse**: Volver a activar todas las comunicaciones

#### Tipos de Preferencias

| Preferencia | Descripción |
|-------------|-------------|
| `marketing` | Comunicaciones de marketing general |
| `newsletter` | Boletín informativo |
| `promotions` | Ofertas y promociones |
| `productUpdates` | Actualizaciones de producto |
| `events` | Invitaciones a eventos y webinars |

#### API de Preferencias

```bash
# Obtener preferencias
GET /api/public/unsubscribe?token=TOKEN

# Actualizar preferencias
POST /api/public/unsubscribe
{
  "token": "...",
  "action": "update_preferences",  // o "unsubscribe_all", "resubscribe"
  "preferences": { ... },
  "reason": "too_many_emails"  // opcional para unsubscribe
}
```

#### Generar Link de Unsubscribe

```typescript
import { encryptId, generateUnsubscribeUrl } from '@/lib/emailUtils';

// El enlace se incluye automáticamente con prepareEmailHtml()
const unsubscribeUrl = generateUnsubscribeUrl(contactId, campaignId);
```

### API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/marketing/email-campaigns` | Listar campañas |
| POST | `/api/marketing/email-campaigns` | Crear campaña |
| GET | `/api/marketing/email-campaigns/[id]` | Obtener campaña |
| PUT | `/api/marketing/email-campaigns/[id]` | Actualizar campaña |
| DELETE | `/api/marketing/email-campaigns/[id]` | Eliminar campaña |
| POST | `/api/marketing/email-campaigns/[id]/send` | Enviar campaña |
| POST | `/api/webhooks/resend` | Webhook de Resend |

---

## Marketing Automations

### Descripción

Sistema de automatización de marketing para crear flujos de trabajo basados en triggers y acciones. Permite automatizar tareas repetitivas como envío de emails, gestión de tags, y acciones en CRM.

**Ruta**: `/marketing/automations`

### Características

- **Triggers variados**: 11 tipos de eventos que inician automatizaciones
- **Filtros de Triggers**: Búsqueda y categorías para encontrar triggers rápidamente
- **Acciones flexibles**: 13 tipos de acciones disponibles
- **Variables contextuales**: Referencia de variables disponibles según el trigger
- **Condiciones**: Lógica condicional para flujos complejos
- **Delays**: Esperas configurables entre acciones
- **Logs de ejecución**: Historial completo de ejecuciones
- **Estadísticas**: Métricas de éxito y contactos activos
- **Editor de bloques**: Usa plantillas de email con editor visual

### Tipos de Triggers

| Trigger | Categoría | Descripción |
|---------|-----------|-------------|
| `form_submission` | Formularios | Envío de formulario web |
| `landing_page_visit` | Landing Pages | Visita a landing page |
| `email_opened` | Email | Email abierto |
| `email_clicked` | Email | Clic en enlace de email |
| `contact_created` | CRM | Nuevo contacto en CRM |
| `contact_updated` | CRM | Contacto actualizado |
| `tag_added` | CRM | Tag agregado a contacto |
| `deal_stage_changed` | CRM | Cambio de etapa en deal |
| `deal_won` | CRM | Deal marcado como ganado |
| `date_based` | Programados | Programado (fecha/hora) |
| `webhook` | Integraciones | Webhook externo |

### Categorías de Triggers

El selector de triggers incluye filtros por categoría para facilitar la búsqueda:

| Categoría | Descripción |
|-----------|-------------|
| Email | Eventos de campañas de email |
| Landing Pages | Eventos de landing pages |
| Formularios | Envíos de formularios web |
| CRM | Eventos de contactos y deals |
| Programados | Triggers basados en fecha/hora |
| Integraciones | Webhooks externos |

### Variables Disponibles por Trigger

El editor muestra un panel de **Variables Disponibles** que cambia según el trigger seleccionado:

**Variables Comunes (todos los triggers):**
- `{{contact.firstName}}`, `{{contact.lastName}}`, `{{contact.email}}`
- `{{today}}`, `{{tomorrow}}`, `{{nextWeek}}`

**Variables específicas por Trigger:**

| Trigger | Variables Adicionales |
|---------|----------------------|
| `form_submission` | `{{form.name}}`, `{{form.submissionDate}}`, campos del formulario |
| `landing_page_visit` | `{{landingPage.title}}`, `{{landingPage.url}}` |
| `email_opened` / `email_clicked` | `{{email.subject}}`, `{{email.campaignName}}` |
| `deal_stage_changed` | `{{deal.title}}`, `{{deal.value}}`, `{{deal.previousStage}}`, `{{deal.newStage}}` |
| `deal_won` | `{{deal.title}}`, `{{deal.value}}`, `{{deal.closedDate}}` |
| `tag_added` | `{{tag.name}}` |

**Panel de Variables:**
- Click en cualquier variable para copiarla al portapapeles
- Panel colapsable para más espacio de trabajo
- Variables organizadas por categoría (Contacto, Deal, Fechas, etc.)

### Tipos de Acciones

| Acción | Descripción |
|--------|-------------|
| `send_email` | Enviar email desde template |
| `send_whatsapp` | Enviar mensaje de WhatsApp |
| `add_tag` | Agregar tag a contacto |
| `remove_tag` | Remover tag de contacto |
| `update_contact` | Actualizar campo de contacto |
| `create_deal` | Crear nuevo deal |
| `update_deal` | Actualizar deal existente |
| `add_to_list` | Agregar a lista de contactos |
| `remove_from_list` | Remover de lista |
| `send_notification` | Enviar notificación interna |
| `webhook` | Llamar webhook externo |
| `wait` | Esperar X tiempo |
| `condition` | Evaluar condición (if/else) |

### Estados de Automatización

| Estado | Descripción |
|--------|-------------|
| `draft` | Borrador en edición |
| `active` | Activa y ejecutándose |
| `paused` | Pausada temporalmente |
| `archived` | Archivada |

### Configuración de Trigger

Cada trigger puede tener configuración específica:

```typescript
// Ejemplo: Trigger por envío de formulario
{
  type: 'form_submission',
  config: {
    formId: '...',           // ID del formulario específico
    landingPageId: '...'     // O landing page específica
  }
}

// Ejemplo: Trigger basado en fecha
{
  type: 'date_based',
  config: {
    dateField: 'createdAt',
    daysAfter: 7,            // 7 días después
    time: '09:00'            // A las 9am
  }
}
```

### Configuración de Acciones

```typescript
// Ejemplo: Enviar email
{
  type: 'send_email',
  config: {
    emailTemplateId: '...',
    subject: 'Bienvenido {{contact.firstName}}'
  }
}

// Ejemplo: Esperar
{
  type: 'wait',
  config: {
    duration: 2,
    unit: 'days'  // 'minutes', 'hours', 'days'
  }
}

// Ejemplo: Condición
{
  type: 'condition',
  config: {
    field: 'contact.tags',
    operator: 'contains',
    value: 'premium',
    trueActions: [...],   // Acciones si true
    falseActions: [...]   // Acciones si false
  }
}
```

### Reglas de Ejecución

| Configuración | Descripción |
|---------------|-------------|
| `allowReEntry` | Permite que mismo contacto entre varias veces |
| `reEntryDelay` | Tiempo mínimo entre re-entradas (horas) |
| `maxExecutionsPerContact` | Límite de ejecuciones por contacto |

### Triggering Manual

Para disparar una automatización programáticamente:

```bash
POST /api/marketing/automations/trigger
{
  "triggerType": "form_submission",
  "triggerData": {
    "formId": "...",
    "contactId": "...",
    "data": { ... }
  }
}
```

### API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/marketing/automations` | Listar automatizaciones |
| POST | `/api/marketing/automations` | Crear automatización |
| GET | `/api/marketing/automations/[id]` | Obtener automatización |
| PUT | `/api/marketing/automations/[id]` | Actualizar automatización |
| DELETE | `/api/marketing/automations/[id]` | Eliminar automatización |
| POST | `/api/marketing/automations/[id]/activate` | Activar |
| POST | `/api/marketing/automations/[id]/pause` | Pausar |
| POST | `/api/marketing/automations/trigger` | Disparar trigger |

### Ejemplo de Automatización

**Nombre**: Bienvenida a nuevos leads

```json
{
  "name": "Bienvenida a nuevos leads",
  "trigger": {
    "type": "contact_created",
    "config": {
      "source": "web_form"
    }
  },
  "actions": [
    {
      "type": "add_tag",
      "config": { "tagName": "nuevo-lead" }
    },
    {
      "type": "send_email",
      "config": { "emailTemplateId": "welcome-template" }
    },
    {
      "type": "wait",
      "config": { "duration": 3, "unit": "days" }
    },
    {
      "type": "condition",
      "config": {
        "field": "contact.emailOpened",
        "operator": "equals",
        "value": true,
        "trueActions": [
          { "type": "send_email", "config": { "emailTemplateId": "follow-up" } }
        ],
        "falseActions": [
          { "type": "add_tag", "config": { "tagName": "no-engagement" } }
        ]
      }
    }
  ]
}
```

---

## Landing Pages Builder

### Descripción

Constructor visual no-code para crear landing pages de alta conversión con integración nativa de WebForms, A/B testing y analytics detallados.

**Ruta**: `/marketing/landing-pages`

### Características

- **Editor Visual**: Drag-drop con preview en tiempo real
- **Generador de Contenido IA**: Crear textos persuasivos con inteligencia artificial
- **Secciones Predefinidas**: 21 tipos de secciones
- **Templates**: Por industria y objetivo
- **Responsive**: Modos desktop, tablet y mobile
- **SEO**: Meta tags, Open Graph, sitemap
- **A/B Testing**: Variantes con pesos configurables
- **Analytics**: Views, conversiones, scroll depth, tiempo en página
- **Forms**: Integración nativa con WebToLead
- **Dark Mode**: Soporte completo para modo oscuro

### Generador de Contenido IA

El editor incluye un generador de contenido con IA (Groq API) para crear:

| Tipo | Descripción |
|------|-------------|
| Hero completo | Titular + subtítulo + CTA |
| Beneficios | Lista de 4-6 beneficios con descripción |
| Características | Lista de features con descripción |
| Testimonios | Citas de clientes realistas |
| FAQ | Preguntas frecuentes con respuestas |
| Sección CTA | Título de cierre + subtítulo + botón |
| Estadísticas | 3-4 métricas impactantes |

### Tipos de Secciones

| Categoría | Secciones |
|-----------|-----------|
| Layout | Header, Footer |
| Content | Hero, Features, Benefits, Text, FAQ, Stats, Team |
| Social Proof | Testimonials, Logos |
| Media | Video, Gallery |
| Conversion | CTA, Form, Pricing, Countdown, Comparison |
| Basic | Divider, Spacer, Columns, HTML |

### Sección de Video

La sección de video soporta múltiples fuentes:

| Fuente | Descripción |
|--------|-------------|
| YouTube | URLs de youtube.com o youtu.be |
| Vimeo | URLs de vimeo.com |
| Directo | URL directa a archivo .mp4, .webm |

Opciones disponibles:
- **Autoplay**: Reproduce automáticamente (silenciado)
- **Loop**: Repite el video continuamente
- **Título**: Muestra un título sobre el video

### Estilos Globales

| Propiedad | Descripción |
|-----------|-------------|
| Primary Color | Color principal |
| Secondary Color | Color secundario |
| Background Color | Fondo de página |
| Text Color | Color de texto |
| Font Family | Tipografía general |
| Heading Font | Tipografía de títulos |
| Container Width | Ancho máximo (px) |
| Border Radius | Radio de bordes (px) |

### URL Pública

Las landing pages publicadas están disponibles en:
```
/lp/[slug]
```

### Analytics por Landing Page

| Métrica | Descripción |
|---------|-------------|
| Views | Vistas totales |
| Unique Visitors | Visitantes únicos |
| Form Submissions | Envíos de formulario |
| Conversion Rate | Tasa de conversión |
| Avg Time on Page | Tiempo promedio |
| Scroll Depth | Profundidad de scroll |
| Bounce Rate | Tasa de rebote |

### A/B Testing

Configurar variantes con diferentes secciones y pesos:

```typescript
abTest: {
  enabled: true,
  variants: [
    { id: 'control', name: 'Control', weight: 50, sections: [...] },
    { id: 'variant-a', name: 'Variante A', weight: 50, sections: [...] }
  ],
  winnerCriteria: 'conversions' // 'conversions' | 'engagement'
}
```

### Plantillas de Landing Pages

El sistema incluye 10 plantillas predefinidas listas para usar, optimizadas para los principales casos de uso de marketing.

#### Plantillas Disponibles

| Template | Categoría | Descripción |
|----------|-----------|-------------|
| `lead-generation-simple` | Lead Generation | Captura de leads con hero, beneficios, formulario y CTA |
| `product-launch` | Product Launch | Lanzamiento de producto con countdown, features y precios |
| `webinar-event` | Webinar / Event | Registro a webinar con countdown, ponentes y FAQ |
| `saas-software` | SaaS / Software | Landing SaaS con hero, features, pricing y testimonios |
| `ecommerce-promo` | E-commerce | Promoción con ofertas, productos destacados y urgencia |
| `coming-soon` | Coming Soon | Pre-lanzamiento con countdown y captura de emails |
| `thank-you` | Thank You | Página de agradecimiento post-conversión |
| `app-download` | App Download | Descarga de app con features, screenshots y stores |
| `service-business` | Service Business | Negocio de servicios con beneficios, proceso y contacto |
| `portfolio-simple` | Portfolio | Portfolio profesional con galería y contacto |

#### Categorías de Templates

| Categoría | Descripción |
|-----------|-------------|
| `lead_generation` | Captura de leads y formularios |
| `product_launch` | Lanzamiento de productos |
| `webinar_event` | Webinars, eventos y conferencias |
| `saas_software` | Productos SaaS y software |
| `ecommerce_promo` | Promociones de e-commerce |
| `coming_soon` | Páginas de pre-lanzamiento |
| `thank_you` | Páginas de agradecimiento |
| `app_download` | Descarga de aplicaciones |
| `service_business` | Negocios de servicios |
| `portfolio` | Portfolios y showcases |

#### Usar Plantillas

```bash
# Listar todas las plantillas (sistema + personalizadas)
GET /api/marketing/landing-templates
GET /api/marketing/landing-templates?category=lead_generation

# Obtener plantilla específica por slug
POST /api/marketing/landing-templates
{
  "action": "get",
  "slug": "lead-generation-simple"
}
```

#### Crear Plantilla Personalizada

```bash
POST /api/marketing/landing-templates
{
  "action": "create",
  "name": "Mi Template Custom",
  "slug": "mi-template-custom",
  "description": "Template personalizado para mi negocio",
  "category": "lead_generation",
  "content": {
    "sections": [...],
    "globalStyles": {
      "primaryColor": "#3B82F6",
      "secondaryColor": "#10B981",
      "backgroundColor": "#ffffff",
      "textColor": "#1F2937",
      "fontFamily": "Inter, system-ui, sans-serif",
      "containerWidth": 1200,
      "borderRadius": 8
    }
  },
  "tags": ["custom", "lead-gen"]
}
```

#### Modelo LandingPageTemplate

```typescript
interface ILandingPageTemplate {
  name: string;
  slug: string;          // Identificador único
  description: string;
  category: LandingTemplateCategory;
  thumbnail?: string;    // URL de preview
  previewUrl?: string;   // URL de demo
  content: {
    sections: ILandingSection[];
    globalStyles: ILandingGlobalStyles;
  };
  tags: string[];
  isSystem: boolean;     // true = plantilla del sistema
  isActive: boolean;
  usageCount: number;
  createdBy?: ObjectId;
}
```

#### Secciones por Plantilla

Cada plantilla está optimizada con las secciones más relevantes para su caso de uso:

| Template | Secciones Incluidas |
|----------|---------------------|
| Lead Generation | Hero, Benefits, Form, CTA |
| Product Launch | Hero, Countdown, Features, Pricing, FAQ, CTA |
| Webinar/Event | Hero, Countdown, Features (Speakers), FAQ, Form |
| SaaS/Software | Header, Hero, Features, Pricing, Testimonials, FAQ, CTA |
| E-commerce Promo | Hero, Stats, Features (Products), CTA |
| Coming Soon | Hero (Countdown), Features, Form |
| Thank You | Hero (Thank You), Features (Next Steps), CTA |
| App Download | Hero, Features, Stats, CTA |
| Service Business | Header, Hero, Benefits, Stats, CTA, Form |
| Portfolio | Header, Hero, Gallery, Stats, CTA |

---

## Attribution Reporting

### Descripción

Sistema de atribución multi-touch para medir el ROI de cada canal, campaña y touchpoint en el journey del cliente.

**Ruta**: `/marketing/attribution`

### Preguntas que Responde

- ¿Qué campañas generan más revenue?
- ¿Cuál es el ROI de cada canal?
- ¿Cuántos touchpoints necesita un lead para convertir?
- ¿Qué contenido influye más en las decisiones de compra?
- ¿Cómo interactúan los canales entre sí?

### Modelos de Atribución

| Modelo | Lógica | Cuándo Usarlo |
|--------|--------|---------------|
| First Touch | 100% al primer touchpoint | Medir awareness y top of funnel |
| Last Touch | 100% al último touchpoint | Medir conversión directa |
| Linear | Distribución igual | Journeys largos, todos importan |
| Time Decay | Más peso a recientes | Ciclos cortos, enfoque en cierre |
| U-Shaped | 40% primero, 40% último, 20% resto | Balance awareness + conversión |
| W-Shaped | 30% primero, 30% MQL, 30% último | B2B con etapas de calificación |
| Custom | Pesos por canal | Conocimiento profundo del negocio |

### Tipos de Touchpoints

| Tipo | Descripción |
|------|-------------|
| `page_view` | Vista de página web |
| `form_submission` | Envío de formulario |
| `email_open` | Apertura de email |
| `email_click` | Clic en email |
| `ad_click` | Clic en anuncio |
| `ad_impression` | Impresión de anuncio |
| `landing_page_view` | Vista de landing page |
| `landing_page_conversion` | Conversión en landing |
| `meeting_booked` | Reunión agendada |

### Canales de Marketing

| Canal | Descripción |
|-------|-------------|
| `email` | Email marketing |
| `paid_social` | Social ads (Meta, LinkedIn, etc.) |
| `organic_social` | Posts orgánicos en redes |
| `paid_search` | Google/Bing Ads |
| `organic_search` | SEO |
| `direct` | Tráfico directo |
| `referral` | Referencias externas |
| `display` | Display advertising |

### Tipos de Conversión

| Tipo | Descripción | Valor |
|------|-------------|-------|
| `deal_won` | Deal cerrado ganado | Monto del deal |
| `deal_created` | Deal creado | Valor proyectado |
| `form_submit` | Formulario enviado | 0 |
| `signup` | Registro de usuario | 0 |
| `mql` | Marketing Qualified Lead | 0 |
| `sql` | Sales Qualified Lead | 0 |
| `demo_request` | Solicitud de demo | 0 |

### Customer Journey

Visualización completa del journey de un contacto:

```
Timeline:
├── [email] Newsletter Open - 15 días antes
├── [paid_search] Google Ad Click - 10 días antes
├── [landing_page] Product Page View - 7 días antes
├── [form_submission] Demo Request - 5 días antes
├── [email] Follow-up Click - 3 días antes
└── [deal_won] Closed Won - $50,000
```

### Identificación de Visitantes

Flujo para conectar touchpoints anónimos con contactos:

1. **Cookie de visitante**: Generar `visitorId` al cargar landing/web
2. **Touchpoints anónimos**: Registrar eventos con `visitorId`
3. **Identificación**: Al enviar form, asociar `visitorId` → `contactId`
4. **Merge**: Actualizar touchpoints previos con `contactId`
5. **Email tracking**: Links incluyen `contactId` encriptado

### Endpoints de Atribución

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/marketing/attribution/overview` | Dashboard general |
| GET | `/api/marketing/attribution/by-channel` | Por canal |
| GET | `/api/marketing/attribution/by-campaign` | Por campaña |
| GET | `/api/marketing/attribution/compare-models` | Comparar modelos |
| GET | `/api/marketing/attribution/conversions` | Lista de conversiones |
| GET | `/api/marketing/attribution/journey/[contactId]` | Journey de contacto |
| POST | `/api/marketing/attribution/recalculate` | Recalcular atribución |

### Endpoints de Touchpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/marketing/touchpoints` | Listar touchpoints |
| POST | `/api/marketing/touchpoints` | Registrar touchpoint |
| POST | `/api/marketing/touchpoints/identify` | Identificar visitante |

---

## CAC Dashboard

### Descripción

El Dashboard de CAC (Customer Acquisition Cost) proporciona un análisis detallado del costo para adquirir nuevos clientes a través de las diferentes plataformas publicitarias.

**Ruta**: `/marketing/cac`

**Permisos requeridos**: `canManageCampaigns` o `canViewWebAnalytics`

### Métricas Principales

| Métrica | Descripción |
|---------|-------------|
| Gasto Total en Ads | Suma de gastos en todas las plataformas |
| Conversiones | Total de conversiones registradas |
| CAC Promedio | Gasto total / Conversiones |
| ROAS | Return on Ad Spend (por campaña) |

### CAC por Plataforma

Se calcula el CAC individual para cada plataforma conectada:
- Meta (Facebook/Instagram)
- Google Ads
- LinkedIn Ads
- TikTok Ads
- Twitter/X Ads

Incluye:
- Porcentaje del gasto total
- Porcentaje de conversiones
- Comparación con período anterior

### Top Campañas

Lista de las 10 campañas con mayor gasto, mostrando:
- Nombre y plataforma
- Gasto total
- CAC individual
- ROAS (Return on Ad Spend)

### Tendencia Temporal

Gráfico de barras mostrando la evolución del CAC día a día, con tooltips detallados que incluyen:
- Fecha
- CAC del día
- Gasto del día
- Conversiones del día

### Períodos de Análisis

- Últimos 7 días
- Últimos 30 días (por defecto)
- Últimos 90 días

### CAC con Atribución

El sistema también puede calcular CAC usando los modelos de atribución del CRM:
- First Touch
- Last Touch
- Linear

Esto permite ver qué canal realmente contribuyó a las conversiones.

### API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/marketing/cac` | Obtener métricas de CAC |

**Parámetros de query**:
- `period`: `7d`, `30d`, `90d` (default: `30d`)
- `startDate`: Fecha inicio personalizada
- `endDate`: Fecha fin personalizada
- `useAttribution`: `true` para usar atribución del CRM
- `attributionModel`: `first_touch`, `last_touch`, `linear`

---

## Píxeles de Retargeting

### Descripción

El sistema de Píxeles de Retargeting permite gestionar e inyectar códigos de seguimiento de las principales plataformas publicitarias en landing pages, formularios públicos y la aplicación.

**Ruta**: `/marketing/tracking-pixels`

**Permisos requeridos**: `canManageCampaigns`

### Plataformas Soportadas

| Plataforma | Tipo | Descripción |
|------------|------|-------------|
| Facebook/Meta Pixel | `META_PIXEL` | Tracking de Facebook e Instagram |
| Google Ads Tag | `GOOGLE_ADS` | Remarketing y conversiones de Google |
| LinkedIn Insight Tag | `LINKEDIN_INSIGHT` | Retargeting en LinkedIn |
| TikTok Pixel | `TIKTOK_PIXEL` | Tracking de TikTok |
| Twitter/X Pixel | `TWITTER_PIXEL` | Retargeting en Twitter |
| Script Personalizado | `CUSTOM` | Código de tracking personalizado |

### Configuración de Píxel

Cada píxel tiene la siguiente configuración:

**Información básica**:
- Nombre descriptivo
- Tipo de plataforma
- ID del píxel
- Etiqueta de conversión (para Google Ads)
- Script personalizado (para tipo CUSTOM)

**Contextos de inyección**:
- Landing Pages públicas
- Formularios públicos
- Aplicación interna

**Eventos a trackear**:
- Page View
- Form Submit
- Button Click
- Purchase
- Lead
- Eventos personalizados

### Funciones de Tracking

El componente `TrackingPixels` exporta funciones helper para tracking de eventos:

```typescript
import { trackEvent, trackLead, trackFormSubmit, trackPurchase } from '@/components/TrackingPixels';

// Evento genérico
trackEvent('CustomEvent', { page: 'landing', variant: 'A' });

// Lead (para formularios)
trackLead({ page: 'contact-form' });

// Envío de formulario
trackFormSubmit({ formId: 'newsletter' });

// Compra
trackPurchase(99.99, 'USD', { productId: 'ABC123' });
```

### Integración con Landing Pages

Los píxeles se inyectan automáticamente en las landing pages públicas según su configuración:

```tsx
// En PublicLandingPage.tsx
<TrackingPixels context="landingPages" />
```

Al enviar un formulario en la landing page, se disparan automáticamente:
- `trackFormSubmit()` - Evento de formulario
- `trackLead()` - Evento de lead

### API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/tracking-pixels` | Listar todos los píxeles |
| POST | `/api/admin/tracking-pixels` | Crear píxel |
| PUT | `/api/admin/tracking-pixels` | Actualizar píxel |
| DELETE | `/api/admin/tracking-pixels?id={id}` | Eliminar píxel |
| GET | `/api/public/tracking-pixels?context={context}` | Obtener píxeles activos para contexto |

### Modelo de Datos

```typescript
interface TrackingPixel {
  _id: string;
  name: string;
  type: 'META_PIXEL' | 'GOOGLE_ADS' | 'LINKEDIN_INSIGHT' | 'TIKTOK_PIXEL' | 'TWITTER_PIXEL' | 'CUSTOM';
  pixelId: string;
  conversionLabel?: string;  // Solo para Google Ads
  customScript?: string;     // Solo para CUSTOM
  injectIn: {
    app: boolean;
    landingPages: boolean;
    publicForms: boolean;
  };
  trackEvents: {
    pageView: boolean;
    formSubmit: boolean;
    buttonClick: boolean;
    purchase: boolean;
    lead: boolean;
    customEvents: string[];
  };
  isActive: boolean;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Asistente IA de Copywriting

### Descripción

El Asistente IA de Copywriting utiliza la API de Groq (modelo llama-3.3-70b-versatile) para generar y optimizar contenido de marketing. Incluye tres funcionalidades principales:

1. **Generador de Subject Lines A/B** - Variantes para pruebas A/B
2. **Optimizador de CTAs** - Análisis y mejora de call-to-actions
3. **Análisis de Sentimiento** - Análisis de respuestas de clientes

### Variables de Entorno

```env
GROQ_API_KEY=gsk_xxxxxxxx
```

### 1. Generador de Subject Lines A/B

**Ubicación**: `/marketing/email-templates/[id]/edit` → Configuración → Campo "Asunto del Email"

Genera 6 variantes de líneas de asunto usando diferentes estrategias psicológicas:

| Estrategia | Descripción | Ejemplo |
|------------|-------------|---------|
| Curiosidad | Genera intriga sin revelar todo | "Lo que nadie te cuenta sobre..." |
| Beneficio | Enfoca en lo que el lector ganará | "Aumenta tus ventas un 50%" |
| Urgencia | Sensación de tiempo limitado | "Última oportunidad: solo hoy" |
| Personal | Enfoque directo y personalizado | "María, esto es para ti" |
| Pregunta | Preguntas que resuenen | "¿Listo para transformar tu negocio?" |
| Número | Incluye estadísticas específicas | "5 secretos que usan los expertos" |

**Uso**:
1. Abrir editor de template de email
2. Click en botón "Configuración"
3. Click en botón "Test A/B" junto al campo de asunto
4. Seleccionar la variante deseada haciendo click

**API Endpoint**: `POST /api/ai/generate-marketing-content`

```typescript
// Request
{
  contentType: 'email-subject-ab',
  context: 'Descripción del email y producto',
  tone: 'professional' | 'casual' | 'urgent' | 'friendly' | 'luxury' | 'playful'
}

// Response
{
  contentType: 'email-subject-ab',
  content: {
    variants: [
      {
        text: 'Línea de asunto generada',
        strategy: 'curiosity' | 'benefit' | 'urgency' | 'personal' | 'question' | 'number',
        explanation: 'Por qué funciona esta variante'
      }
    ],
    recommendation: 'Recomendación para test A/B'
  }
}
```

### 2. Optimizador de CTAs

**Ubicaciones**:
- Editor de bloques de email → Panel "Generar con IA"
- Edición de bloque de botón → Botón "IA"

#### Generar Variantes de CTA

Genera múltiples opciones de CTA con diferentes enfoques:

| Enfoque | Descripción | Ejemplo |
|---------|-------------|---------|
| Acción | Verbos de acción directos | "Comienza ahora" |
| Beneficio | Lo que obtiene el usuario | "Obtén tu descuento" |
| Urgencia | Oportunidad limitada | "Aprovecha hoy" |
| Bajo riesgo | Reduce fricción | "Prueba gratis" |
| Exclusivo | Acceso especial | "Accede antes que nadie" |

**API Endpoint**: `POST /api/ai/generate-marketing-content`

```typescript
// Request
{
  contentType: 'cta-variants',
  context: 'Descripción del producto y objetivo',
  tone: 'professional'
}

// Response
{
  content: {
    variants: [
      {
        text: 'Texto del CTA',
        approach: 'action' | 'benefit' | 'urgency' | 'low_risk' | 'exclusive',
        bestFor: 'Cuándo usar esta variante'
      }
    ]
  }
}
```

#### Analizar y Optimizar CTA Existente

Analiza un CTA existente y sugiere mejoras:

```typescript
// Request
{
  contentType: 'cta-optimize',
  context: 'CTA actual: "Comprar"'
}

// Response
{
  content: {
    analysis: {
      strengths: ['Puntos fuertes'],
      weaknesses: ['Áreas de mejora']
    },
    score: 7, // 1-10
    suggestions: [
      { text: 'CTA mejorado', improvement: 'Qué mejora' }
    ],
    bestPractices: ['Consejos aplicables']
  }
}
```

### 3. Análisis de Sentimiento

**Ruta**: `/marketing/sentiment`

**Navegación**: Marketing → Análisis Sentimiento (menú lateral)

Analiza respuestas de clientes, emails, comentarios o cualquier texto para entender:

- **Sentimiento**: Positivo, Negativo, Neutral o Mixto (score -1 a +1)
- **Emociones**: Emociones detectadas con intensidad (baja/media/alta)
- **Intención**: Consulta, Queja, Elogio, Solicitud, Feedback
- **Urgencia**: Baja, Media, Alta
- **Frases Clave**: Extractos importantes del texto
- **Acción Sugerida**: Recomendación para el equipo

#### Modo Individual

Análisis completo de un texto con todos los detalles.

**API Endpoint**: `POST /api/ai/analyze-sentiment`

```typescript
// Request
{
  text: 'Texto a analizar',
  analysisType: 'full' | 'quick'
}

// Response (full)
{
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed',
  score: 0.75, // -1 a 1
  confidence: 0.92, // 0 a 1
  emotions: [
    { emotion: 'satisfacción', intensity: 'high' }
  ],
  intent: {
    type: 'praise',
    description: 'El cliente expresa satisfacción con el servicio'
  },
  urgency: 'low',
  keyPhrases: ['excelente servicio', 'muy recomendado'],
  suggestedAction: 'Agradecer y solicitar reseña pública',
  summary: 'Cliente satisfecho con la experiencia de compra'
}
```

#### Modo por Lotes

Analiza hasta 20 textos simultáneamente con estadísticas agregadas.

**API Endpoint**: `PUT /api/ai/analyze-sentiment`

```typescript
// Request
{
  texts: ['Texto 1', 'Texto 2', '...'] // Máximo 20
}

// Response
{
  results: [
    {
      index: 0,
      sentiment: 'positive',
      score: 0.8,
      summary: 'Resumen breve',
      urgency: 'low'
    }
  ],
  stats: {
    total: 10,
    positive: 6,
    negative: 2,
    neutral: 1,
    mixed: 1,
    avgScore: 0.45,
    urgentCount: 1
  }
}
```

### Tipos de Contenido Disponibles

El generador de contenido IA soporta los siguientes tipos:

| Tipo | Descripción | Formato Respuesta |
|------|-------------|-------------------|
| `email-subject` | Líneas de asunto simples | Texto (3 opciones) |
| `email-subject-ab` | Variantes A/B de asunto | JSON con estrategias |
| `email-headline` | Titulares de email | Texto (3 opciones) |
| `email-body` | Cuerpo del email | HTML |
| `email-cta` | Texto de botón simple | Texto (5 opciones) |
| `email-preheader` | Preheader de email | Texto (3 opciones) |
| `cta-variants` | Variantes de CTA | JSON con enfoques |
| `cta-optimize` | Optimización de CTA | JSON con análisis |
| `landing-headline` | Titular de landing | Texto (3 opciones) |
| `landing-subheadline` | Subtítulo de landing | Texto (3 opciones) |
| `landing-hero` | Sección hero completa | JSON |
| `landing-benefits` | Lista de beneficios | JSON array |
| `landing-features` | Características | JSON array |
| `landing-testimonial` | Testimonio | JSON |
| `landing-faq` | Preguntas frecuentes | JSON array |
| `landing-cta` | CTA de cierre | JSON |
| `landing-stats` | Estadísticas | JSON array |
| `product-description` | Descripción de producto | Texto |
| `value-proposition` | Propuesta de valor | Texto (3 opciones) |
| `social-proof` | Prueba social | Texto |

### Componentes UI

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `AIContentGenerator` | `components/marketing/AIContentGenerator.tsx` | Generador de contenido IA reutilizable |
| `SentimentAnalyzer` | `components/marketing/SentimentAnalyzer.tsx` | Analizador de sentimiento standalone |

### Archivos Principales

```
app/
├── api/ai/
│   ├── analyze-sentiment/route.ts    # API de análisis de sentimiento
│   └── generate-marketing-content/route.ts  # API de generación de contenido
├── marketing/
│   └── sentiment/page.tsx            # Página de análisis de sentimiento
components/
└── marketing/
    ├── AIContentGenerator.tsx        # Componente generador IA
    ├── SentimentAnalyzer.tsx         # Componente analizador
    └── EmailBlockEditor.tsx          # Editor con IA integrada
```

---

## Constructor de Audiencias

### Descripción

El Constructor de Audiencias permite crear segmentaciones complejas con lógica visual AND/OR, similar a los constructores de las plataformas publicitarias.

**Ruta**: `/marketing/audiences`

### Estructura de Reglas

```
Audiencia
├── Operador principal (AND/OR entre grupos)
└── Grupos de condiciones
    ├── Grupo 1
    │   ├── Operador del grupo (AND/OR)
    │   ├── Condición 1
    │   ├── Condición 2
    │   └── ...
    ├── Grupo 2
    │   └── ...
    └── ...
```

### Tipos de Condiciones

#### Demografía
| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| Ubicación | País, estado, ciudad | México, CDMX, Monterrey |
| Edad | Rango de edad | 25-45 años |
| Género | Hombre, Mujer, Todos | Todos |

#### Intereses
| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| Intereses | Temas de interés | Tecnología, Marketing, Fitness |
| Comportamientos | Acciones del usuario | Compradores frecuentes, Viajeros |

#### B2B (LinkedIn)
| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| Industria | Sector empresarial | Tecnología, Finanzas, Salud |
| Cargo/Puesto | Título del trabajo | CEO, Director de Marketing, CTO |
| Tamaño de Empresa | Número de empleados | 51-200 empleados |
| Habilidades | Skills profesionales | JavaScript, Ventas B2B, Liderazgo |

#### CRM
| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| Clientes CRM | Segmentos de clientes | Clientes activos, inactivos |
| Contactos CRM | Tipos de contactos | Leads, Calificados |
| Etapa del Deal | Estado en pipeline | Prospección, Negociación, Ganado |

### Operadores de Comparación

| Operador | Descripción |
|----------|-------------|
| `incluye` | El valor está en la lista |
| `excluye` | El valor NO está en la lista |
| `contiene` | El texto contiene la cadena |
| `entre` | El número está en el rango |

### Ejemplo de Uso

**Audiencia: Profesionales de tecnología en México, 25-45 años**

```
Operador principal: AND
├── Grupo 1 (Demografía) - AND
│   ├── Ubicación incluye: México
│   └── Edad entre: 25-45
└── Grupo 2 (Profesional) - OR
    ├── Industria incluye: Tecnología
    ├── Cargo contiene: Developer
    └── Cargo contiene: Engineer
```

### Guardar Audiencias

Las audiencias pueden guardarse para reutilizar en múltiples campañas:

1. Crear reglas en el Constructor
2. Asignar nombre y descripción
3. Seleccionar plataformas compatibles
4. Guardar

Las audiencias guardadas aparecen al crear nuevas campañas en el Paso 4.

---

## Constructor de Creativos

### Descripción

El Constructor de Creativos permite diseñar anuncios visuales con soporte para múltiples formatos y plataformas.

**Ruta**: `/marketing/creatives`

### Tipos de Creativos

| Tipo | Descripción | Uso |
|------|-------------|-----|
| Imagen | Imagen estática | Feed, Display |
| Video | Video corto/largo | Feed, Stories, Reels |
| Carrusel | Múltiples imágenes/videos | Feed, Stories |
| Story | Formato vertical | Instagram/Facebook Stories |
| Reel | Video corto vertical | Instagram Reels, TikTok |

### Relaciones de Aspecto

| Ratio | Nombre | Dimensiones | Uso Recomendado |
|-------|--------|-------------|-----------------|
| 1:1 | Cuadrado | 1080x1080 | Feed, Carrusel |
| 4:5 | Vertical | 1080x1350 | Feed Instagram |
| 9:16 | Story/Reel | 1080x1920 | Stories, Reels, TikTok |
| 16:9 | Horizontal | 1920x1080 | YouTube, LinkedIn |
| 1.91:1 | Link Ad | 1200x628 | Link Ads, Twitter |

### Funcionalidades

#### Subida de Archivos
- **Imágenes**: JPEG, PNG, GIF, WebP (máx. 10MB)
- **Videos**: MP4, QuickTime, WebM (máx. 100MB)
- **Almacenamiento**: Cloudflare R2

#### Overlays de Texto
Añadir texto sobre imágenes/videos:
- Posición (arrastrable)
- Tamaño de fuente
- Familia tipográfica
- Color de texto
- Color de fondo
- Alineación

#### Carrusel
- Hasta 10 slides
- Imagen/video por slide
- Headline y descripción individuales
- URL de destino por slide
- Reordenar con drag & drop

#### Preview
- Vista previa en tiempo real
- Toggle móvil/desktop
- Simulación por plataforma

### Estados de Creativos

| Estado | Descripción |
|--------|-------------|
| `DRAFT` | Sin asset principal |
| `READY` | Listo para usar |
| `IN_USE` | Usado en campaña activa |
| `ARCHIVED` | Archivado |

### Campos del Creativo

| Campo | Descripción | Máx. caracteres |
|-------|-------------|-----------------|
| Nombre | Nombre interno | - |
| Descripción | Descripción interna | - |
| Headline | Título del anuncio | 100 |
| Texto del Anuncio | Copy principal | 500 |
| Call to Action | Botón de acción | 50 |
| URL de destino | Link del anuncio | - |

### Call to Actions Disponibles

- Más información
- Comprar ahora
- Registrarse
- Descargar
- Contactar
- Reservar
- Ver más
- Aplicar ahora
- Obtener oferta
- Suscribirse

---

## Web Analytics

### Descripción

Integración con Google Analytics 4 para tracking de eventos web y conversiones.

**Ruta**: `/marketing/web-tracking`

### Eventos Trackeados

| Evento | Descripción |
|--------|-------------|
| `page_view` | Vista de página |
| `click` | Clic en elemento |
| `scroll` | Profundidad de scroll |
| `form_submit` | Envío de formulario |
| `purchase` | Compra completada |
| `add_to_cart` | Añadir al carrito |
| `sign_up` | Registro de usuario |
| `custom` | Evento personalizado |

### Datos Capturados

- **Página**: URL, título, referrer
- **Dispositivo**: Tipo, navegador, SO, resolución
- **Ubicación**: País, región, ciudad
- **UTM**: source, medium, campaign, term, content
- **Sesión**: ID de sesión, usuario (si autenticado)

---

## WhatsApp Business

### Descripción

Gestión de plantillas de mensajes y envío de mensajes vía WhatsApp Business API.

**Rutas**:
- `/marketing/whatsapp` - Dashboard
- `/marketing/whatsapp/templates` - Gestión de plantillas

### Configuración

Variables de entorno requeridas:

```env
WHATSAPP_BUSINESS_ID=tu_business_id
WHATSAPP_ACCESS_TOKEN=tu_access_token
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
```

### Categorías de Templates

| Categoría | Descripción |
|-----------|-------------|
| MARKETING | Promociones y ofertas |
| UTILITY | Notificaciones transaccionales |
| AUTHENTICATION | Códigos OTP |

### Estados de Templates

| Estado | Descripción |
|--------|-------------|
| PENDING | Enviado para aprobación |
| APPROVED | Aprobado por Meta |
| REJECTED | Rechazado |
| PAUSED | Pausado |
| DISABLED | Deshabilitado |

### Componentes de Template

| Componente | Descripción |
|------------|-------------|
| HEADER | Encabezado (texto, imagen, video, documento) |
| BODY | Cuerpo del mensaje |
| FOOTER | Pie de mensaje |
| BUTTONS | Botones de acción |

### Variables en Templates

Usar `{{1}}`, `{{2}}`, etc. para variables dinámicas:

```
Hola {{1}}, tu pedido #{{2}} ha sido enviado.
Llegará el {{3}}.
```

### Envío de Mensajes

El sistema permite enviar mensajes vía WhatsApp Business API.

#### Tipos de Mensajes Soportados

| Tipo | Descripción |
|------|-------------|
| `text` | Mensaje de texto simple |
| `template` | Mensaje usando template aprobado |
| `media` | Imagen, documento, video o audio |
| `interactive` | Mensaje con botones de respuesta |

#### Envío Individual

```bash
POST /api/marketing/whatsapp/send
{
  "type": "text",
  "to": "521234567890",
  "message": "Hola, gracias por tu interés"
}
```

#### Envío con Template

```bash
POST /api/marketing/whatsapp/send
{
  "type": "template",
  "to": "521234567890",
  "templateId": "...",
  "parameters": ["Juan", "12345"]  // Variables del template
}
```

#### Envío de Media

```bash
POST /api/marketing/whatsapp/send
{
  "type": "media",
  "to": "521234567890",
  "mediaType": "image",  // "image", "document", "video", "audio"
  "mediaUrl": "https://ejemplo.com/imagen.jpg",
  "message": "Mira nuestra nueva oferta"  // Caption opcional
}
```

#### Envío Interactivo (Botones)

```bash
POST /api/marketing/whatsapp/send
{
  "type": "interactive",
  "to": "521234567890",
  "message": "¿Te gustaría más información?",
  "buttons": [
    { "id": "yes", "title": "Sí, por favor" },
    { "id": "no", "title": "No, gracias" },
    { "id": "later", "title": "Después" }
  ]
}
```

#### Envío Masivo (Bulk)

Solo disponible con templates aprobados:

```bash
POST /api/marketing/whatsapp/send
{
  "type": "template",
  "templateId": "...",
  "contactIds": ["id1", "id2", "id3"],
  "parameters": ["{{firstName}}", "valor_fijo"]
}
```

**Personalización en bulk**: Los parámetros pueden incluir placeholders:
- `{{firstName}}` - Nombre del contacto
- `{{lastName}}` - Apellido del contacto
- `{{fullName}}` - Nombre completo
- `{{phone}}` - Teléfono
- `{{email}}` - Email

#### Formato de Teléfonos

Los números se formatean automáticamente a E.164:
- `5512345678` → `525512345678` (México)
- `+52 55 1234 5678` → `525512345678`

#### Librería de Funciones

```typescript
import {
  sendTextMessage,
  sendTemplateMessage,
  sendMediaMessage,
  sendInteractiveMessage,
  sendBulkTemplateMessages,
  isWhatsAppConfigured,
  formatPhoneNumber
} from '@/lib/whatsapp';

// Verificar configuración
if (isWhatsAppConfigured()) {
  // Enviar mensaje de texto
  const result = await sendTextMessage({
    to: '525512345678',
    message: 'Hola!'
  });

  // Enviar template
  const result = await sendTemplateMessage({
    to: '525512345678',
    templateName: 'welcome_message',
    languageCode: 'es_MX',
    components: [
      {
        type: 'body',
        parameters: [{ type: 'text', text: 'Juan' }]
      }
    ]
  });

  // Enviar mensaje interactivo con botones
  const result = await sendInteractiveMessage(
    '525512345678',
    '¿Cómo podemos ayudarte?',
    [
      { id: 'sales', title: 'Ventas' },
      { id: 'support', title: 'Soporte' }
    ],
    'Asistente Virtual',  // Header opcional
    'Responde con un botón' // Footer opcional
  );
}
```

#### Rate Limiting

El envío masivo incluye rate limiting automático:
- 100ms de espera entre cada mensaje
- Evita bloqueos por límites de la API

---

## Sincronización

### Sincronización Manual

**Admin Panel**: `/admin/marketing-sync`

Botón "Sincronizar Todo" ejecuta sync de todas las plataformas conectadas.

### Sincronización Automática

Configurar cron job externo para llamar:

```bash
GET /api/cron/marketing-sync
```

### Sincronización de Métricas Reales

El sistema sincroniza métricas reales desde las plataformas publicitarias para las campañas activas.

#### Plataformas con Sincronización de Métricas

| Plataforma | Estado | Notas |
|------------|--------|-------|
| Meta (Facebook/Instagram) | ✅ Completo | Graph API v18.0 |
| Google Ads | ✅ Completo | Google Ads API v15, requiere Developer Token |
| LinkedIn | ✅ Completo | LinkedIn Marketing API |
| TikTok Ads | ✅ Completo | TikTok Business API v1.3 |
| Twitter/X Ads | ✅ Completo | Twitter Ads API v12 |

#### Métricas Sincronizadas

| Métrica | Meta | Google Ads | LinkedIn | TikTok | Twitter |
|---------|------|------------|----------|--------|---------|
| Impressions | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reach | ✅ | ✅* | ✅* | ✅* | ✅* |
| Clicks | ✅ | ✅ | ✅ | ✅ | ✅ |
| CTR | ✅ | ✅ | Calc | ✅ | Calc |
| CPC | ✅ | ✅ | Calc | ✅ | Calc |
| CPM | ✅ | ✅ | Calc | ✅ | Calc |
| Spend | ✅ | ✅ | ✅ | ✅ | ✅ |
| Conversions | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cost per Conversion | ✅ | ✅ | Calc | Calc | Calc |
| ROAS | - | ✅ | - | - | - |
| Frequency | ✅ | - | - | - | - |
| Video Views | ✅ | ✅ | - | ✅ | ✅ |
| Likes/Shares | - | - | - | - | ✅ |

*Reach se aproxima con Impressions cuando no está disponible
Calc = Calculado a partir de otras métricas

#### API de Sincronización de Métricas

```typescript
import { syncAllMetrics, syncCampaignMetrics } from '@/lib/marketing/metricsSync';

// Sincronizar todas las plataformas conectadas
const result = await syncAllMetrics();
// { success: true, results: { META: {...}, LINKEDIN: {...} } }

// Sincronizar campaña específica
const result = await syncCampaignMetrics(campaignId);
// { success: true, campaignsUpdated: 1, metricsRecorded: 1, errors: [] }
```

#### Cron Job para Métricas

Para sincronización diaria automática:

```bash
# Diariamente a las 6am
0 6 * * * curl https://tu-dominio.com/api/cron/marketing-sync
```

#### Flujo de Sincronización

1. Obtiene plataformas conectadas (`MarketingPlatformConfig.isConnected = true`)
2. Para cada plataforma, busca campañas activas con `externalAdId`
3. Llama a la API de la plataforma para obtener insights del día anterior
4. Guarda métricas en `MarketingMetric` (upsert por fecha)
5. Actualiza métricas totales en `MarketingCampaign`
6. Registra log en `MarketingSyncLog`

### Estados de Sync

Los logs se almacenan en `MarketingSyncLog`:

| Campo | Descripción |
|-------|-------------|
| platform | Plataforma sincronizada |
| syncType | CAMPAIGNS, METRICS, AUDIENCES, CREATIVES, FULL |
| status | STARTED, IN_PROGRESS, COMPLETED, FAILED |
| recordsProcessed | Registros procesados |
| recordsFailed | Registros fallidos |
| errors | Lista de errores |

---

## API Reference

### Campañas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/marketing/campaigns` | Listar campañas |
| POST | `/api/marketing/campaigns` | Crear campaña |
| GET | `/api/marketing/campaigns/[id]` | Obtener campaña |
| PUT | `/api/marketing/campaigns/[id]` | Actualizar campaña |
| DELETE | `/api/marketing/campaigns/[id]` | Eliminar campaña |
| POST | `/api/marketing/campaigns/[id]/publish` | Publicar campaña |
| POST | `/api/marketing/campaigns/[id]/pause` | Pausar campaña |

### Audiencias

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/marketing/audiences` | Listar audiencias |
| POST | `/api/marketing/audiences` | Crear audiencia |
| GET | `/api/marketing/audiences/[id]` | Obtener audiencia |
| PUT | `/api/marketing/audiences/[id]` | Actualizar audiencia |
| DELETE | `/api/marketing/audiences/[id]` | Eliminar audiencia |

### Creativos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/marketing/creatives` | Listar creativos |
| POST | `/api/marketing/creatives` | Crear creativo |
| GET | `/api/marketing/creatives/[id]` | Obtener creativo |
| PUT | `/api/marketing/creatives/[id]` | Actualizar creativo |
| DELETE | `/api/marketing/creatives/[id]` | Eliminar creativo |
| POST | `/api/marketing/creatives/upload` | Subir asset |

### OAuth

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/marketing/oauth/[platform]` | Iniciar OAuth |
| GET | `/api/marketing/oauth/[platform]/callback` | Callback OAuth |
| DELETE | `/api/marketing/oauth/[platform]` | Desconectar |

### Sincronización

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/marketing/sync/all` | Sincronizar todas las plataformas |
| GET | `/api/marketing/sync/all` | Estado de sincronización |
| POST | `/api/marketing/sync/[platform]` | Sincronizar plataforma específica |
| GET | `/api/marketing/sync/alerts` | Alertas de sincronización |

### Métricas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/marketing/metrics` | Métricas agregadas |
| GET | `/api/marketing/metrics/[campaignId]` | Métricas de campaña |

### WhatsApp

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/marketing/whatsapp/templates` | Listar templates |
| POST | `/api/marketing/whatsapp/templates` | Crear template |
| DELETE | `/api/marketing/whatsapp/templates/[id]` | Eliminar template |
| POST | `/api/marketing/whatsapp/send` | Enviar mensaje (individual o bulk) |

### Email Templates

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/marketing/email-templates` | Listar templates |
| POST | `/api/marketing/email-templates` | Crear template personalizado |
| GET | `/api/marketing/email-templates/[id]` | Obtener template |
| PUT | `/api/marketing/email-templates/[id]` | Actualizar template |
| DELETE | `/api/marketing/email-templates/[id]` | Eliminar template |

### Email Tracking

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/email/track/open` | Pixel de apertura |
| GET | `/api/email/track/click` | Redirect de clicks |

### Centro de Preferencias

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/public/unsubscribe` | Obtener preferencias |
| POST | `/api/public/unsubscribe` | Actualizar preferencias |

### Landing Pages y Plantillas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/marketing/landing-pages` | Listar landing pages |
| POST | `/api/marketing/landing-pages` | Crear landing page |
| GET | `/api/marketing/landing-pages/[id]` | Obtener landing page |
| PUT | `/api/marketing/landing-pages/[id]` | Actualizar landing page |
| DELETE | `/api/marketing/landing-pages/[id]` | Eliminar landing page |
| GET | `/api/marketing/landing-templates` | Listar plantillas (sistema + custom) |
| POST | `/api/marketing/landing-templates` | Obtener o crear plantilla |

### Automatizaciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/marketing/automations` | Listar automatizaciones |
| POST | `/api/marketing/automations` | Crear automatización |
| GET | `/api/marketing/automations/[id]` | Obtener automatización |
| PUT | `/api/marketing/automations/[id]` | Actualizar automatización |
| DELETE | `/api/marketing/automations/[id]` | Eliminar automatización |
| POST | `/api/marketing/automations/[id]/activate` | Activar automatización |
| POST | `/api/marketing/automations/[id]/pause` | Pausar automatización |
| POST | `/api/marketing/automations/trigger` | Disparar trigger |

### Touchpoints y Attribution

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/marketing/touchpoints` | Listar touchpoints |
| POST | `/api/marketing/touchpoints` | Registrar touchpoint |
| POST | `/api/marketing/touchpoints/identify` | Identificar visitante (asociar visitorId → contactId) |
| GET | `/api/marketing/attribution/overview` | Dashboard de atribución |
| GET | `/api/marketing/attribution/by-channel` | Atribución por canal |
| GET | `/api/marketing/attribution/by-campaign` | Atribución por campaña |
| GET | `/api/marketing/attribution/compare-models` | Comparar modelos de atribución |
| GET | `/api/marketing/attribution/conversions` | Lista de conversiones |
| GET | `/api/marketing/attribution/journey/[contactId]` | Customer journey de un contacto |
| POST | `/api/marketing/attribution/recalculate` | Recalcular atribución |

### Cron Jobs

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/cron/marketing-sync` | Sincronizar métricas |
| GET | `/api/cron/send-scheduled-emails` | Enviar emails programados |

### Generación de Contenido IA

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/ai/generate-marketing-content` | Generar contenido con IA |

#### Parámetros de la API

```typescript
{
  contentType: string;   // Tipo de contenido (ver tabla abajo)
  context?: string;      // Contexto adicional
  tone?: 'professional' | 'casual' | 'urgent' | 'friendly' | 'luxury' | 'technical' | 'playful';
  language?: string;     // Idioma (default: español)
  product?: string;      // Nombre del producto/servicio
  audience?: string;     // Público objetivo
  keywords?: string[];   // Palabras clave
  length?: 'short' | 'medium' | 'long';
}
```

#### Tipos de Contenido Soportados

| Tipo | Descripción | Formato Respuesta |
|------|-------------|-------------------|
| `email-subject` | Líneas de asunto | Texto (3 opciones) |
| `email-headline` | Titulares de email | Texto (3 opciones) |
| `email-body` | Cuerpo del email | HTML |
| `email-cta` | Textos de CTA | Texto (5 opciones) |
| `email-preheader` | Preheaders | Texto (3 opciones) |
| `landing-headline` | Titulares de landing | Texto (3 opciones) |
| `landing-subheadline` | Subtítulos | Texto (3 opciones) |
| `landing-hero` | Sección hero completa | JSON |
| `landing-benefits` | Lista de beneficios | JSON array |
| `landing-features` | Lista de features | JSON array |
| `landing-testimonial` | Testimonio | JSON |
| `landing-faq` | Preguntas frecuentes | JSON array |
| `landing-cta` | Sección de CTA | JSON |
| `landing-stats` | Estadísticas | JSON array |
| `product-description` | Descripción de producto | Texto |
| `value-proposition` | Propuesta de valor | Texto (3 opciones) |
| `social-proof` | Prueba social | Texto (puntos) |

---

## Modelos de Datos

### MarketingCampaign

```typescript
{
  name: string;
  description?: string;
  platform: 'META' | 'LINKEDIN' | 'TWITTER' | 'TIKTOK' | 'YOUTUBE';
  objective: string;
  status: CampaignStatus;
  budgetType: 'DAILY' | 'LIFETIME';
  budget: number;
  currency: string;
  startDate?: Date;
  endDate?: Date;
  targeting: { ... };        // Targeting plano
  audienceRules?: IAudienceRules;  // Reglas del constructor
  creativeData?: ICreativeData;    // Datos del creativo
  metrics?: ICampaignMetrics;
  externalId?: string;       // ID en la plataforma externa
  tags?: string[];
  createdBy: ObjectId;
}
```

### MarketingAudience

```typescript
{
  name: string;
  description?: string;
  platforms: string[];
  rules: {
    operator: 'AND' | 'OR';
    groups: [{
      id: string;
      operator: 'AND' | 'OR';
      conditions: [{
        id: string;
        type: ConditionType;
        comparator: ConditionComparator;
        value: string | number | string[] | { min, max };
      }]
    }]
  };
  targeting: Record<string, any>;  // Targeting "aplanado"
  estimatedReach?: { min: number; max: number };
  usageCount: number;
  isActive: boolean;
  createdBy: ObjectId;
}
```

### MarketingCreative

```typescript
{
  name: string;
  description?: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'STORY' | 'REEL' | 'TEXT';
  status: 'DRAFT' | 'READY' | 'IN_USE' | 'ARCHIVED';
  platforms: string[];
  aspectRatio: '1:1' | '4:5' | '9:16' | '16:9' | '1.91:1';
  primaryAsset?: {
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    duration?: number;
    r2Key?: string;
  };
  carouselSlides?: [{
    id: string;
    asset: ICreativeAsset;
    headline?: string;
    description?: string;
    linkUrl?: string;
    order: number;
  }];
  headline?: string;
  bodyText?: string;
  callToAction?: string;
  linkUrl?: string;
  textOverlays?: [{
    id: string;
    text: string;
    position: { x, y };
    style: { fontSize, fontFamily, color, ... };
  }];
  backgroundColor?: string;
  isTemplate: boolean;
  templateCategory?: string;
  usedInCampaigns?: ObjectId[];
  usageCount: number;
  tags?: string[];
  createdBy: ObjectId;
}
```

### MarketingPlatformConfig

```typescript
{
  platform: string;
  isConnected: boolean;
  credentials: {
    accessToken?: string;    // Encriptado
    refreshToken?: string;   // Encriptado
    expiresAt?: Date;
    accountId?: string;
    pageId?: string;
    adAccountId?: string;
  };
  settings: Record<string, any>;
  lastSyncAt?: Date;
  lastError?: string;
  lastErrorAt?: Date;
  connectedBy: ObjectId;
}
```

### MarketingMetric

```typescript
{
  campaignId: ObjectId;
  platform: string;
  date: Date;
  metrics: {
    impressions: number;
    reach: number;
    clicks: number;
    ctr: number;
    cpc: number;
    cpm: number;
    spend: number;
    conversions: number;
    costPerConversion: number;
    roas: number;
    frequency: number;
    // Engagement
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    // Video
    videoViews: number;
    videoViewsP25: number;
    videoViewsP50: number;
    videoViewsP75: number;
    videoViewsP100: number;
  };
}
```

### Touchpoint

Registro de cada interacción del customer journey:

```typescript
{
  contactId?: ObjectId;           // Null si no identificado
  visitorId: string;              // Cookie de visitante
  sessionId?: string;
  type: TouchpointType;           // Tipo de interacción
  channel: MarketingChannel;      // Canal de marketing
  source?: string;                // utm_source
  medium?: string;                // utm_medium
  campaign?: string;              // utm_campaign
  content?: string;               // utm_content
  term?: string;                  // utm_term
  referenceType?: string;         // emailCampaign, landingPage, webForm, ad, content
  referenceId?: ObjectId;
  url?: string;
  referrer?: string;
  metadata: Record<string, any>;
  device?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  occurredAt: Date;
  isIdentified: boolean;
}
```

**Tipos de Touchpoint:**
- `page_view`, `form_submission`, `email_open`, `email_click`
- `ad_click`, `ad_impression`, `social_engagement`, `content_download`
- `webinar_registration`, `webinar_attendance`, `meeting_booked`
- `chat_started`, `call_completed`, `landing_page_view`, `landing_page_conversion`

**Canales de Marketing:**
- `email`, `paid_social`, `organic_social`, `paid_search`, `organic_search`
- `direct`, `referral`, `affiliate`, `display`, `video`, `other`

**Métodos Estáticos:**
- `identifyVisitor(visitorId, contactId)` - Asociar touchpoints anónimos a contacto
- `getContactJourney(contactId, options)` - Obtener journey completo de un contacto
- `detectChannel(utmSource, utmMedium, referrer)` - Detectar canal automáticamente
- `getChannelBreakdown(startDate, endDate)` - Desglose por canal
- `getCampaignPerformance(startDate, endDate)` - Rendimiento por campaña

### Conversion

Registro de conversiones con atribución multi-touch:

```typescript
{
  contactId: ObjectId;
  type: ConversionType;
  value: number;
  currency: string;                // Default: MXN
  dealId?: ObjectId;
  formSubmissionId?: ObjectId;
  touchpoints: ObjectId[];         // Todos los touchpoints del journey
  firstTouchpoint?: ObjectId;
  lastTouchpoint?: ObjectId;
  mqlTouchpoint?: ObjectId;        // Touchpoint de calificación MQL
  attribution: IAttributionResult[];  // Resultados por modelo
  convertedAt: Date;
  journeyDuration: number;         // Días desde primer touchpoint
  touchpointCount: number;
  metadata: Record<string, any>;
  isProcessed: boolean;
}
```

**Tipos de Conversión:**
- `deal_won`, `deal_created`, `form_submit`, `signup`, `purchase`
- `mql`, `sql`, `demo_request`, `trial_start`, `subscription`

**Modelos de Atribución:**
- `first_touch` - 100% al primer touchpoint
- `last_touch` - 100% al último touchpoint
- `linear` - Distribución igual entre todos
- `time_decay` - Más peso a touchpoints recientes
- `u_shaped` - 40% primero, 40% último, 20% resto
- `w_shaped` - 30% primero, 30% MQL, 30% último, 10% resto
- `custom` - Pesos personalizados por canal
- `data_driven` - Basado en datos históricos

**Métodos Estáticos:**
- `getOverview(startDate, endDate)` - Estadísticas generales
- `getAttributionByChannel(startDate, endDate, model)` - Atribución por canal
- `getAttributionByCampaign(startDate, endDate, model)` - Atribución por campaña
- `compareModels(startDate, endDate, models)` - Comparar modelos de atribución
- `getConversionPaths(startDate, endDate)` - Paths de conversión más comunes

### Attribution Engine

**Archivo**: `lib/marketing/attributionEngine.ts`

El Attribution Engine calcula la atribución de conversiones usando múltiples modelos. Es el corazón del sistema de atribución.

#### Funciones Principales

```typescript
import {
  calculateAttribution,
  processConversion,
  processUnprocessedConversions,
  recalculateAttribution,
  createDealConversion,
  createFormConversion,
  getChannelROI,
} from '@/lib/marketing/attributionEngine';
```

| Función | Descripción |
|---------|-------------|
| `calculateAttribution(touchpoints, value, date, config)` | Calcula atribución para todos los modelos configurados |
| `processConversion(conversionId)` | Procesa una conversión: obtiene touchpoints y calcula atribución |
| `processUnprocessedConversions(config, limit)` | Procesa conversiones pendientes en batch |
| `recalculateAttribution(startDate, endDate)` | Recalcula atribución para un rango de fechas |
| `createDealConversion(dealId, contactId, value)` | Crea conversión desde deal ganado |
| `createFormConversion(contactId, formSubmissionId)` | Crea conversión desde formulario |
| `getChannelROI(startDate, endDate, channelCosts, model)` | Calcula ROI por canal |

#### Flujo de Atribución

```
1. Se registran Touchpoints (visitas, clicks, aperturas)
2. Se crea una Conversion (deal_won, form_submit, etc.)
3. Attribution Engine procesa la conversión:
   - Obtiene todos los Touchpoints del contacto previos a la conversión
   - Calcula crédito por cada modelo de atribución
   - Guarda resultados en Conversion.attribution[]
4. Los dashboards consultan Conversion para reportes
```

---

## Flujo de Creación de Touchpoints

Los touchpoints se crean automáticamente desde múltiples fuentes y se integran con el CRM para mostrar el Customer Journey completo de cada contacto.

### ¿Cuándo se crea un Touchpoint desde Email?

**Fuente 1: CRM Email Tracking** (Secuencias y Workflows)

Los emails enviados desde CRM (secuencias, workflows, envío manual) utilizan tracking integrado:

| Evento | Endpoint | Touchpoint Type | Cuándo se crea |
|--------|----------|-----------------|----------------|
| Apertura | `/api/track/open/[trackingId]` | `email_open` | Primera apertura únicamente |
| Click | `/api/track/click/[trackingId]` | `email_click` | Primer click únicamente |

**Fuente 2: Marketing Email Campaigns** (Resend Webhooks)

Las campañas de email marketing crean touchpoints vía webhook de Resend:

| Evento | Webhook | Touchpoint Type | Cuándo se crea |
|--------|---------|-----------------|----------------|
| Apertura | `POST /api/webhooks/resend` | `email_open` | Primera apertura |
| Click | `POST /api/webhooks/resend` | `email_click` | Primer click |

**Datos capturados automáticamente:**
- `contactId` - ID del contacto (buscado por email si no existe)
- `visitorId` - Hash MD5 del email para tracking anónimo
- `channel` - Siempre `email`
- `source` - `resend` (campañas) o `crm` (tracking manual)
- `campaign` - Nombre de la campaña de email
- `referenceType` - `emailCampaign`
- `referenceId` - ID de la campaña
- `url` - URL clickeada (solo en clicks)
- `metadata` - Subject, campaignName, link clickeado

**Ejemplo de Touchpoint de email_open:**
```json
{
  "contactId": "...",
  "visitorId": "email_a1b2c3d4...",
  "type": "email_open",
  "channel": "email",
  "source": "resend",
  "medium": "email",
  "campaign": "Newsletter Marzo 2024",
  "referenceType": "emailCampaign",
  "referenceId": "...",
  "metadata": {
    "recipientEmail": "contacto@email.com",
    "campaignName": "Newsletter Marzo 2024",
    "subject": "Las novedades del mes"
  },
  "isIdentified": true
}
```

### ¿Cuándo se crea un Touchpoint desde Formularios Web?

**Los Touchpoints se crean automáticamente** al enviar formularios WebToLead:

| Evento | Endpoint | Touchpoint Type | Cuándo se crea |
|--------|----------|-----------------|----------------|
| Envío | `POST /api/public/forms/[formKey]/submit` | `form_submission` | Al procesar el formulario |

**Datos capturados automáticamente:**
- `contactId` - ID del contacto creado o existente
- `visitorId` - Hash MD5 del email o UUID aleatorio
- `channel` - Detectado de UTMs/referrer
- `source`, `medium`, `campaign`, `term`, `content` - Parámetros UTM
- `referenceType` - `webForm`
- `referenceId` - ID del formulario
- `url` - URL donde se envió el formulario
- `referrer` - Página que refirió al formulario
- `metadata` - Nombre del formulario, email, dealId si se creó

**Identificación automática:**
Si el formulario incluye email, el sistema vincula automáticamente todos los touchpoints previos del mismo visitorId al contacto identificado.

**Ejemplo de Touchpoint de form_submission:**
```json
{
  "contactId": "...",
  "visitorId": "form_a1b2c3d4...",
  "type": "form_submission",
  "channel": "paid_search",
  "source": "google",
  "medium": "cpc",
  "campaign": "Brand Campaign 2024",
  "referenceType": "webForm",
  "referenceId": "...",
  "metadata": {
    "formName": "Solicitar Demo",
    "formKey": "demo-request",
    "email": "contacto@email.com",
    "dealCreated": true,
    "dealId": "..."
  },
  "isIdentified": true
}
```

### ¿Cuándo se crea un Touchpoint desde Landing Page?

**Los Touchpoints se crean automáticamente** en el endpoint de landing pages (`/api/public/lp/[slug]`):

| Evento | Método HTTP | Touchpoint Type | Cuándo se crea |
|--------|-------------|-----------------|----------------|
| Vista | POST | `landing_page_view` | Primera visita de un visitante único |
| Conversión | PATCH (converted=true) | `landing_page_conversion` | Al marcar conversión |

**Datos capturados automáticamente:**
- `visitorId` - ID único del visitante (cookie)
- `sessionId` - ID de la sesión
- `channel` - Detectado automáticamente de UTMs/referrer
- `source`, `medium`, `campaign`, `term`, `content` - Parámetros UTM
- `referenceType` - `landingPage`
- `referenceId` - ID de la página
- `device`, `browser`, `os` - Info del dispositivo
- `variant` - Variante de A/B test si aplica
- `isIdentified` - `false` (hasta que el visitante envíe formulario)

**Ejemplo de Touchpoint de landing_page_view:**
```json
{
  "visitorId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "landing_page_view",
  "channel": "paid_social",
  "source": "facebook",
  "medium": "cpc",
  "campaign": "promo-verano-2024",
  "referenceType": "landingPage",
  "referenceId": "...",
  "url": "https://ejemplo.com/lp/promo-verano",
  "device": "mobile",
  "browser": "Chrome",
  "isIdentified": false
}
```

**Detección automática de canal:**

El sistema detecta el canal basándose en UTMs y referrer:

| UTM Medium | Canal Detectado |
|------------|-----------------|
| `cpc`, `ppc`, `paid` + Google | `paid_search` |
| `cpc`, `ppc`, `paid` + Facebook/Instagram/LinkedIn | `paid_social` |
| `email`, `e-mail` | `email` |
| `social`, `organic_social` | `organic_social` |
| `affiliate` | `affiliate` |
| `display`, `banner` | `display` |
| Sin UTMs + referrer de Google/Bing | `organic_search` |
| Sin UTMs + referrer de redes sociales | `organic_social` |
| Sin UTMs + otro referrer | `referral` |
| Sin UTMs + sin referrer | `direct` |

### ¿Cómo se identifica al visitante anónimo (cookie)?

El sistema usa un `visitorId` que debe generarse y almacenarse en el cliente:

```typescript
// En el cliente (landing page, sitio web)
function getOrCreateVisitorId(): string {
  let visitorId = localStorage.getItem('_vid');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('_vid', visitorId);
  }
  return visitorId;
}

// Registrar touchpoint anónimo
await fetch('/api/marketing/touchpoints', {
  method: 'POST',
  body: JSON.stringify({
    visitorId: getOrCreateVisitorId(),
    type: 'page_view',
    // ... otros campos
  }),
});
```

**Cuando el visitante se identifica** (envía formulario, inicia sesión), se llama a:

```typescript
// POST /api/marketing/touchpoints/identify
await fetch('/api/marketing/touchpoints/identify', {
  method: 'POST',
  body: JSON.stringify({
    visitorId: getOrCreateVisitorId(),
    contactId: newContactId,  // ID del contacto recién creado
  }),
});
```

Esto actualiza todos los touchpoints anónimos con ese `visitorId` para asociarlos al `contactId`.

### Flujo Completo de Attribution (Ejemplo)

Este ejemplo muestra el journey completo de un lead desde la primera visita hasta la conversión:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DÍA 1: Visitante llega desde Facebook Ads                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  URL: /lp/promo-verano?utm_source=facebook&utm_medium=cpc&utm_campaign=...  │
│                                                                             │
│  → Se genera visitorId (cookie): "550e8400-e29b-..."                        │
│  → POST /api/public/lp/[slug]                                               │
│  → Touchpoint creado:                                                       │
│      type: landing_page_view                                                │
│      channel: paid_social (detectado de UTMs)                               │
│      isIdentified: false                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  DÍA 1: Visitante envía formulario en landing page                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  → PATCH /api/public/lp/[slug] (converted: true)                            │
│  → Touchpoint creado:                                                       │
│      type: landing_page_conversion                                          │
│      channel: paid_social                                                   │
│                                                                             │
│  → Se crea Contact en CRM con email del formulario                          │
│  → POST /api/marketing/touchpoints/identify                                 │
│      { visitorId: "550e8400...", contactId: "nuevo-contact-id" }            │
│  → Todos los touchpoints anónimos se asocian al contactId                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  DÍA 3: Contacto recibe email de nurturing y lo abre                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  → GET /api/email/track/open?c=encrypted&campaign=...                       │
│  → Touchpoint creado:                                                       │
│      type: email_open                                                       │
│      channel: email                                                         │
│      contactId: "nuevo-contact-id"                                          │
│      isIdentified: true                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  DÍA 3: Contacto hace click en enlace del email                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  → GET /api/email/track/click?url=...&c=encrypted&campaign=...              │
│  → Touchpoint creado:                                                       │
│      type: email_click                                                      │
│      channel: email                                                         │
│      url: "https://ejemplo.com/producto"                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  DÍA 7: Vendedor cierra el deal como ganado ($50,000 MXN)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  → Se llama a createDealConversion():                                       │
│                                                                             │
│    import { createDealConversion } from '@/lib/marketing/attributionEngine';│
│    await createDealConversion(dealId, contactId, 50000, 'MXN', closedDate); │
│                                                                             │
│  → Attribution Engine procesa automáticamente:                              │
│      1. Obtiene todos los touchpoints del contacto                          │
│      2. Calcula crédito por cada modelo de atribución                       │
│      3. Guarda resultados en Conversion.attribution[]                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  RESULTADO: Atribución calculada para todos los modelos                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Touchpoints del journey:                                                   │
│  ┌────┬─────────────────────────┬──────────────┬─────────────┐              │
│  │ #  │ Type                    │ Channel      │ Día         │              │
│  ├────┼─────────────────────────┼──────────────┼─────────────┤              │
│  │ 1  │ landing_page_view       │ paid_social  │ Día 1       │              │
│  │ 2  │ landing_page_conversion │ paid_social  │ Día 1       │              │
│  │ 3  │ email_open              │ email        │ Día 3       │              │
│  │ 4  │ email_click             │ email        │ Día 3       │              │
│  └────┴─────────────────────────┴──────────────┴─────────────┘              │
│                                                                             │
│  Atribución por modelo ($50,000 MXN):                                       │
│  ┌────────────────┬──────────────┬──────────────┬─────────────┐             │
│  │ Modelo         │ paid_social  │ email        │ Total       │             │
│  ├────────────────┼──────────────┼──────────────┼─────────────┤             │
│  │ First Touch    │ $50,000      │ $0           │ $50,000     │             │
│  │ Last Touch     │ $0           │ $50,000      │ $50,000     │             │
│  │ Linear         │ $25,000      │ $25,000      │ $50,000     │             │
│  │ U-Shaped       │ $40,000      │ $10,000      │ $50,000     │             │
│  │ Time Decay     │ $15,000      │ $35,000      │ $50,000     │             │
│  └────────────────┴──────────────┴──────────────┴─────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Integración con CRM

Para que el flujo funcione correctamente, el CRM debe:

1. **Al crear contacto desde formulario web:**
```typescript
// En el handler del formulario web
const contact = await Contact.create({ email, firstName, ... });

// Identificar touchpoints anónimos
await fetch('/api/marketing/touchpoints/identify', {
  method: 'POST',
  body: JSON.stringify({
    visitorId: req.body.visitorId,  // Viene del formulario (hidden field)
    contactId: contact._id.toString(),
  }),
});
```

2. **Al cerrar deal como ganado:**
```typescript
// En el handler de actualización de deal
if (deal.status === 'WON' && previousStatus !== 'WON') {
  await createDealConversion(
    deal._id,
    deal.contactId,
    deal.value,
    deal.currency,
    new Date()
  );
}
```

### ¿Dónde está el Attribution Engine?

**Archivo**: `lib/marketing/attributionEngine.ts`

El engine implementa los siguientes algoritmos:

| Modelo | Función | Lógica |
|--------|---------|--------|
| First Touch | `calculateFirstTouch()` | 100% al primer touchpoint |
| Last Touch | `calculateLastTouch()` | 100% al último touchpoint |
| Linear | `calculateLinear()` | Distribución igual entre todos |
| Time Decay | `calculateTimeDecay()` | Decaimiento exponencial (half-life 7 días) |
| U-Shaped | `calculateUShaped()` | 40% primero, 40% último, 20% medio |
| W-Shaped | `calculateWShaped()` | 30% primero, 30% MQL, 30% último, 10% resto |
| Custom | `calculateCustom()` | Pesos personalizados por canal |

**Uso típico:**

```typescript
import { createDealConversion, createFormConversion } from '@/lib/marketing/attributionEngine';

// Cuando se gana un deal
const conversion = await createDealConversion(
  dealId,
  contactId,
  dealValue,
  'MXN',
  closedDate
);
// Attribution se calcula automáticamente

// Cuando se envía un formulario
const conversion = await createFormConversion(
  contactId,
  formSubmissionId,
  submittedDate
);
```

---

### LandingPageView

Analytics detallado de visitas a landing pages:

```typescript
{
  pageId: ObjectId;
  visitorId: string;
  sessionId: string;
  variant?: string;               // Para A/B testing
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  device: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  ip?: string;
  userAgent?: string;
  timeOnPage: number;             // Segundos
  scrollDepth: number;            // 0-100%
  converted: boolean;
  submissionId?: ObjectId;        // Si convirtió
  exitUrl?: string;
  createdAt: Date;
}
```

**Métodos Estáticos:**
- `getPageAnalytics(pageId, startDate?, endDate?)` - Métricas generales (views, uniqueVisitors, conversions, avgTimeOnPage, avgScrollDepth, bounceRate)
- `getTrafficSources(pageId, limit)` - Fuentes de tráfico con conversion rate
- `getDeviceBreakdown(pageId)` - Desglose por dispositivo
- `getViewsOverTime(pageId, days)` - Vistas y conversiones por día
- `getABTestResults(pageId)` - Resultados de A/B test por variante

---

## Troubleshooting

### OAuth no funciona

1. Verificar variables de entorno configuradas
2. Verificar URLs de callback registradas en la plataforma
3. Revisar logs en `/api/marketing/oauth/[platform]/callback`

### Métricas no se sincronizan

1. Verificar que los tokens no hayan expirado
2. Ejecutar sync manual desde `/admin/marketing-sync`
3. Revisar `MarketingSyncLog` para errores

### Creativos no suben

1. Verificar configuración de Cloudflare R2
2. Verificar límites de tamaño de archivo
3. Verificar tipos MIME permitidos

### Campañas rechazadas

1. Revisar políticas de la plataforma
2. Verificar contenido del creativo
3. Revisar targeting (algunas combinaciones no permitidas)

---

## Archivos Principales

### Modelos
- `models/MarketingCampaign.ts` - Campañas de ads
- `models/MarketingAudience.ts` - Audiencias/Segmentos
- `models/MarketingCreative.ts` - Creativos de ads
- `models/MarketingPlatformConfig.ts` - Configuración OAuth
- `models/MarketingMetric.ts` - Métricas de campañas
- `models/MarketingSyncLog.ts` - Logs de sincronización
- `models/MarketingAutomation.ts` - Automatizaciones de marketing
- `models/WebAnalyticsEvent.ts` - Eventos de analytics
- `models/WhatsAppTemplate.ts` - Templates de WhatsApp
- `models/EmailCampaign.ts` - Campañas de email
- `models/EmailCampaignRecipient.ts` - Destinatarios de email
- `models/EmailCampaignTemplate.ts` - Templates de email
- `models/LandingPage.ts` - Landing pages
- `models/LandingPageTemplate.ts` - Plantillas de landing pages
- `models/LandingPageView.ts` - Analytics de landing pages (vistas, scroll, tiempo)
- `models/Touchpoint.ts` - Registro de interacciones (page_view, email_click, ad_click, etc.)
- `models/Conversion.ts` - Conversiones con atribución calculada

### Componentes
- `components/marketing/AudienceBuilder.tsx` - Constructor visual de audiencias
- `components/marketing/CreativeBuilder.tsx` - Constructor visual de creativos
- `components/marketing/EmailBlockEditor.tsx` - Editor de emails drag-drop
- `components/marketing/AIContentGenerator.tsx` - Generador de contenido IA
- `components/marketing/ABTestManager.tsx` - UI de A/B testing
- `components/landing-pages/LandingPageEditor.tsx` - Editor de landing pages
- `components/landing-pages/sections/` - Secciones de landing pages (21 tipos)

### Páginas
- `app/marketing/page.tsx` - Dashboard
- `app/marketing/campaigns/` - Gestión de campañas de ads
- `app/marketing/email-campaigns/` - Gestión de email marketing
- `app/marketing/landing-pages/` - Gestión de landing pages
- `app/marketing/audiences/page.tsx` - Biblioteca de audiencias
- `app/marketing/creatives/page.tsx` - Biblioteca de creativos
- `app/marketing/web-tracking/page.tsx` - Web Analytics
- `app/marketing/attribution/` - Attribution reporting
- `app/marketing/automations/` - Automatizaciones
- `app/marketing/whatsapp/` - WhatsApp Business
- `app/(public)/unsubscribe/` - Centro de preferencias público

### APIs
- `app/api/marketing/campaigns/` - CRUD campañas de ads
- `app/api/marketing/campaigns/[id]/publish/` - Publicar a plataformas
- `app/api/marketing/email-campaigns/` - CRUD email campaigns
- `app/api/marketing/email-campaigns/[id]/send/` - Envío de emails (Resend)
- `app/api/marketing/email-templates/` - Templates de email
- `app/api/marketing/landing-pages/` - CRUD landing pages
- `app/api/marketing/landing-templates/` - Plantillas de landing pages
- `app/api/marketing/audiences/` - CRUD audiencias
- `app/api/marketing/creatives/` - CRUD creativos
- `app/api/marketing/automations/` - CRUD automatizaciones
- `app/api/marketing/automations/[id]/activate/` - Activar automatización
- `app/api/marketing/automations/[id]/pause/` - Pausar automatización
- `app/api/marketing/automations/trigger/` - Disparar triggers
- `app/api/marketing/oauth/` - Integraciones OAuth
- `app/api/marketing/sync/` - Sincronización
- `app/api/marketing/attribution/` - Attribution endpoints
- `app/api/marketing/touchpoints/` - Touchpoints
- `app/api/marketing/whatsapp/` - WhatsApp API
- `app/api/marketing/whatsapp/send/` - Envío de mensajes WhatsApp
- `app/api/email/track/open/` - Tracking de aperturas
- `app/api/email/track/click/` - Tracking de clicks
- `app/api/public/unsubscribe/` - API de preferencias
- `app/api/ai/generate-marketing-content/` - Generación de contenido IA
- `app/api/webhooks/resend/` - Webhook de Resend
- `app/api/cron/send-scheduled-emails/` - Cron de emails programados
- `app/api/cron/marketing-sync/` - Cron de sincronización

### Servicios
- `lib/resend.ts` - Cliente de Resend para envío de emails
- `lib/whatsapp.ts` - Cliente de WhatsApp Business API
- `lib/emailUtils.ts` - Utilidades de email (tracking, encryption)
- `lib/marketing/metricsSync.ts` - Sincronización de métricas
- `lib/marketing/attributionEngine.ts` - Motor de atribución multi-touch

### Admin
- `app/admin/marketing-integrations/` - Configurar integraciones
- `app/admin/marketing-sync/` - Panel de sincronización
