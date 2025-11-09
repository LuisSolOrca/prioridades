# Auto-Reprogramación de Prioridades

## Descripción

El sistema de auto-reprogramación automáticamente detecta prioridades que vencieron (pasaron su `weekEnd`) en estado `EN_TIEMPO` y las reprograma automáticamente a la siguiente semana.

Este comportamiento replica exactamente lo que sucede cuando un usuario mueve manualmente una prioridad a la siguiente semana en el tablero Kanban:

1. La prioridad original se marca como `REPROGRAMADO`
2. Se crea una copia nueva para la siguiente semana con:
   - `status: EN_TIEMPO`
   - `isCarriedOver: true` (indicador visual 🔄)
   - `completionPercentage: 0` (se resetea el progreso)
   - Checklist copiado pero con todas las tareas sin completar
   - Sin enlaces de evidencia (se inicia desde cero)
3. Se crean comentarios del sistema en ambas prioridades para registrar la reprogramación

## Implementación

### 1. Endpoint API Principal

**`POST /api/priorities/auto-reschedule`**

Ejecuta la lógica de auto-reprogramación:

```bash
curl -X POST http://localhost:3000/api/priorities/auto-reschedule
```

**Respuesta:**
```json
{
  "message": "Auto-rescheduling completed: 3 successful, 0 failed",
  "stats": {
    "success": 3,
    "failed": 0
  },
  "nextWeek": {
    "monday": "2025-11-10T00:00:00.000Z",
    "friday": "2025-11-14T00:00:00.000Z"
  },
  "results": [
    {
      "originalId": "...",
      "newId": "...",
      "title": "Prioridad ejemplo",
      "userId": "...",
      "status": "success"
    }
  ]
}
```

### 2. Ejecución Manual desde Panel de Admin

El panel de administración en `/admin/auto-reschedule` incluye:
- Estadísticas en tiempo real de prioridades pendientes
- Botón "▶️ Ejecutar Ahora" para ejecución manual
- Visualización de resultados y historial

### 3. Ejecución Externa (Opcional)

**`GET /api/cron/weekly-reschedule`**

Endpoint diseñado para ser llamado por servicios externos de cron.

#### Opción A: Servicio Externo Gratuito (cron-job.org)

1. Crear cuenta en [https://cron-job.org](https://cron-job.org)
2. Crear nuevo cron job:
   - **URL:** `https://your-app.vercel.app/api/cron/weekly-reschedule`
   - **Schedule:** Cada lunes a las 00:00
   - **HTTP Method:** GET
   - **Headers:** `Authorization: Bearer YOUR_CRON_SECRET`
3. Configurar variable de entorno `CRON_SECRET` en Vercel

#### Opción B: Llamada Manual desde Admin Panel

El panel de administración en `/admin/auto-reschedule` ya incluye un botón
"▶️ Ejecutar Ahora" que ejecuta la reprogramación manualmente.

## Variables de Entorno

```bash
# Opcional: Secret para proteger el endpoint de cron
CRON_SECRET=your-random-secret-here

# Requerido: URL de la aplicación
NEXTAUTH_URL=https://your-app.vercel.app
```

Para generar un `CRON_SECRET` seguro:
```bash
openssl rand -base64 32
```

## Lógica de Reprogramación

### Criterios para Auto-Reprogramación

Una prioridad se reprograma automáticamente SI:
- ✅ `weekEnd` < fecha actual (ya venció)
- ✅ `status === 'EN_TIEMPO'` (no está completada, bloqueada, etc.)
- ✅ `status !== 'REPROGRAMADO'` (no fue reprogramada anteriormente)

### NO se reprograman prioridades que:
- ❌ Ya están completadas (`COMPLETADO`)
- ❌ Ya fueron reprogramadas (`REPROGRAMADO`)
- ❌ Están bloqueadas (`BLOQUEADO`)
- ❌ Están en riesgo (`EN_RIESGO`)

### Semana Objetivo

Las prioridades se reprograman a la **siguiente semana** (próximo lunes-viernes) desde la fecha de ejecución.

## Pruebas

### Script de Prueba

```bash
# Crear prioridades de prueba y ejecutar auto-reprogramación
npx tsx scripts/test-auto-reschedule.ts
```

Este script:
1. Crea 2 prioridades de prueba con fecha de la semana pasada en estado `EN_TIEMPO`
2. Ejecuta la auto-reprogramación
3. Verifica que:
   - Las originales cambiaron a `REPROGRAMADO`
   - Se crearon copias nuevas con `EN_TIEMPO` y `isCarriedOver: true`
   - El progreso se reseteó a 0%
   - El checklist se copió pero sin completar

### Prueba Manual en Dev

1. Iniciar servidor: `npm run dev`
2. Crear una prioridad manualmente con fecha de la semana pasada y estado `EN_TIEMPO`
3. Llamar al endpoint: `curl -X POST http://localhost:3000/api/priorities/auto-reschedule`
4. Verificar en la base de datos o en la UI que se creó la reprogramación

## Monitoreo

### Logs

La función de auto-reprogramación genera logs detallados:

```
🔍 Found 3 expired priorities in EN_TIEMPO status
✅ Rescheduled priority: Implementar nueva feature (507f1f77bcf86cd799439011 → 507f1f77bcf86cd799439012)
✅ Auto-rescheduling completed: 3 successful, 0 failed
```

### Verificar Estado

Puedes crear un endpoint de admin para ver cuántas prioridades están pendientes de reprogramación:

```typescript
import { getPendingAutoRescheduleCount } from '@/lib/autoReschedule';

const pendingCount = await getPendingAutoRescheduleCount();
console.log(`Prioridades pendientes de reprogramar: ${pendingCount}`);
```

## Indicadores Visuales

Las prioridades reprogramadas se identifican con:

- **Badge 🔄**: Indica que la prioridad fue traída automáticamente de una semana anterior
- **Estado REPROGRAMADO**: La prioridad original muestra este estado en el historial
- **Comentario del Sistema**: "🤖 Prioridad reprogramada automáticamente..."

## Consideraciones

### Frecuencia de Ejecución

La reprogramación se ejecuta **únicamente de forma manual**:
- Desde el panel de admin (`/admin/auto-reschedule`) usando el botón "▶️ Ejecutar Ahora"
- Opcionalmente, configurando un servicio de cron externo (cron-job.org)
- Mediante llamadas directas al API endpoint

### Performance

- La función es no-bloqueante (fire-and-forget)
- Se ejecuta en segundo plano sin afectar la experiencia del usuario
- En caso de error, no afecta la navegación del usuario

### Limitaciones

- Requiere ejecución manual desde el panel de admin
- Para automatización semanal, se recomienda configurar cron externo en cron-job.org

## Próximos Pasos

1. **Agregar Panel de Admin**: Botón manual para ejecutar auto-reprogramación
2. **Dashboard de Estadísticas**: Mostrar cuántas prioridades fueron auto-reprogramadas
3. **Notificaciones**: Enviar notificación a usuarios cuando sus prioridades se reprograman
4. **Configuración por Usuario**: Permitir a usuarios opt-out de auto-reprogramación
5. **Configurar cron externo**: Usar cron-job.org para garantizar ejecución semanal

## Soporte

Para problemas o preguntas sobre la auto-reprogramación:
1. Revisar logs del servidor
2. Verificar que las prioridades cumplen los criterios de reprogramación
3. Ejecutar script de prueba para validar funcionamiento
