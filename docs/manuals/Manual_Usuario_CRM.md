# Manual de Usuario - CRM

**Sistema de Gestión de Relaciones con Clientes**

---

## Contenido

1. [Introducción](#1-introducción)
2. [Dashboard CRM](#2-dashboard-crm)
3. [Pipeline de Ventas](#3-pipeline-de-ventas)
4. [Gestión de Deals](#4-gestión-de-deals)
5. [Clientes y Contactos](#5-clientes-y-contactos)
6. [Lead Scoring](#6-lead-scoring)
7. [Actividades](#7-actividades)
8. [Calendario](#8-calendario)
9. [Cotizaciones](#9-cotizaciones)
10. [Productos](#10-productos)
11. [Email Templates](#11-email-templates)
12. [Secuencias de Email](#12-secuencias-de-email)
13. [Formularios Web](#13-formularios-web)
14. [Workflows](#14-workflows)
15. [Competidores](#15-competidores)
16. [Cuotas de Venta](#16-cuotas-de-venta)
17. [Herramientas de IA](#17-herramientas-de-ia)
18. [Reportes](#18-reportes)

---

## 1. Introducción

El CRM es una herramienta diseñada para gestionar todo el ciclo de ventas de su empresa, desde la captación de prospectos hasta el cierre de oportunidades.

**Beneficios principales:**

- Visualización clara de todas sus oportunidades de venta
- Seguimiento del progreso de cada negociación
- Gestión centralizada de clientes y contactos
- Lead scoring automático para priorizar prospectos
- Automatización de tareas y seguimientos
- Generación de cotizaciones profesionales
- Reportes y métricas en tiempo real
- Asistencia de Inteligencia Artificial

---

## 2. Dashboard CRM

El Dashboard le ofrece una vista completa del estado de sus ventas con métricas en tiempo real.

### Métricas principales

| Métrica | Descripción |
|---------|-------------|
| Pipeline Total | Valor total de oportunidades activas |
| Forecast | Valor ponderado por probabilidad |
| Deals Ganados | Ventas cerradas en el período |
| Win Rate | Porcentaje de negocios ganados |
| Ciclo de Venta | Días promedio para cerrar |
| Ticket Promedio | Valor promedio por venta |
| Velocidad Pipeline | Dinero potencial por día |

### Métricas financieras

- **MRR**: Ingresos Mensuales Recurrentes
- **ARR**: Ingresos Anuales Recurrentes
- **CLTV**: Valor de Vida del Cliente
- **Churn**: Tasa de cancelación

### Temperatura de Leads

Visualice sus prospectos clasificados automáticamente:
- 🔥 **Calientes**: Score ≥80 - Alta probabilidad
- 🌡️ **Tibios**: Score 50-79 - Interés moderado
- ❄️ **Fríos**: Score <50 - Requieren nurturing

### Rendimiento por vendedor

- Valor total de ventas
- Cantidad de deals cerrados
- Win rate individual
- Progreso vs meta

### Selector de período

Filtre todas las métricas por:
- Mes actual
- Trimestre actual
- Año actual

---

## 3. Pipeline de Ventas

El Pipeline es un tablero visual estilo Kanban donde cada columna representa una etapa del proceso de ventas.

### Etapas predeterminadas

| Etapa | Probabilidad | Descripción |
|-------|--------------|-------------|
| Prospecto | 10% | Oportunidad identificada |
| Calificado | 25% | Cliente muestra interés real |
| Propuesta Enviada | 50% | Cotización entregada |
| Negociación | 75% | En proceso de cierre |
| Cerrado Ganado | 100% | Venta exitosa |
| Cerrado Perdido | 0% | Oportunidad perdida |

### Múltiples Pipelines

Puede crear diferentes pipelines para distintos procesos:
1. Vaya a **Configuración > Pipelines**
2. Haga clic en **"+ Nuevo Pipeline"**
3. Configure nombre y etapas personalizadas
4. Marque uno como pipeline por defecto

### Personalizar etapas

Para cada etapa puede configurar:
- Nombre y color
- Probabilidad de cierre
- Si representa un estado cerrado (ganado/perdido)

### Cómo usar el Pipeline

**Mover un deal entre etapas:**
1. Ubique el deal en el tablero
2. Arrastre y suelte en la nueva etapa
3. El cambio se guarda automáticamente

**Filtrar deals:**
- Use la barra de búsqueda
- Filtre por vendedor responsable
- Filtre por valor o fecha

---

## 4. Gestión de Deals

Un "Deal" representa una oportunidad de venta en proceso.

### Crear un nuevo Deal

1. Haga clic en **"+ Nuevo Deal"**
2. Complete la información:
   - **Título**: Nombre descriptivo
   - **Valor**: Monto de la oportunidad
   - **Moneda**: MXN, USD o EUR
   - **Cliente**: Seleccione o cree uno nuevo
   - **Contacto**: Persona de contacto
   - **Fecha de cierre esperada**
   - **Tipo**: Nuevo negocio, Upsell, Cross-sell, Renovación

### Deals Recurrentes

Para servicios con pagos recurrentes:
1. Active la opción **"Deal Recurrente"**
2. Configure la frecuencia (Mensual, Trimestral, Anual)
3. Ingrese el valor MRR

### Información del Deal

En la vista de detalle puede ver:
- Datos generales del negocio
- Cliente y contacto asociado
- Lead score y temperatura
- Historial de actividades
- Productos cotizados
- Cotizaciones generadas
- Competidores identificados
- Costo de venta y margen

### Cerrar un Deal

**Como Ganado:**
1. Abra el deal
2. Haga clic en **"Marcar como Ganado"**
3. Se registra automáticamente la venta

**Como Perdido:**
1. Abra el deal
2. Haga clic en **"Marcar como Perdido"**
3. Seleccione el motivo de pérdida

---

## 5. Clientes y Contactos

### Clientes

Los clientes representan empresas u organizaciones.

**Crear un cliente:**
1. Vaya a **CRM > Clientes**
2. Haga clic en **"+ Nuevo Cliente"**
3. Complete la información:
   - Nombre de la empresa
   - Industria
   - Tamaño (número de empleados)
   - Ingresos anuales
   - Website
   - País y ciudad
4. Guarde los cambios

**Perfil del cliente incluye:**
- Información de la empresa
- Todos los deals asociados
- Contactos de la empresa
- Historial de actividades
- Métricas de valor de vida (LTV)

### Contactos

Los contactos son personas dentro de las empresas cliente.

**Crear un contacto:**
1. Vaya a **CRM > Contactos**
2. Haga clic en **"+ Nuevo Contacto"**
3. Complete la información:
   - Nombre y apellido
   - Email y teléfono
   - Cargo y departamento
   - LinkedIn URL
   - Cliente asociado
4. Configure preferencias de email:
   - Marketing
   - Newsletter
   - Promociones
   - Actualizaciones de productos
   - Eventos

**Contacto primario:**
Puede marcar un contacto como primario para cada cliente.

### Tags y Campos Personalizados

- Agregue tags para clasificar contactos y clientes
- Cree campos personalizados según sus necesidades

### Detección de Duplicados

El sistema detecta duplicados potenciales por:
- Email
- Teléfono
- Nombre similar

Para fusionar duplicados:
1. Vaya a **CRM > Duplicados**
2. Revise las coincidencias
3. Seleccione el registro maestro
4. Confirme la fusión

---

## 6. Lead Scoring

El Lead Scoring califica automáticamente a sus prospectos para priorizar esfuerzos.

### Cómo funciona

El score se compone de dos factores:

| Factor | Peso Default | Descripción |
|--------|--------------|-------------|
| FIT | 40% | Qué tan bien encaja el prospecto |
| Engagement | 60% | Nivel de interacción |

### Reglas de FIT

Basadas en características demográficas:
- Industria
- Número de empleados
- Ingresos de la empresa
- País/Ciudad
- Cargo del contacto
- Fuente del lead

### Reglas de Engagement

Basadas en comportamiento:
- Email abierto/respondido
- Click en email
- Cotización vista/aceptada
- Reunión agendada/completada
- Formulario enviado
- Visita a landing page
- Descarga de contenido

### Configurar Lead Scoring

1. Vaya a **Admin > Lead Scoring**
2. Cree reglas con puntos (positivos o negativos)
3. Configure thresholds de temperatura:
   - Hot: ≥80 puntos
   - Warm: 50-79 puntos
   - Cold: <50 puntos
4. Active la configuración

### Decay de puntos

Los puntos de engagement decaen con inactividad:
- Después de 7 días sin actividad
- 2 puntos menos por día

---

## 7. Actividades

Registre todas las interacciones con sus clientes.

### Tipos de actividades

| Tipo | Uso |
|------|-----|
| 📞 Llamada | Conversaciones telefónicas con duración y resultado |
| ✉️ Email | Comunicaciones por correo |
| 📅 Reunión | Citas presenciales o virtuales |
| 📝 Nota | Observaciones internas |
| ✅ Tarea | Pendientes por realizar |

### Registrar una actividad

1. Abra el deal, cliente o contacto
2. En la sección de actividades, haga clic en **"+ Nueva"**
3. Seleccione el tipo de actividad
4. Complete la información:
   - Descripción
   - Fecha y hora
   - Duración (para llamadas)
   - Resultado/Outcome
   - Asignado a
5. Guarde

### Tareas

Las tareas tienen características especiales:
- Fecha de vencimiento
- Asignación a usuarios
- Estado completado/pendiente
- Recordatorios automáticos

---

## 8. Calendario

Acceda a **CRM > Calendario** para gestionar su agenda.

### Vistas disponibles

- Vista mensual
- Vista semanal
- Vista diaria

### Funcionalidades

- Ver todas las actividades programadas
- Filtrar por tipo de actividad
- Filtrar por vendedor
- Arrastrar para reagendar
- Crear actividades directamente
- Ver actividades completadas vs pendientes

---

## 9. Cotizaciones

Genere propuestas comerciales profesionales.

### Crear una cotización

1. Abra el deal correspondiente
2. Haga clic en **"+ Nueva Cotización"**
3. Se genera un número único (COT-AAAA-XXXX)
4. Agregue productos del catálogo
5. Configure:
   - Cantidades y precios
   - Descuentos por línea
   - Impuestos
   - Días de validez
   - Términos y condiciones
6. Guarde

### Cálculos automáticos

El sistema calcula:
- Subtotal por línea
- Descuento total
- Impuestos
- Total final

### Estados de cotización

| Estado | Descripción |
|--------|-------------|
| Borrador | En preparación |
| Enviada | Entregada al cliente |
| Aceptada | Cliente aceptó |
| Rechazada | Cliente rechazó |
| Expirada | Pasó la fecha de validez |

### Versiones

Cada modificación crea una nueva versión (v1, v2, etc.) manteniendo el historial.

### Acciones disponibles

- **Generar PDF**: Descarga el documento
- **Enviar por Email**: Envío directo al cliente
- **Duplicar**: Crear copia para nuevo presupuesto

---

## 10. Productos

Gestione su catálogo de productos y servicios.

### Crear un producto

1. Vaya a **CRM > Productos**
2. Haga clic en **"+ Nuevo Producto"**
3. Complete:
   - Nombre y SKU
   - Descripción
   - Precio y moneda
   - Categoría (Software, Hardware, Servicios, etc.)
   - Unidad de medida
   - Tasa de impuesto (default 16%)
   - Imagen

### Precios por cantidad

Configure precios escalonados:
- 1-10 unidades: $100
- 11-50 unidades: $90
- 51+ unidades: $80

---

## 11. Email Templates

Cree plantillas de email reutilizables.

### Crear una plantilla

1. Vaya a **CRM > Email Templates**
2. Haga clic en **"+ Nueva Plantilla"**
3. Seleccione la categoría:
   - Prospección
   - Seguimiento
   - Nurturing
   - Cierre
   - Reuniones
   - Cotizaciones
4. Use el editor visual con bloques

### Bloques disponibles

- Texto
- Imagen
- Botón
- Divisor
- Columnas
- HTML personalizado
- Social
- Video

### Variables disponibles

Inserte datos dinámicos:
- `{{contact.firstName}}` - Nombre del contacto
- `{{client.name}}` - Nombre de la empresa
- `{{deal.value}}` - Valor del deal
- `{{user.name}}` - Su nombre
- `{{today}}` - Fecha actual

---

## 12. Secuencias de Email

Automatice seguimientos con secuencias multi-paso.

### Crear una secuencia

1. Vaya a **CRM > Secuencias**
2. Haga clic en **"+ Nueva Secuencia"**
3. Configure los pasos:
   - **Email**: Envío automático
   - **Tarea**: Crear recordatorio
   - **LinkedIn**: Acción en LinkedIn

### Configurar tiempos

Para cada paso defina el retraso:
- Días después del paso anterior
- Hora específica de envío

### Opciones de salida

Configure cuándo el contacto sale de la secuencia:
- Al responder un email
- Al agendar reunión
- Al ganar el deal
- Al perder el deal

### Inscribir contactos

1. Seleccione los contactos
2. Elija la secuencia
3. Confirme la inscripción

### Estadísticas

Vea métricas por secuencia:
- Total inscritos
- Activos
- Completados
- Tasa de apertura
- Tasa de respuesta

---

## 13. Formularios Web

Capture leads desde su sitio web.

### Crear un formulario

1. Vaya a **CRM > Formularios**
2. Haga clic en **"+ Nuevo Formulario"**
3. Agregue campos:
   - Texto, Email, Teléfono
   - Empresa, Select, Textarea
   - Checkbox, Número, Fecha

### Configurar campos

Para cada campo defina:
- Etiqueta
- Placeholder
- Si es requerido
- Ancho (completo o mitad)
- Validaciones

### Acciones post-envío

Configure qué sucede al enviar:
- Crear contacto automáticamente
- Crear deal en pipeline específico
- Asignar a vendedor (fijo o round-robin)
- Agregar tags
- Disparar workflow

### Embed del formulario

1. Copie el código de embed
2. Pegue en su sitio web
3. Configure dominios permitidos

### Seguridad

- Rate limiting configurable
- CAPTCHA opcional
- Dominios autorizados

---

## 14. Workflows

Configure automatizaciones que se ejecutan sin intervención.

### Crear un workflow

1. Vaya a **CRM > Workflows**
2. Haga clic en **"+ Nuevo Workflow"**
3. Seleccione el trigger
4. Agregue las acciones

### Triggers disponibles

| Trigger | Se activa cuando... |
|---------|---------------------|
| Deal creado | Se crea un nuevo deal |
| Deal cambió etapa | Se mueve un deal |
| Deal ganado | Se cierra como ganado |
| Deal perdido | Se cierra como perdido |
| Contacto creado | Se registra un contacto |
| Tarea vencida | Pasa la fecha límite |
| Cotización aceptada | Cliente acepta propuesta |

### Acciones disponibles

| Acción | Descripción |
|--------|-------------|
| Enviar email | Email automático con plantilla |
| Crear tarea | Tarea asignada |
| Agregar/Quitar tag | Modificar etiquetas |
| Actualizar campo | Cambiar datos |
| Mover a etapa | Cambiar etapa del deal |
| Asignar owner | Reasignar responsable |
| Notificar equipo | Alerta interna |
| Webhook | Llamada a sistema externo |
| Retraso | Esperar X minutos |
| Condición | Bifurcación IF/THEN/ELSE |

### Ejemplo de workflow

**Seguimiento de cotización enviada:**
1. **Trigger**: Cotización enviada
2. **Esperar**: 3 días
3. **Condición**: ¿Cotización vista?
   - Sí: Enviar email de seguimiento
   - No: Crear tarea de llamada

---

## 15. Competidores

Registre y analice a su competencia.

### Registrar competidor

1. Vaya a **CRM > Competidores**
2. Haga clic en **"+ Nuevo Competidor"**
3. Complete:
   - Nombre y website
   - Posición de mercado (Líder, Retador, Nicho)
   - Fortalezas y debilidades
   - Información de precios

### Vincular a deals

En cada deal puede:
1. Agregar competidores presentes
2. Indicar nivel de amenaza (Bajo, Medio, Alto)
3. Registrar precio ofrecido
4. Documentar fortalezas/debilidades percibidas
5. Registrar resultado (Ganamos, Perdimos)

### Estadísticas

Vea su desempeño contra cada competidor:
- Deals ganados vs perdidos
- Diferencial de precios promedio

---

## 16. Cuotas de Venta

Establezca y siga metas de venta.

### Crear una cuota

1. Vaya a **CRM > Cuotas**
2. Haga clic en **"+ Nueva Cuota"**
3. Configure:
   - Vendedor
   - Período (Mensual, Trimestral, Anual)
   - Meta en valor
   - Meta en cantidad de deals (opcional)
   - Moneda

### Seguimiento

Visualice en tiempo real:
- Valor logrado vs meta
- Porcentaje de cumplimiento
- Comparativa vs período anterior

---

## 17. Herramientas de IA

El CRM incluye asistentes inteligentes.

### Asistente de Email

Genera borradores de emails profesionales.

**Cómo usar:**
1. En el deal, vaya a "Enviar Email"
2. Haga clic en **"Generar con IA"**
3. Describa el propósito
4. Seleccione el tono (Profesional, Casual, Persuasivo)
5. Revise y edite el borrador

### Resumen Inteligente

Obtiene un análisis ejecutivo de cualquier deal.

**Cómo usar:**
1. Abra el deal
2. Haga clic en **"Resumen IA"**
3. Vea el análisis con:
   - Puntos clave
   - Historial resumido
   - Próximos pasos sugeridos

### Siguiente Mejor Acción

Recibe sugerencias de qué hacer a continuación.

**Cómo usar:**
1. Abra el deal
2. En el panel de IA, vea las acciones sugeridas
3. Las sugerencias están priorizadas por impacto

### Predicción de Cierre

Conoce la probabilidad de ganar un deal.

**Cómo usar:**
1. Abra el deal
2. Vea el indicador de "Probabilidad de Cierre"
3. Revise los factores:
   - Positivos (aumentan probabilidad)
   - Negativos (riesgos identificados)

---

## 18. Reportes

Acceda a análisis detallados en **CRM > Reportes**.

### Reportes disponibles

| Reporte | Contenido |
|---------|-----------|
| Pipeline | Valor por etapa, tiempo promedio en etapa |
| Ventas | Deals ganados, perdidos, valor por período |
| Vendedores | Performance individual, win rate, ticket promedio |
| Lead Scoring | Distribución por temperatura, conversión |
| Actividades | Cantidad por tipo, por vendedor |
| Forecast | Proyección de ingresos futuros |
| Competidores | Win/loss por competidor |
| Cuotas | Cumplimiento por vendedor |

### Exportar reportes

1. Seleccione el período
2. Configure los filtros
3. Haga clic en **"Exportar PDF"**

### Reportes programados

Configure envío automático de reportes por email:
1. Seleccione el reporte
2. Configure frecuencia (semanal, mensual)
3. Indique destinatarios

---

## Consejos Rápidos

**Para mejorar su productividad:**

1. **Actualice deals regularmente** - Mantenga información al día
2. **Registre todas las actividades** - El historial es valioso
3. **Use lead scoring** - Priorice prospectos calientes
4. **Configure workflows** - Automatice tareas repetitivas
5. **Use secuencias** - Seguimiento automático sin olvidar
6. **Revise el dashboard** - Identifique prioridades diariamente
7. **Aproveche la IA** - Ahorre tiempo con los asistentes

---

## Soporte

Si necesita ayuda adicional:

- Consulte la documentación técnica
- Contacte al administrador del sistema

---

*Manual de Usuario CRM - Versión 2.0*
