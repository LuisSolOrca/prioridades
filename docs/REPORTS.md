# Sistema de Reportes Automáticos de Rendimiento

## Descripción General

El sistema de reportes automáticos envía por correo electrónico un análisis estadístico del rendimiento de cada usuario, comparando su desempeño con períodos anteriores. Los reportes pueden ser **semanales**, **mensuales** o **ambos**, y se envían automáticamente según la configuración establecida por los administradores.

## Características Principales

### Métricas Incluidas

Cada reporte incluye las siguientes métricas:

1. **Prioridades Atendidas**: Total de prioridades en el período
2. **Tasa de Completitud**: Porcentaje de prioridades completadas
3. **Prioridades Retrasadas**: Prioridades en riesgo, bloqueadas o reprogramadas
4. **Tareas Ejecutadas**: Total de tareas del checklist completadas
5. **Horas Reportadas**: Suma de horas registradas en las tareas

### Análisis Comparativo

Cada métrica incluye:
- **Valor actual**: Del período evaluado
- **Cambio porcentual**: Comparado con el período anterior
- **Indicadores visuales**: Flechas y colores para identificar mejoras o decrementos

### Top Prioridades

Lista de las 5 prioridades principales del período ordenadas por:
- Porcentaje de completitud
- Status (completadas primero)

### Insights Automáticos

El sistema genera automáticamente mensajes personalizados:
- **Mejora**: Si la tasa de completitud aumentó
- **Oportunidad de mejora**: Si la tasa disminuyó significativamente (>5%)
- **Rendimiento estable**: Si se mantiene constante

## Configuración

### Panel de Administración

Los administradores pueden acceder a `/admin/report-settings` para configurar:

#### Frecuencia de Reportes
- **Ninguno**: Reportes desactivados
- **Semanal**: Solo reportes semanales
- **Mensual**: Solo reportes mensuales
- **Ambos**: Reportes semanales y mensuales

#### Reporte Semanal
- **Día de envío**: Día de la semana (0=Domingo, 6=Sábado)
- **Hora de envío**: Hora del día (0-23, en formato 24h)
- **Recomendado**: Lunes a las 9:00 AM

#### Reporte Mensual
- **Día del mes**: Día del mes para envío (1-28)
- **Hora de envío**: Hora del día (0-23)
- **Recomendado**: Día 1 del mes a las 9:00 AM

### Estado del Sistema
- **isActive**: Activar/desactivar el sistema completo
- **Último envío**: Fecha y hora del último reporte enviado

## Automatización

### Configurar Cron Job Externo

