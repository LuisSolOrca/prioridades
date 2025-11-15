import jsPDF from 'jspdf';

// Funciones de Excel disponibles (importadas desde el componente)
const EXCEL_FUNCTIONS_DATA = `
## Funciones de Excel Soportadas

El sistema soporta 382 funciones estándar de Excel a través de la librería hot-formula-parser.
Estas funciones se pueden combinar con las Funciones del Sistema para crear fórmulas complejas.

### Categorías de Funciones

#### [MATEMATICAS] Matemáticas y Trigonométricas
ABS, ACOS, ACOSH, ACOT, ACOTH, ASIN, ASINH, ATAN, ATAN2, ATANH, CEILING, COS, COSH, COT, COTH, CSC, CSCH, DEGREES, EVEN, EXP, FACT, FLOOR, GCD, INT, LCM, LN, LOG, LOG10, MOD, MROUND, ODD, PI, POWER, PRODUCT, QUOTIENT, RADIANS, RAND, RANDBETWEEN, ROUND, ROUNDDOWN, ROUNDUP, SEC, SECH, SIGN, SIN, SINH, SQRT, SQRTPI, SUM, SUMIF, SUMIFS, SUMPRODUCT, SUMSQ, SUMX2MY2, SUMX2PY2, SUMXMY2, TAN, TANH, TRUNC

#### [ESTADISTICAS] Estadísticas
AVEDEV, AVERAGE, AVERAGEA, AVERAGEIF, AVERAGEIFS, BINOM.DIST, BINOMDIST, CORREL, COUNT, COUNTA, COUNTBLANK, COUNTIF, COUNTIFS, COVARIANCE.P, COVARIANCE.S, DEVSQ, EXPON.DIST, EXPONDIST, FISHER, FISHERINV, FORECAST, FREQUENCY, GAMMA, GAMMA.DIST, GAMMADIST, GAMMA.INV, GAMMAINV, GAMMALN, GAUSS, GEOMEAN, HARMEAN, HYPGEOM.DIST, HYPGEOMDIST, INTERCEPT, KURT, LARGE, LOGNORM.DIST, LOGNORMDIST, LOGNORM.INV, LOGNORMINV, MAX, MAXA, MAXIFS, MEDIAN, MIN, MINA, MINIFS, MODE, MODE.MULT, MODE.SNGL, NEGBINOM.DIST, NEGBINOMDIST, NORM.DIST, NORMDIST, NORM.INV, NORMINV, NORM.S.DIST, NORMSDIST, NORM.S.INV, NORMSINV, PEARSON, PERCENTILE, PERCENTILE.EXC, PERCENTILE.INC, PERCENTRANK, PERCENTRANK.EXC, PERCENTRANK.INC, PERMUT, PERMUTATIONA, PHI, POISSON, POISSON.DIST, PROB, QUARTILE, QUARTILE.EXC, QUARTILE.INC, RANK, RANK.AVG, RANK.EQ, RSQ, SKEW, SKEW.P, SLOPE, SMALL, STANDARDIZE, STDEV, STDEV.P, STDEV.S, STDEVA, STDEVP, STDEVPA, STDEVS, STEYX, T.DIST, T.DIST.2T, T.DIST.RT, T.INV, T.INV.2T, TDIST, TDIST2T, TDISTRT, TINV, TINV2T, TREND, TRIMMEAN, VAR.P, VAR.S, VARA, VARP, VARPA, VARS, WEIBULL.DIST, WEIBULLDIST

#### [LOGICAS] Lógicas
AND, FALSE, IF, IFERROR, IFNA, IFS, NOT, OR, SWITCH, TRUE, XOR

#### [TEXTO] Texto
CHAR, CLEAN, CODE, CONCATENATE, EXACT, FIND, LEFT, LEN, LOWER, MID, PROPER, REPLACE, REPT, RIGHT, SEARCH, SUBSTITUTE, T, TEXT, TRIM, UNICHAR, UNICODE, UPPER, VALUE

#### [FECHAS] Fechas y Horas
DATE, DATEDIF, DATEVALUE, DAY, DAYS, DAYS360, EDATE, EOMONTH, HOUR, ISOWEEKNUM, MINUTE, MONTH, NETWORKDAYS, NOW, SECOND, TIME, TIMEVALUE, TODAY, WEEKDAY, WEEKNUM, WORKDAY, YEAR, YEARFRAC

#### [BUSQUEDA] Búsqueda y Referencia
CHOOSE, COLUMN, COLUMNS, HLOOKUP, INDEX, LOOKUP, MATCH, ROW, ROWS, VLOOKUP

#### [FINANZAS] Financieras
ACCRINT, CUMIPMT, CUMPRINC, DB, DDB, DOLLARDE, DOLLARFR, EFFECT, FV, FVSCHEDULE, IPMT, IRR, ISPMT, MIRR, NOMINAL, NPER, NPV, PMT, PPMT, PV, RATE, RRI, SLN, SYD, TBILLEQ, TBILLPRICE, TBILLYIELD, XIRR, XNPV

#### [DISTRIBUCIONES] Distribuciones
BETA.DIST, BETADIST, BETA.INV, BETAINV, CHISQ.DIST, CHISQ.DIST.RT, CHISQ.INV, CHISQ.INV.RT, CONFIDENCE, CONFIDENCE.NORM, CONFIDENCE.T, F.DIST, F.DIST.RT, F.INV, F.INV.RT, FDIST, FDISTRT, FINV, FINVRT

#### [UTILIDADES] Utilidades
ARRAYTOTEXT, BASE, CELL, DECIMAL, DELTA, ERF, ERFC, GESTEP, ISBLANK, ISERR, ISERROR, ISEVEN, ISLOGICAL, ISNA, ISNONTEXT, ISNUMBER, ISODD, ISREF, ISTEXT, N, NA, SERIESSUM, SHEET, SHEETS, TRANSPOSE, UNIQUE

### Ejemplos de Uso con Funciones de Excel

#### Combinando Funciones del Sistema con Excel

1. Promedio de completitud redondeado:
   ROUND(AVG_PRIORITIES("completionPercentage"), 2)

2. Máximo entre meta y resultado:
   MAX(50, COUNT_PRIORITIES({status: "COMPLETADO"}))

3. Calcular días desde inicio de año:
   DAYS(TODAY(), DATE(2025, 1, 1))

4. Condicional basado en tasa de cumplimiento:
   IF(COMPLETION_RATE() > 80, "Excelente", "Mejorar")

5. Suma condicional con múltiples criterios:
   SUMIF(GET_PRIORITIES(), ">50")

6. Promedio móvil:
   AVERAGE(
     COUNT_PRIORITIES({weekStart: "2025-01-01"}),
     COUNT_PRIORITIES({weekStart: "2025-01-08"}),
     COUNT_PRIORITIES({weekStart: "2025-01-15"})
   )

7. Desviación estándar de completitud:
   STDEV(AVG_PRIORITIES("completionPercentage"))

8. Búsqueda de valor:
   VLOOKUP("criterio", rango, 2, FALSE)

9. Texto concatenado con resultado:
   CONCATENATE("Tasa: ", ROUND(COMPLETION_RATE(), 2), "%")

10. Fecha de fin de mes:
    EOMONTH(TODAY(), 0)

### Funciones Matemáticas Comunes

• ABS(número): Valor absoluto
• ROUND(número, decimales): Redondear
• ROUNDUP(número, decimales): Redondear hacia arriba
• ROUNDDOWN(número, decimales): Redondear hacia abajo
• CEILING(número): Redondear al entero superior
• FLOOR(número): Redondear al entero inferior
• MOD(número, divisor): Módulo (resto)
• POWER(base, exponente): Potencia
• SQRT(número): Raíz cuadrada
• SUM(número1, número2, ...): Suma
• AVERAGE(número1, número2, ...): Promedio
• MAX(número1, número2, ...): Máximo
• MIN(número1, número2, ...): Mínimo
• COUNT(valor1, valor2, ...): Contar valores

### Funciones de Texto Comunes

• CONCATENATE(texto1, texto2, ...): Concatenar textos
• LEFT(texto, n): Primeros n caracteres
• RIGHT(texto, n): Últimos n caracteres
• MID(texto, inicio, largo): Substring
• LEN(texto): Longitud del texto
• UPPER(texto): Mayúsculas
• LOWER(texto): Minúsculas
• TRIM(texto): Eliminar espacios extra
• REPLACE(texto, inicio, largo, nuevo): Reemplazar
• SUBSTITUTE(texto, viejo, nuevo): Sustituir

### Funciones de Fecha Comunes

• TODAY(): Fecha actual
• NOW(): Fecha y hora actual
• DATE(año, mes, día): Crear fecha
• YEAR(fecha): Extraer año
• MONTH(fecha): Extraer mes
• DAY(fecha): Extraer día
• DAYS(fecha_fin, fecha_inicio): Diferencia en días
• EOMONTH(fecha, meses): Fin de mes
• EDATE(fecha, meses): Agregar meses
• WEEKDAY(fecha): Día de la semana
• WORKDAY(fecha_inicio, días): Días laborables

### Funciones Lógicas Comunes

• IF(condición, si_verdadero, si_falso): Condicional
• AND(condición1, condición2, ...): Y lógico
• OR(condición1, condición2, ...): O lógico
• NOT(condición): Negación
• IFERROR(valor, valor_si_error): Manejar errores
• IFS(condición1, valor1, condición2, valor2, ...): Múltiples condiciones

### Notas sobre Funciones de Excel

1. Los nombres de funciones son case-insensitive (SUM = sum = Sum)
2. Los parámetros se separan por comas
3. Los strings van entre comillas dobles: "texto"
4. Las fechas pueden ser strings en formato ISO: "2025-01-01"
5. Los números van sin comillas: 123.45
6. Los booleanos son: TRUE o FALSE (sin comillas)
7. Puedes anidar funciones: IF(SUM(1,2,3) > 5, "Mayor", "Menor")
8. Algunas funciones aceptan rangos de valores
9. Las funciones estadísticas ignoran valores de texto
10. Las funciones de fecha retornan números seriales internamente

### Diferencias con Excel Desktop

Algunas limitaciones comparado con Excel de escritorio:
• No se soportan referencias de celdas (A1, B2, etc.)
• No se soportan rangos con dos puntos (A1:A10)
• Algunas funciones avanzadas pueden no estar disponibles
• Los arrays se pasan como valores separados por comas
• No hay autocompletado de rangos

### Recursos Adicionales

Para más información sobre cada función específica, consulta la documentación de hot-formula-parser:
https://github.com/handsontable/formula-parser

Para equivalencias con Excel:
https://support.microsoft.com/es-es/office/funciones-de-excel-por-categoría
`;

