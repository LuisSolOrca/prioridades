# Funciones del Sistema para KPIs

## Descripción General

Las **Funciones del Sistema** permiten acceder a datos reales de la aplicación directamente en las fórmulas de KPIs. Esto elimina la necesidad de ingresar datos manualmente y permite crear KPIs dinámicos que se calculan automáticamente basándose en el estado actual del sistema.

## Funciones Disponibles

### 1. COUNT_PRIORITIES

Cuenta el número de prioridades que cumplen ciertos criterios.

**Sintaxis:**
```
COUNT_PRIORITIES()
COUNT_PRIORITIES(filtros)
```

**Filtros disponibles:**
- `status`: Estado de la prioridad ("EN_TIEMPO", "EN_RIESGO", "BLOQUEADO", "COMPLETADO", "REPROGRAMADO")
- `type`: Tipo de prioridad ("ESTRATEGICA", "OPERATIVA")
- `userId`: ID del usuario (string)
- `initiativeId`: ID de la iniciativa estratégica (string)
- `projectId`: ID del proyecto (string)
- `clientId`: ID del cliente (string)
- `isCarriedOver`: Si fue reprogramada (boolean)
- `weekStart`: Fecha de inicio de semana (ISO string)
- `weekEnd`: Fecha de fin de semana (ISO string)
- `completionMin`: Porcentaje mínimo de completitud (0-100)
- `completionMax`: Porcentaje máximo de completitud (0-100)

**Ejemplos:**
```javascript
// Todas las prioridades
COUNT_PRIORITIES()

// Prioridades completadas
COUNT_PRIORITIES({status: "COMPLETADO"})

// Prioridades en riesgo de un usuario
COUNT_PRIORITIES({userId: "507f1f77bcf86cd799439011", status: "EN_RIESGO"})

// Prioridades estratégicas completadas
COUNT_PRIORITIES({type: "ESTRATEGICA", status: "COMPLETADO"})

// Prioridades con más del 80% de completitud
COUNT_PRIORITIES({completionMin: 80})
```

---

### 2. SUM_PRIORITIES

Suma un campo numérico de las prioridades que cumplen ciertos criterios.

**Sintaxis:**
```
SUM_PRIORITIES(campo, filtros)
```

**Campos disponibles:**
- `completionPercentage`: Porcentaje de completitud (0-100)

**Ejemplos:**
```javascript
// Suma total de completitud de todas las prioridades
SUM_PRIORITIES("completionPercentage")

// Suma de completitud solo de prioridades completadas
SUM_PRIORITIES("completionPercentage", {status: "COMPLETADO"})

// Suma de completitud de prioridades de un usuario
SUM_PRIORITIES("completionPercentage", {userId: "507f1f77bcf86cd799439011"})
```

---

### 3. AVG_PRIORITIES

Calcula el promedio de un campo numérico de las prioridades.

**Sintaxis:**
```
AVG_PRIORITIES(campo, filtros)
```

**Ejemplos:**
```javascript
// Promedio de completitud general
AVG_PRIORITIES("completionPercentage")

// Promedio de completitud de prioridades completadas
AVG_PRIORITIES("completionPercentage", {status: "COMPLETADO"})

// Promedio de completitud por iniciativa
AVG_PRIORITIES("completionPercentage", {initiativeId: "507f1f77bcf86cd799439011"})
```

---

### 4. COUNT_MILESTONES

Cuenta hitos que cumplen ciertos criterios.

**Sintaxis:**
```
COUNT_MILESTONES()
COUNT_MILESTONES(filtros)
```

**Filtros disponibles:**
- `userId`: ID del usuario (string)
- `projectId`: ID del proyecto (string)
- `isCompleted`: Si está completado (boolean)
- `dueDateStart`: Fecha de vencimiento mínima (ISO string)
- `dueDateEnd`: Fecha de vencimiento máxima (ISO string)

**Ejemplos:**
```javascript
// Todos los hitos
COUNT_MILESTONES()

// Hitos completados
COUNT_MILESTONES({isCompleted: true})

// Hitos de un proyecto
COUNT_MILESTONES({projectId: "507f1f77bcf86cd799439011"})

// Hitos pendientes de este mes
COUNT_MILESTONES({
  isCompleted: false,
  dueDateStart: "2025-01-01",
  dueDateEnd: "2025-01-31"
})
```

---

### 5. COUNT_PROJECTS

Cuenta proyectos que cumplen ciertos criterios.

**Sintaxis:**
```
COUNT_PROJECTS()
COUNT_PROJECTS(filtros)
```

**Filtros disponibles:**
- `isActive`: Si está activo (boolean)
- `projectManagerId`: ID del gerente del proyecto (string)

**Ejemplos:**
```javascript
// Todos los proyectos
COUNT_PROJECTS()

// Proyectos activos
COUNT_PROJECTS({isActive: true})

// Proyectos de un gerente específico
COUNT_PROJECTS({projectManagerId: "507f1f77bcf86cd799439011"})
```

---

### 6. COUNT_USERS

Cuenta usuarios que cumplen ciertos criterios.

**Sintaxis:**
```
COUNT_USERS()
COUNT_USERS(filtros)
```

**Filtros disponibles:**
- `role`: Rol del usuario ("ADMIN", "USER")
- `area`: Área del usuario (string)
- `isActive`: Si está activo (boolean)
- `isAreaLeader`: Si es líder de área (boolean)

