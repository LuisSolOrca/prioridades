# Sistema de Gestión de KPIs

## Descripción General

El sistema de gestión de KPIs (Key Performance Indicators) permite a las organizaciones definir, rastrear y analizar indicadores clave de rendimiento alineados a iniciativas estratégicas.

## Características Principales

### 1. Definición de KPIs

Cada KPI incluye:

- **Información básica**
  - Nombre del KPI
  - Descripción
  - Objetivo estratégico al que contribuye
  - Iniciativa estratégica asociada

- **Configuración**
  - Unidad de medida (%, $, unidades, etc.)
  - Periodicidad (diaria, semanal, mensual, trimestral, anual)
  - Responsable (owner del KPI)
  - Tipo de KPI (eficiencia, eficacia, calidad, riesgo, financiero, operativo)

- **Fórmula y fuente de datos**
  - Fórmula de cálculo (usando hot-formula-parser)
  - Fuente de datos: MANUAL (actualmente implementado)

- **Metas y tolerancias**
  - Meta (target)
  - Mínimo aceptable
  - Umbral de alerta

- **Categorización**
  - Etiquetas personalizadas (OKR, área, proceso, departamento, producto)

### 2. Ciclo de Vida del KPI

Los KPIs pasan por diferentes estados:

1. **BORRADOR**: KPI creado pero no revisado
2. **EN_REVISION**: KPI enviado a revisión
3. **APROBADO**: KPI aprobado pero no activo
4. **ACTIVO**: KPI en uso activo para tracking
5. **INACTIVO**: KPI desactivado temporalmente
6. **ARCHIVADO**: KPI archivado permanentemente

**Flujo de aprobación:**
```
BORRADOR → EN_REVISION → APROBADO → ACTIVO
```

Solo los administradores pueden mover KPIs entre estados.

### 3. Sistema de Versionado

Cada cambio significativo crea una nueva versión:

- Cambios en la fórmula de cálculo
- Modificaciones a la meta (target)
- Ajustes en las tolerancias

Cada versión registra:
- Número de versión
- Fecha del cambio
- Usuario que realizó el cambio
- Descripción de los cambios
- Valores históricos (fórmula, meta, tolerancia)

### 4. Editor de Fórmulas

El sistema incluye un editor WYSIWYG para fórmulas con:

- **Completado de código**: Sugerencias de funciones y operadores
- **Validación en tiempo real**: Verifica sintaxis de la fórmula
- **Funciones soportadas** (vía hot-formula-parser):
  - SUM(A, B, C): Suma de valores
  - AVERAGE(A, B, C): Promedio
  - MAX(A, B, C): Valor máximo
  - MIN(A, B, C): Valor mínimo
  - IF(condición, valor_si_verdadero, valor_si_falso): Condicional
  - ABS(A): Valor absoluto
  - ROUND(A, decimales): Redondear
  - SQRT(A): Raíz cuadrada
  - POW(A, exponente): Potencia

- **Operadores soportados**: +, -, *, /, %, ()

### 5. Registro Manual de Valores

Los usuarios pueden registrar valores para KPIs activos:

- Especificar el valor numérico
- Definir período (fecha inicio y fin)
- Agregar notas u observaciones
- El sistema calcula automáticamente si se proporcionan variables para la fórmula

**Estados de valores:**
- PRELIMINAR: Valor recién registrado
- CONFIRMADO: Valor confirmado por el usuario
- REVISADO: Valor revisado
- APROBADO: Valor aprobado por administrador

### 6. Seguimiento y Análisis

El sistema muestra automáticamente el estado del valor respecto a las metas:

- **En meta**: Valor ≥ target (verde)
- **En alerta**: Valor ≥ umbral de alerta pero < target (amarillo)
- **Por debajo**: Valor ≥ mínimo aceptable pero < umbral (naranja)
- **Crítico**: Valor < mínimo aceptable (rojo)

## Estructura de Base de Datos

### Modelo KPI

```typescript
{
  name: string,
  description: string,
  strategicObjective: string,
  initiativeId: ObjectId, // Ref: StrategicInitiative
  unit: string,
  periodicity: 'DIARIA' | 'SEMANAL' | 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL',
  responsible: ObjectId, // Ref: User
  formula: string,
  dataSource: 'MANUAL',
  target: number,
  tolerance: {
    minimum: number,
    warningThreshold: number
  },
  kpiType: 'EFICIENCIA' | 'EFICACIA' | 'CALIDAD' | 'RIESGO' | 'FINANCIERO' | 'OPERATIVO',
  tags: [{ category: string, value: string }],
  status: 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'ACTIVO' | 'INACTIVO' | 'ARCHIVADO',
  currentVersion: number,
  versions: [IKPIVersion],
  createdBy: ObjectId,
  isActive: boolean
}
```

### Modelo KPIValue

```typescript
{
  kpiId: ObjectId, // Ref: KPI
  kpiVersion: number,
  value: number,
  calculatedValue: number,
  variables: Map<string, number>,
  periodStart: Date,
  periodEnd: Date,
  status: 'PRELIMINAR' | 'CONFIRMADO' | 'REVISADO' | 'APROBADO',
  registeredBy: ObjectId, // Ref: User
  registeredAt: Date,
  notes: string,
  approvedBy: ObjectId, // Ref: User
  approvedAt: Date
}
```