const SYSTEM_DATA_DOCS = `
# Funciones del Sistema para KPIs

## Descripción General
Las Funciones del Sistema permiten acceder a datos reales de la aplicación directamente en las fórmulas de KPIs.

## Funciones Disponibles

### 1. COUNT_PRIORITIES
Cuenta el número de prioridades que cumplen ciertos criterios.

Sintaxis: COUNT_PRIORITIES() o COUNT_PRIORITIES(filtros)

Filtros disponibles:
• status: Estado de la prioridad (ej: "COMPLETADO", "EN_RIESGO", "BLOQUEADO", "EN_TIEMPO", "REPROGRAMADO")
• type: Tipo de prioridad
• userId: ID del usuario (ObjectId de MongoDB)
• initiativeId: ID de la iniciativa estratégica (ObjectId de MongoDB)
• projectId: ID del proyecto (ObjectId de MongoDB)
• clientId: ID del cliente (ObjectId de MongoDB)
• isCarriedOver: Prioridades arrastradas (true/false)
• weekStart: Fecha de inicio de semana (formato: "YYYY-MM-DD")
• weekEnd: Fecha de fin de semana (formato: "YYYY-MM-DD")
• completionMin: Porcentaje mínimo de completitud (0-100)
• completionMax: Porcentaje máximo de completitud (0-100)

Ejemplos:
  COUNT_PRIORITIES()
  COUNT_PRIORITIES({status: "COMPLETADO"})
  COUNT_PRIORITIES({userId: "123abc", status: "EN_RIESGO"})
  COUNT_PRIORITIES({completionMin: 50, completionMax: 100})
  COUNT_PRIORITIES({weekStart: "2025-01-01", weekEnd: "2025-01-31"})

### 2. SUM_PRIORITIES
Suma un campo numérico de las prioridades.

Sintaxis: SUM_PRIORITIES(campo, filtros)

Campos comunes: "completionPercentage"

Filtros disponibles (mismos que COUNT_PRIORITIES):
• status, type, userId, initiativeId, projectId

Ejemplos:
  SUM_PRIORITIES("completionPercentage")
  SUM_PRIORITIES("completionPercentage", {status: "COMPLETADO"})
  SUM_PRIORITIES("completionPercentage", {initiativeId: "abc123"})

### 3. AVG_PRIORITIES
Calcula el promedio de un campo numérico.

Sintaxis: AVG_PRIORITIES(campo, filtros)

Campos comunes: "completionPercentage"

Filtros disponibles (mismos que COUNT_PRIORITIES):
• status, type, userId, initiativeId, projectId

Ejemplos:
  AVG_PRIORITIES("completionPercentage")
  AVG_PRIORITIES("completionPercentage", {status: "COMPLETADO"})
  AVG_PRIORITIES("completionPercentage", {projectId: "xyz789"})

### 4. COUNT_MILESTONES
Cuenta hitos que cumplen ciertos criterios.

Sintaxis: COUNT_MILESTONES() o COUNT_MILESTONES(filtros)

Filtros disponibles:
• userId: ID del usuario (ObjectId de MongoDB)
• projectId: ID del proyecto (ObjectId de MongoDB)
• isCompleted: Hitos completados (true) o pendientes (false)
• dueDateStart: Fecha de vencimiento desde (formato: "YYYY-MM-DD")
• dueDateEnd: Fecha de vencimiento hasta (formato: "YYYY-MM-DD")

Ejemplos:
  COUNT_MILESTONES({isCompleted: true})
  COUNT_MILESTONES({projectId: "123"})
  COUNT_MILESTONES({dueDateStart: "2025-01-01", dueDateEnd: "2025-12-31"})
  COUNT_MILESTONES({userId: "abc123", isCompleted: false})

### 5. COUNT_PROJECTS
Cuenta proyectos.

Sintaxis: COUNT_PROJECTS() o COUNT_PROJECTS(filtros)

Filtros disponibles:
• isActive: Proyectos activos (true) o inactivos (false)
• projectManagerId: ID del gerente de proyecto (ObjectId de MongoDB)

Ejemplos:
  COUNT_PROJECTS({isActive: true})
  COUNT_PROJECTS({projectManagerId: "abc123"})
  COUNT_PROJECTS()

### 6. COUNT_USERS
Cuenta usuarios del sistema.

Sintaxis: COUNT_USERS() o COUNT_USERS(filtros)

Filtros disponibles:
• role: Rol del usuario (ej: "ADMIN", "USER")
• area: Área o departamento (ej: "Tecnología", "Ventas")
• isActive: Usuarios activos (true) o inactivos (false)
• isAreaLeader: Líderes de área (true/false)

Ejemplos:
  COUNT_USERS({area: "Tecnologia"})
  COUNT_USERS({role: "ADMIN"})
  COUNT_USERS({isAreaLeader: true})
  COUNT_USERS({area: "Ventas", isActive: true})

### 7. COMPLETION_RATE
Calcula la tasa de cumplimiento de prioridades (porcentaje completadas).

Sintaxis: COMPLETION_RATE() o COMPLETION_RATE(filtros)

Filtros disponibles (mismos que COUNT_PRIORITIES):
• userId, initiativeId, projectId, weekStart, weekEnd, etc.

Nota: Esta función automáticamente calcula el porcentaje de prioridades
con status "COMPLETADO" sobre el total de prioridades.

Ejemplos:
  COMPLETION_RATE()
  COMPLETION_RATE({userId: "123abc"})
  COMPLETION_RATE({initiativeId: "xyz789"})
  COMPLETION_RATE({weekStart: "2025-01-01", weekEnd: "2025-01-31"})

### 8. PERCENTAGE
Función auxiliar para calcular porcentajes.

Sintaxis: PERCENTAGE(parte, total)

Parámetros:
• parte: Valor parcial (número)
• total: Valor total (número)

Retorna: (parte / total) * 100

Ejemplo:
  PERCENTAGE(25, 100)  // = 25
  PERCENTAGE(COUNT_PRIORITIES({status: "COMPLETADO"}), COUNT_PRIORITIES())

## Casos de Uso Reales

1. Tasa de Cumplimiento por Usuario
   COMPLETION_RATE({userId: "ID_USER"})

2. Tasa de Cumplimiento por Iniciativa
   COMPLETION_RATE({initiativeId: "ID_INITIATIVE"})

3. Productividad por Proyecto
   AVG_PRIORITIES("completionPercentage", {projectId: "ID"})

4. Índice de Riesgo General
   PERCENTAGE(COUNT_PRIORITIES({status: "EN_RIESGO"}), COUNT_PRIORITIES())

5. Índice de Bloqueos por Área
   PERCENTAGE(
     COUNT_PRIORITIES({status: "BLOQUEADO", userId: "ID_USER"}),
     COUNT_PRIORITIES({userId: "ID_USER"})
   )

6. Eficiencia de Hitos
   PERCENTAGE(COUNT_MILESTONES({isCompleted: true}), COUNT_MILESTONES())

7. Velocidad de Equipo
   COUNT_PRIORITIES({status: "COMPLETADO"}) / COUNT_USERS({area: "Tech"})

8. Prioridades Completadas en el Mes Actual
   COUNT_PRIORITIES({
     status: "COMPLETADO",
     weekStart: "2025-01-01",
     weekEnd: "2025-01-31"
   })

9. Promedio de Completitud de Prioridades Activas
   AVG_PRIORITIES("completionPercentage", {
     status: "EN_TIEMPO"
   })

10. Tasa de Prioridades Arrastradas
    PERCENTAGE(
      COUNT_PRIORITIES({isCarriedOver: true}),
      COUNT_PRIORITIES()
    )

## Combinación de Filtros

Puedes combinar múltiples filtros para consultas más específicas:

Ejemplo 1: Prioridades completadas por usuario en una iniciativa
  COUNT_PRIORITIES({
    userId: "abc123",
    initiativeId: "xyz789",
    status: "COMPLETADO"
  })

Ejemplo 2: Tasa de cumplimiento en un rango de fechas
  COMPLETION_RATE({
    weekStart: "2025-01-01",
    weekEnd: "2025-03-31"
  })

Ejemplo 3: Hitos completados en un proyecto este año
  COUNT_MILESTONES({
    projectId: "proj123",
    isCompleted: true,
    dueDateStart: "2025-01-01",
    dueDateEnd: "2025-12-31"
  })

## Tipos de Datos

### Strings
Deben ir entre comillas dobles:
  {status: "COMPLETADO"}
  {area: "Tecnología"}

### Booleanos
Sin comillas, valores: true o false:
  {isActive: true}
  {isCompleted: false}

### Números
Sin comillas:
  {completionMin: 50}
  {completionMax: 100}

### Fechas
String en formato ISO 8601 (YYYY-MM-DD):
  {weekStart: "2025-01-01"}
  {dueDateEnd: "2025-12-31"}

## Notas Importantes

1. Las funciones del sistema consultan la base de datos en tiempo real
2. Las fechas deben estar en formato ISO 8601 (YYYY-MM-DD)
3. Los IDs (userId, projectId, etc.) requieren el ObjectId completo de MongoDB
4. Los nombres de funciones deben estar en MAYÚSCULAS
5. Los strings en filtros van entre comillas dobles
6. Los booleanos (true/false) van sin comillas
7. Puedes combinar múltiples filtros en una sola llamada
8. Los filtros son opcionales - llamar sin filtros retorna todos los registros
9. Las funciones son case-sensitive: usar MAYÚSCULAS
10. Los valores numéricos (completionMin, completionMax) están en porcentaje (0-100)

## Estados Disponibles para Prioridades

• EN_TIEMPO: Prioridad en tiempo
• EN_RIESGO: Prioridad en riesgo
• BLOQUEADO: Prioridad bloqueada
• COMPLETADO: Prioridad completada
• REPROGRAMADO: Prioridad reprogramada

## Roles de Usuario Disponibles

• ADMIN: Administrador del sistema
• USER: Usuario estándar
`;

