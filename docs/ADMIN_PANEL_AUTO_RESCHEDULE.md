# Panel de Admin - Auto-Reprogramación

## Acceso

**Ruta**: `/admin/auto-reschedule`

**Requisitos**:
- Usuario autenticado con rol `ADMIN`
- Navegación desde panel de usuarios: Click en botón "🔄 Auto-Reprogramación"

## Características del Panel

### 1. Tarjetas de Estadísticas

El panel muestra 4 tarjetas principales con estadísticas en tiempo real:

#### 🟠 Pendientes
- **Descripción**: Prioridades vencidas que aún están en estado `EN_TIEMPO`
- **Acción**: Estas son las que se reprogramarán cuando ejecutes manualmente o automáticamente
- **Color**: Naranja (⏰)

#### 🟣 Reprogramadas (7d)
- **Descripción**: Prioridades que fueron marcadas como `REPROGRAMADO` en los últimos 7 días
- **Función**: Muestra el historial reciente de prioridades originales reprogramadas
- **Color**: Púrpura (📋)

#### 🔵 Traídas (7d)
- **Descripción**: Nuevas prioridades creadas con `isCarriedOver: true` en los últimos 7 días
- **Función**: Son las copias nuevas creadas en la siguiente semana
- **Color**: Azul (🔄)

#### 🟢 Total Histórico
- **Descripción**: Total acumulado de todas las prioridades reprogramadas
- **Función**: Vista histórica del uso del sistema de auto-reprogramación
- **Color**: Verde (📊)

### 2. Botón de Ejecución Manual

**"▶️ Ejecutar Ahora"**

- **Ubicación**: Parte superior del panel, debajo de las estadísticas
- **Función**: Ejecuta inmediatamente la auto-reprogramación de todas las prioridades pendientes
- **Comportamiento**:
  - Muestra confirmación antes de ejecutar
  - Se deshabilita si no hay prioridades pendientes
  - Muestra spinner mientras ejecuta ("⏳ Ejecutando...")
  - Al completar, muestra alerta con resultados

**Confirmación**:
```
¿Estás seguro de que deseas ejecutar la auto-reprogramación ahora?
Esto reprogramará todas las prioridades vencidas en estado EN_TIEMPO.
```

**Resultados**:
- Tarjeta verde con estadísticas de ejecución
- Contador de exitosas vs. fallidas
- Detalles de cada prioridad procesada
- Enlaces a las prioridades originales y nuevas

### 3. Sistema de Pestañas

El panel incluye 4 pestañas para visualizar diferentes aspectos:

#### ⏰ Pendientes
- **Lista**: Prioridades vencidas que necesitan reprogramación
- **Información mostrada**:
  - Título de la prioridad
  - Usuario asignado (nombre y email)
  - Semana vencida (fechas)
  - Iniciativas asociadas (con colores)
  - Porcentaje de avance
- **Sin datos**: "🎉 No hay prioridades pendientes de reprogramar"

#### 📋 Reprogramadas
- **Lista**: Prioridades originales marcadas como `REPROGRAMADO` (últimos 7 días)
- **Información mostrada**:
  - Título con badge "REPROGRAMADO"
  - Usuario
  - Fecha y hora de reprogramación
  - Fondo púrpura suave
- **Sin datos**: "📋 No hay prioridades reprogramadas en los últimos 7 días"

#### 🔄 Traídas
- **Lista**: Copias nuevas creadas con `isCarriedOver: true` (últimos 7 días)
- **Información mostrada**:
  - Título con badge "🔄 Traída"
  - Usuario
  - Fecha y hora de creación
  - Semana actual (nueva semana asignada)
  - Porcentaje de avance (debería ser 0%)
  - Fondo azul suave
- **Sin datos**: "🔄 No hay prioridades traídas en los últimos 7 días"

#### 📝 Actividad
- **Lista**: Comentarios del sistema sobre reprogramaciones automáticas (últimos 7 días)
- **Información mostrada**:
  - Ícono de robot 🤖
  - Título de la prioridad
  - Texto completo del comentario del sistema
  - Fecha y hora del comentario
- **Sin datos**: "📝 No hay actividad reciente"

## Flujo de Uso

### Ejecución Manual

1. **Acceder al panel**
   ```
   Admin Panel > Botón "🔄 Auto-Reprogramación"
   ```

2. **Revisar estadísticas**
   - Verificar cuántas prioridades están pendientes
   - Revisar actividad reciente

3. **Ver detalles de pendientes**
   - Ir a pestaña "⏰ Pendientes"
   - Revisar lista de prioridades que serán reprogramadas

4. **Ejecutar reprogramación**
   - Click en "▶️ Ejecutar Ahora"
   - Confirmar acción
   - Esperar resultado