Para que los reportes se envíen automáticamente, configura un servicio cron externo como [cron-job.org](https://cron-job.org):

1. Crea una cuenta en cron-job.org
2. Crea un nuevo cron job con:
   - **URL**: `https://tu-dominio.vercel.app/api/cron/send-reports`
   - **Método**: GET
   - **Frecuencia**: Cada hora (recomendado)
   - **Título**: "Reportes de Rendimiento - Prioridades App"

3. El sistema verificará automáticamente si es momento de enviar reportes según tu configuración

### Lógica de Envío

El endpoint `/api/cron/send-reports`:
1. Verifica la configuración actual
2. Compara fecha/hora actual con la configuración
3. Envía reportes solo si:
   - El sistema está activo (`isActive: true`)
   - La frecuencia no es `NINGUNO`
   - El día y hora coinciden con la configuración
4. Actualiza la fecha del último envío

## API Endpoints

### `GET /api/admin/report-settings`
**Acceso**: Solo ADMIN

Obtiene la configuración actual de reportes.

**Respuesta**:
```json
{
  "_id": "...",
  "reportFrequency": "AMBOS",
  "weeklyReportDay": 1,
  "weeklyReportHour": 9,
  "monthlyReportDay": 1,
  "monthlyReportHour": 9,
  "isActive": true,
  "lastWeeklyReportSent": "2025-01-13T09:00:00.000Z",
  "lastMonthlyReportSent": "2025-01-01T09:00:00.000Z"
}
```

### `PUT /api/admin/report-settings`
**Acceso**: Solo ADMIN

Actualiza la configuración de reportes.

**Body**:
```json
{
  "reportFrequency": "SEMANAL",
  "weeklyReportDay": 1,
  "weeklyReportHour": 9,
  "isActive": true
}
```

### `POST /api/reports/send`
**Acceso**: Solo ADMIN

Genera y envía reportes manualmente. Útil para pruebas.

**Body**:
```json
{
  "reportType": "SEMANAL",
  "testMode": true,
  "testEmail": "admin@empresa.com"
}
```

**Parámetros**:
- `reportType`: `"SEMANAL"` o `"MENSUAL"`
- `testMode` (opcional): `true` para enviar solo un reporte de prueba
- `testEmail` (opcional): Email destino en modo prueba

### `GET /api/cron/send-reports`
**Acceso**: Público (para servicios cron)

Endpoint para automatización. Verifica y envía reportes según configuración.

## Pruebas

### Script de Prueba Local

Genera reportes sin enviar correos:

```bash
npx tsx scripts/test-reports.ts
```

El script muestra:
- Estadísticas de cada usuario
- Comparación con períodos anteriores
- Top prioridades
- Resumen general

### Envío de Prueba desde UI

Desde `/admin/report-settings`:
1. Ingresa un correo electrónico de prueba
2. Haz clic en "Enviar Reporte Semanal" o "Enviar Reporte Mensual"
3. El reporte se enviará solo al correo especificado

## Períodos de Análisis

### Reporte Semanal
- **Período actual**: Semana anterior (lunes a domingo)
- **Período de comparación**: Semana previa a la anterior
- **Formato de fecha**: "Semana del 13 Ene al 19 Ene 2025"

### Reporte Mensual
- **Período actual**: Mes anterior completo
- **Período de comparación**: Mes previo al anterior
- **Formato de fecha**: "Enero 2025"

## Plantilla de Correo

Los correos incluyen:

### Header
- Logo de la empresa (Orca GRC)
- Título con gradiente azul/índigo
- Saludo personalizado con nombre del usuario

### Secciones
1. **Resumen General**: Tabla con todas las métricas principales
2. **Indicadores Clave**: Cards destacados para completadas y retrasadas
3. **Top Prioridades**: Lista de 5 prioridades principales
4. **Insight de Rendimiento**: Mensaje personalizado según tendencia
5. **Call to Action**: Botón para ver dashboard completo

### Footer
- Branding: "Sistema de Prioridades - Orca GRC"
- Mensaje de correo automático

## Consideraciones Técnicas

### Rendimiento
- Los reportes se generan de forma asíncrona
- Cada usuario se procesa individualmente
- Se registra el estado de cada envío (éxito/error)

### Seguridad
- Endpoint cron es público pero solo ejecuta según configuración
- Endpoints de configuración solo accesibles por ADMIN
- Modo de prueba previene envíos masivos accidentales

### Manejo de Errores
- Si falla el envío a un usuario, continúa con los demás
- Se registran todos los errores con detalles
- La fecha de último envío solo se actualiza si hubo éxitos

### Base de Datos
- La configuración se guarda en la colección `systemsettings`
- Solo puede existir un documento de configuración
- Se crea automáticamente con valores por defecto si no existe

## Valores por Defecto

```javascript
{
  reportFrequency: 'NINGUNO',
  weeklyReportDay: 1,        // Lunes
  weeklyReportHour: 9,       // 9 AM
  monthlyReportDay: 1,       // Día 1 del mes
  monthlyReportHour: 9,      // 9 AM
  emailSubjectPrefix: '📊 Reporte de Rendimiento',
  isActive: true
}
```

## Solución de Problemas

### Los reportes no se envían automáticamente
1. Verifica que `isActive` esté en `true`
2. Confirma que `reportFrequency` no sea `NINGUNO`
3. Revisa que el cron job externo esté activo
4. Verifica los logs del servidor para errores

### Error al enviar correos
1. Verifica las credenciales de correo en `.env`:
   - `EMAIL_USERNAME`
   - `EMAIL_PASSWORD`
2. Prueba el envío con el script `scripts/test-email.ts`
3. Revisa que el servidor SMTP esté accesible

### Estadísticas incorrectas
1. Verifica que las prioridades tengan fechas correctas
2. Confirma que las horas estén registradas en las tareas
3. Ejecuta `scripts/test-reports.ts` para ver datos en consola

## Mejoras Futuras

Posibles extensiones del sistema:
- [ ] Reportes personalizados por iniciativa estratégica
- [ ] Comparación de rendimiento entre equipos
- [ ] Gráficos integrados en el correo
- [ ] Exportación de reportes a PDF
- [ ] Configuración de umbrales de alerta
- [ ] Reportes trimestrales y anuales
- [ ] Dashboard de análisis histórico
- [ ] Notificaciones por Slack/Teams

## Soporte

Para reportar problemas o sugerencias:
- Revisa los logs del servidor
- Ejecuta el script de prueba local
- Contacta al administrador del sistema