**Ejemplos:**
```javascript
// Todos los usuarios
COUNT_USERS()

// Usuarios de Tecnología
COUNT_USERS({area: "Tecnología"})

// Líderes de área activos
COUNT_USERS({isAreaLeader: true, isActive: true})

// Administradores
COUNT_USERS({role: "ADMIN"})
```

---

### 7. COMPLETION_RATE

Calcula la tasa de cumplimiento de prioridades (porcentaje de completadas vs total).

**Sintaxis:**
```
COMPLETION_RATE()
COMPLETION_RATE(filtros)
```

**Ejemplos:**
```javascript
// Tasa de cumplimiento general
COMPLETION_RATE()

// Tasa de cumplimiento de un usuario
COMPLETION_RATE({userId: "507f1f77bcf86cd799439011"})

// Tasa de cumplimiento de una iniciativa
COMPLETION_RATE({initiativeId: "507f1f77bcf86cd799439011"})

// Tasa de cumplimiento semanal
COMPLETION_RATE({
  weekStart: "2025-01-13",
  weekEnd: "2025-01-17"
})
```

---

### 8. PERCENTAGE

Función auxiliar para calcular porcentajes.

**Sintaxis:**
```
PERCENTAGE(parte, total)
```

**Ejemplos:**
```javascript
// Porcentaje simple
PERCENTAGE(25, 100)  // = 25

// Combinado con otras funciones
PERCENTAGE(
  COUNT_PRIORITIES({status: "COMPLETADO"}),
  COUNT_PRIORITIES()
)
```

---

## Ejemplos de Casos de Uso Reales

### 1. Tasa de Cumplimiento por Área

```javascript
// KPI: Porcentaje de prioridades completadas en Tecnología
COMPLETION_RATE({userId: "ID_USER_TECNOLOGIA"})
```

### 2. Productividad por Proyecto

```javascript
// KPI: Promedio de completitud en prioridades de un proyecto
AVG_PRIORITIES("completionPercentage", {projectId: "ID_PROYECTO"})
```

### 3. Índice de Riesgo

```javascript
// KPI: Porcentaje de prioridades en riesgo
PERCENTAGE(
  COUNT_PRIORITIES({status: "EN_RIESGO"}),
  COUNT_PRIORITIES()
)
```

### 4. Eficiencia de Hitos

```javascript
// KPI: Ratio de hitos completados vs totales
PERCENTAGE(
  COUNT_MILESTONES({isCompleted: true}),
  COUNT_MILESTONES()
)
```

### 5. Velocidad de Equipo

```javascript
// KPI: Prioridades completadas por persona
COUNT_PRIORITIES({status: "COMPLETADO"}) / COUNT_USERS({area: "Tecnología"})
```

### 6. Índice de Reprogramación

```javascript
// KPI: Porcentaje de prioridades que han sido reprogramadas
PERCENTAGE(
  COUNT_PRIORITIES({isCarriedOver: true}),
  COUNT_PRIORITIES()
)
```

### 7. Tasa de Bloqueo

```javascript
// KPI: Porcentaje de prioridades bloqueadas
PERCENTAGE(
  COUNT_PRIORITIES({status: "BLOQUEADO"}),
  COUNT_PRIORITIES()
)
```

### 8. Carga de Trabajo

```javascript
// KPI: Prioridades activas por usuario
(COUNT_PRIORITIES({status: "EN_TIEMPO"}) + COUNT_PRIORITIES({status: "EN_RIESGO"})) / COUNT_USERS({isActive: true})
```

---

## Combinación con Variables Manuales

Puedes combinar funciones del sistema con variables manuales:

```javascript
// KPI: ROI de prioridades completadas
(IngresoGenerado - CostoTotal) / COUNT_PRIORITIES({status: "COMPLETADO"})

// Variables manuales:
// - IngresoGenerado (número)
// - CostoTotal (número)
```

---

## Notas Importantes

1. **Rendimiento**: Las funciones del sistema consultan la base de datos en tiempo real, por lo que pueden tener un ligero impacto en el rendimiento para datasets muy grandes.

2. **Filtros de Fecha**: Las fechas deben estar en formato ISO 8601 (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss.sssZ).

3. **IDs**: Los filtros por ID (userId, projectId, etc.) requieren el ObjectId completo de MongoDB.

4. **Mayúsculas**: Los nombres de funciones deben estar en MAYÚSCULAS.

5. **Sintaxis de Filtros**: Los filtros se pasan como objetos JavaScript: `{key: "value"}`. Los strings van entre comillas dobles.

---

## Solución de Problemas

### Error: "Función no reconocida"
- Verifica que el nombre de la función esté en MAYÚSCULAS
- Asegúrate de que la función esté en la lista de funciones soportadas

### Error: "Filtro inválido"
- Verifica la sintaxis del objeto de filtros: `{key: "value"}`
- Los strings deben ir entre comillas dobles
- Los booleanos no llevan comillas: `{isActive: true}`

### Resultado inesperado (0 o muy bajo)
- Verifica que los IDs sean correctos
- Confirma que existen datos que cumplan los criterios
- Revisa los valores de los filtros (fechas, estados, etc.)

---

## Próximas Funciones (En Desarrollo)

- `GET_PRIORITIES`: Obtener array de prioridades para procesamiento avanzado
- `GET_MILESTONES`: Obtener array de hitos
- `GET_PROJECTS`: Obtener array de proyectos
- Soporte para agregaciones más complejas
- Filtros por rangos de fechas relativos (últimos 30 días, este mes, etc.)