5. **Verificar resultados**
   - Ver tarjeta verde con estadísticas
   - Revisar lista de prioridades procesadas
   - Verificar en pestañas "Reprogramadas" y "Traídas"

### Monitoreo

1. **Vista diaria**
   - Acceder al panel cada lunes para ver prioridades pendientes
   - Verificar que la ejecución automática está funcionando

2. **Vista semanal**
   - Revisar pestaña "Actividad" para ver log de reprogramaciones
   - Verificar que no hay errores acumulados

3. **Vista mensual**
   - Revisar "Total Histórico" para análisis de tendencias
   - Identificar usuarios que frecuentemente tienen prioridades reprogramadas

## API Endpoints Utilizados

### GET `/api/priorities/auto-reschedule/stats`
- **Función**: Obtiene estadísticas y listas para el panel
- **Auth**: Requiere rol ADMIN
- **Respuesta**: Objeto con todas las estadísticas y listas

### POST `/api/priorities/auto-reschedule`
- **Función**: Ejecuta la reprogramación manual
- **Auth**: No requiere (pero recomendado limitar a admins)
- **Respuesta**: Resultados detallados de la ejecución

## Casos de Uso

### Caso 1: Fin de Semana
**Escenario**: Es lunes y quieres asegurarte de que todas las prioridades de la semana pasada se reprogramaron.

**Pasos**:
1. Acceder al panel de auto-reprogramación
2. Verificar tarjeta "Pendientes" - debería estar en 0
3. Revisar pestaña "Traídas" para ver qué se reprogramó el fin de semana
4. Si hay pendientes, ejecutar manualmente

### Caso 2: Usuario Reporta Problema
**Escenario**: Un usuario reporta que su prioridad vencida no se reprogramó automáticamente.

**Pasos**:
1. Acceder al panel
2. Ir a pestaña "Pendientes" y buscar la prioridad
3. Si está en la lista:
   - Verificar que tenga estado `EN_TIEMPO`
   - Ejecutar reprogramación manual
4. Si no está en la lista:
   - Verificar en "Reprogramadas" si ya se procesó
   - Buscar en "Actividad" comentarios relacionados

### Caso 3: Análisis de Tendencias
**Escenario**: Quieres analizar cuántas prioridades se están reprogramando semanalmente.

**Pasos**:
1. Acceder al panel cada lunes
2. Anotar número de "Pendientes" antes de ejecutar
3. Revisar "Total Histórico" para tendencia general
4. Exportar o analizar usuarios en pestaña "Reprogramadas"

## Seguridad

- ✅ Solo usuarios ADMIN pueden acceder
- ✅ Redirige a `/dashboard` si no es admin
- ✅ Redirige a `/login` si no está autenticado
- ✅ Validación en el backend de todos los endpoints

## Mantenimiento

### Limpieza de Datos Antiguos
El panel muestra datos de los últimos 7 días. Para ver datos más antiguos, necesitas:
- Consultar directamente la base de datos
- Crear reportes personalizados
- Exportar usando el endpoint de estadísticas con filtros personalizados

### Performance
- Las consultas están optimizadas con índices
- Límite de 50 prioridades por pestaña
- Uso de `.lean()` para optimización de memoria

## Troubleshooting

### Problema: No aparecen prioridades pendientes pero debería haber
**Solución**:
1. Verificar que las prioridades tienen estado `EN_TIEMPO` (no `EN_RIESGO`, `BLOQUEADO`, etc.)
2. Verificar que `weekEnd` es anterior a hoy
3. Verificar que no fueron reprogramadas previamente (`status !== 'REPROGRAMADO'`)

### Problema: Ejecución manual falla
**Solución**:
1. Verificar logs del servidor
2. Verificar que MongoDB esté conectado
3. Verificar que el modelo Comment existe (se usa para registrar actividad)
4. Revisar tarjeta de resultados para ver errores específicos

### Problema: No se ven comentarios en pestaña "Actividad"
**Solución**:
1. Verificar que los comentarios del sistema se están creando
2. Verificar que tienen `isSystemComment: true`
3. Verificar que el texto contiene "reprogramada automáticamente"

## Próximos Pasos

Posibles mejoras para el panel:

1. **Filtros avanzados**: Por usuario, iniciativa, rango de fechas
2. **Exportar a Excel**: Descargar estadísticas y listas
3. **Gráficas**: Visualización de tendencias en el tiempo
4. **Notificaciones**: Enviar email a admins cuando hay muchas pendientes
5. **Configuración**: Permitir deshabilitar auto-reprogramación por usuario
6. **Logs detallados**: Historial completo de ejecuciones con timestamps