export function generateSystemDataDocsPDF() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Título principal
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text('Referencia Completa de Funciones', margin, yPos);
  yPos += 10;

  // Subtítulo
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99); // gray-600
  doc.text('Sistema (8 funciones) + Excel (382 funciones)', margin, yPos);
  yPos += 15;

  // Combinar ambas documentaciones
  const fullDocs = SYSTEM_DATA_DOCS.trim() + '\n\n' + EXCEL_FUNCTIONS_DATA.trim();
  const lines = fullDocs.split('\n');

  for (const line of lines) {
    // Verificar si necesitamos nueva página
    if (yPos > pageHeight - margin - 10) {
      doc.addPage();
      yPos = margin;
    }

    if (line.startsWith('###')) {
      // Título nivel 3
      yPos += 5;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(line.substring(4), margin, yPos);
      yPos += 7;
    } else if (line.startsWith('##')) {
      // Título nivel 2
      yPos += 8;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(line.substring(3), margin, yPos);
      yPos += 8;
    } else if (line.startsWith('#')) {
      // Título nivel 1
      yPos += 10;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(line.substring(2), margin, yPos);
      yPos += 8;
    } else if (line.startsWith('  ')) {
      // Código con indentación
      doc.setFontSize(9);
      doc.setFont('courier', 'normal');
      doc.setTextColor(0, 0, 0);
      const codeLines = doc.splitTextToSize(line.trim(), contentWidth - 10);
      doc.text(codeLines, margin + 5, yPos);
      yPos += codeLines.length * 4;
    } else if (line.startsWith('•') || line.startsWith('-')) {
      // Lista con viñetas
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      const bulletText = line.substring(2);
      const textLines = doc.splitTextToSize(bulletText, contentWidth - 10);
      doc.text('•', margin + 2, yPos);
      doc.text(textLines, margin + 7, yPos);
      yPos += textLines.length * 5;
    } else if (line.trim()) {
      // Texto normal
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      const textLines = doc.splitTextToSize(line, contentWidth);
      doc.text(textLines, margin, yPos);
      yPos += textLines.length * 5;
    } else {
      // Línea vacía
      yPos += 3;
    }
  }

  // Pie de página en todas las páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text(
      `Pagina ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `Generado: ${new Date().toLocaleDateString('es-MX')}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  // Guardar el PDF
  doc.save('Referencia-Funciones-KPIs.pdf');
}