## API Endpoints

### KPIs

- `GET /api/kpis` - Listar KPIs (con filtros)
- `POST /api/kpis` - Crear nuevo KPI (solo ADMIN)
- `GET /api/kpis/[id]` - Obtener KPI por ID
- `PUT /api/kpis/[id]` - Actualizar KPI (solo ADMIN)
- `DELETE /api/kpis/[id]` - Archivar KPI (solo ADMIN)
- `POST /api/kpis/[id]/review` - Marcar KPI como EN_REVISION (solo ADMIN)
- `POST /api/kpis/[id]/approve` - Aprobar KPI (solo ADMIN)
- `POST /api/kpis/[id]/activate` - Activar KPI (solo ADMIN)

### Valores de KPI

- `GET /api/kpi-values` - Listar valores (con filtros)
- `POST /api/kpi-values` - Registrar nuevo valor
- `GET /api/kpi-values/[id]` - Obtener valor por ID
- `PUT /api/kpi-values/[id]` - Actualizar valor (solo PRELIMINAR)
- `DELETE /api/kpi-values/[id]` - Eliminar valor (solo PRELIMINAR)

## Páginas de Usuario

### Para Administradores

- `/admin/kpis` - Gestión de KPIs
  - Listar todos los KPIs
  - Filtrar por estado e iniciativa
  - Crear, editar y archivar KPIs
  - Gestionar ciclo de vida (revisar, aprobar, activar)

- `/admin/kpis/new` - Crear nuevo KPI
  - Formulario completo con validaciones
  - Editor de fórmulas con ayuda integrada
  - Gestión de etiquetas

### Para Todos los Usuarios

- `/kpi-tracking` - Seguimiento de KPIs
  - Ver KPIs activos
  - Registrar valores manuales
  - Ver historial de valores
  - Visualización de estado vs metas

## Permisos

- **Administradores (ADMIN)**:
  - Crear, editar y eliminar KPIs
  - Gestionar ciclo de vida de KPIs
  - Aprobar valores registrados
  - Acceso completo a todas las funcionalidades

- **Usuarios (USER)**:
  - Ver KPIs activos
  - Registrar valores para KPIs activos
  - Ver historial de valores
  - Editar/eliminar solo sus propios valores en estado PRELIMINAR

## Ejemplos de Uso

### Ejemplo 1: KPI de Tasa de Conversión

```
Nombre: Tasa de conversión de ventas
Objetivo estratégico: Incrementar ingresos en un 20%
Iniciativa: Generación de ingresos
Unidad: %
Periodicidad: Mensual
Fórmula: (ventas_cerradas / leads_totales) * 100
Meta: 15
Mínimo aceptable: 10
Umbral de alerta: 12
Tipo: EFICIENCIA
```

### Ejemplo 2: KPI de Satisfacción del Cliente

```
Nombre: NPS (Net Promoter Score)
Objetivo estratégico: Mejorar experiencia del cliente
Iniciativa: Calidad de servicio
Unidad: puntos
Periodicidad: Trimestral
Fórmula: ((promotores - detractores) / total_respuestas) * 100
Meta: 50
Mínimo aceptable: 30
Umbral de alerta: 40
Tipo: CALIDAD
```

## Mejoras Futuras

Las siguientes funcionalidades están previstas para futuras versiones:

1. **Fuentes de datos adicionales**:
   - Integración con APIs externas
   - Importación desde archivos
   - Conexión con sistemas internos

2. **Dashboards y visualizaciones**:
   - Gráficos de tendencia
   - Comparativas entre períodos
   - Tableros por iniciativa estratégica

3. **Alertas automáticas**:
   - Notificaciones cuando valores están en riesgo
   - Recordatorios de registro periódico
   - Alertas de KPIs sin valores recientes

4. **Reportes avanzados**:
   - Exportación a Excel/PDF
   - Reportes ejecutivos
   - Análisis de correlación entre KPIs

5. **Variables dinámicas**:
   - Definición de variables requeridas por fórmula
   - Validación de variables al registrar valores
   - Catálogo de variables reutilizables

## Solución de Problemas

### Error: "Solo se pueden registrar valores para KPIs activos"

**Solución**: Asegúrate de que el KPI haya pasado por todo el ciclo de aprobación (BORRADOR → EN_REVISION → APROBADO → ACTIVO).

### Error: "Ya existe un valor registrado para este período"

**Solución**: No se permiten valores duplicados para el mismo KPI y período. Edita el valor existente o usa un período diferente.

### Error en la fórmula

**Solución**:
- Verifica la sintaxis usando el validador en tiempo real
- Asegúrate de usar funciones soportadas
- Verifica que los paréntesis estén balanceados
- Las variables deben estar definidas al registrar valores

## Soporte

Para problemas o sugerencias con el sistema de KPIs, contacta al administrador del sistema.
