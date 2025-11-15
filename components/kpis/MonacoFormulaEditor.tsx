'use client';

import { useEffect, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { extractVariablesFromFormula } from '@/lib/kpi-utils/formula-parser';

interface MonacoFormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
}

interface AutocompleteData {
  users: Array<{ id: string; name: string; email: string; area: string; label: string; value: string }>;
  projects: Array<{ id: string; name: string; label: string; value: string }>;
  initiatives: Array<{ id: string; name: string; label: string; value: string }>;
  clients: Array<{ id: string; name: string; label: string; value: string }>;
  areas: Array<{ label: string; value: string }>;
  statuses: Array<{ label: string; value: string; description: string }>;
  roles: Array<{ label: string; value: string; description: string }>;
  fields: Array<{ label: string; value: string; description: string }>;
}

// Definición de funciones del sistema con sus parámetros
const SYSTEM_FUNCTIONS = [
  {
    name: 'COUNT_PRIORITIES',
    signature: 'COUNT_PRIORITIES(filtros?)',
    description: 'Cuenta prioridades que cumplen ciertos criterios',
    documentation: `Cuenta el número de prioridades según los criterios especificados.

**Filtros disponibles:**
• status: Estado de la prioridad (usa autocompletado)
• type: Tipo de prioridad
• userName: Nombre del usuario (usa autocompletado)
• initiativeName: Nombre de iniciativa (usa autocompletado)
• projectName: Nombre del proyecto (usa autocompletado)
• clientName: Nombre del cliente (usa autocompletado)
• isCarriedOver: Prioridades arrastradas (true/false)
• weekStart: Fecha inicio "YYYY-MM-DD"
• weekEnd: Fecha fin "YYYY-MM-DD"
• completionMin: % mínimo (0-100)
• completionMax: % máximo (0-100)

**Ejemplos:**
COUNT_PRIORITIES()
COUNT_PRIORITIES({status: "COMPLETADO"})
COUNT_PRIORITIES({userName: "Juan Pérez", status: "EN_RIESGO"})
COUNT_PRIORITIES({initiativeName: "Generación de ingresos"})`,
    insertText: 'COUNT_PRIORITIES({})',
    detail: '🔌 Sistema',
    params: ['status', 'type', 'userName', 'initiativeName', 'projectName', 'clientName', 'isCarriedOver', 'weekStart', 'weekEnd', 'completionMin', 'completionMax']
  },
  {
    name: 'SUM_PRIORITIES',
    signature: 'SUM_PRIORITIES(campo, filtros?)',
    description: 'Suma un campo numérico de las prioridades',
    documentation: `Suma el valor de un campo numérico en las prioridades filtradas.

**Parámetros:**
• campo: "completionPercentage" (entre comillas)
• filtros: Objeto con filtros (opcional)

**Filtros disponibles:**
• status, userName, initiativeName, projectName, etc.

**Ejemplos:**
SUM_PRIORITIES("completionPercentage")
SUM_PRIORITIES("completionPercentage", {status: "COMPLETADO"})
SUM_PRIORITIES("completionPercentage", {userName: "María López"})`,
    insertText: 'SUM_PRIORITIES("completionPercentage", {})',
    detail: '🔌 Sistema',
    params: ['status', 'type', 'userName', 'initiativeName', 'projectName']
  },
  {
    name: 'AVG_PRIORITIES',
    signature: 'AVG_PRIORITIES(campo, filtros?)',
    description: 'Calcula el promedio de un campo numérico',
    documentation: `Calcula el promedio de un campo numérico en las prioridades filtradas.

**Parámetros:**
• campo: "completionPercentage" (entre comillas)
• filtros: Objeto con filtros (opcional)

**Ejemplos:**
AVG_PRIORITIES("completionPercentage")
AVG_PRIORITIES("completionPercentage", {status: "COMPLETADO"})
AVG_PRIORITIES("completionPercentage", {projectName: "Proyecto Alpha"})`,
    insertText: 'AVG_PRIORITIES("completionPercentage", {})',
    detail: '🔌 Sistema',
    params: ['status', 'type', 'userName', 'initiativeName', 'projectName']
  },
  {
    name: 'COUNT_MILESTONES',
    signature: 'COUNT_MILESTONES(filtros?)',
    description: 'Cuenta hitos que cumplen ciertos criterios',
    documentation: `Cuenta hitos según los criterios especificados.

**Filtros disponibles:**
• userName: Nombre del usuario (usa autocompletado)
• projectName: Nombre del proyecto (usa autocompletado)
• isCompleted: Hitos completados (true/false)
• dueDateStart: Fecha desde "YYYY-MM-DD"
• dueDateEnd: Fecha hasta "YYYY-MM-DD"

**Ejemplos:**
COUNT_MILESTONES({isCompleted: true})
COUNT_MILESTONES({projectName: "Proyecto Beta"})
COUNT_MILESTONES({userName: "Carlos Ruiz", isCompleted: false})`,
    insertText: 'COUNT_MILESTONES({})',
    detail: '🔌 Sistema',
    params: ['userName', 'projectName', 'isCompleted', 'dueDateStart', 'dueDateEnd']
  },
  {
    name: 'COUNT_PROJECTS',
    signature: 'COUNT_PROJECTS(filtros?)',
    description: 'Cuenta proyectos',
    documentation: `Cuenta proyectos según los criterios especificados.

**Filtros disponibles:**
• isActive: Proyectos activos (true/false)
• projectManagerName: Nombre del gerente (usa autocompletado)

**Ejemplos:**
COUNT_PROJECTS({isActive: true})
COUNT_PROJECTS({projectManagerName: "Ana García"})`,
    insertText: 'COUNT_PROJECTS({})',
    detail: '🔌 Sistema',
    params: ['isActive', 'projectManagerName']
  },
  {
    name: 'COUNT_USERS',
    signature: 'COUNT_USERS(filtros?)',
    description: 'Cuenta usuarios del sistema',
    documentation: `Cuenta usuarios según los criterios especificados.

**Filtros disponibles:**
• role: Rol del usuario (usa autocompletado)
• area: Área o departamento (usa autocompletado)
• isActive: Usuarios activos (true/false)
• isAreaLeader: Líderes de área (true/false)

**Ejemplos:**
COUNT_USERS({area: "Tecnología"})
COUNT_USERS({role: "ADMIN"})
COUNT_USERS({area: "Ventas", isActive: true})`,
    insertText: 'COUNT_USERS({})',
    detail: '🔌 Sistema',
    params: ['role', 'area', 'isActive', 'isAreaLeader']
  },
  {
    name: 'COMPLETION_RATE',
    signature: 'COMPLETION_RATE(filtros?)',
    description: 'Calcula tasa de cumplimiento (%)',
    documentation: `Calcula el porcentaje de prioridades completadas.

**Filtros disponibles:** (mismos que COUNT_PRIORITIES)
• userName, initiativeName, projectName, weekStart, weekEnd, etc.

**Ejemplos:**
COMPLETION_RATE()
COMPLETION_RATE({userName: "Pedro Sánchez"})
COMPLETION_RATE({initiativeName: "Eficiencia Operativa"})
COMPLETION_RATE({weekStart: "2025-01-01", weekEnd: "2025-01-31"})`,
    insertText: 'COMPLETION_RATE({})',
    detail: '🔌 Sistema',
    params: ['userName', 'initiativeName', 'projectName', 'weekStart', 'weekEnd', 'status']
  },
  {
    name: 'PERCENTAGE',
    signature: 'PERCENTAGE(parte, total)',
    description: 'Calcula porcentaje: (parte / total) * 100',
    documentation: `Función auxiliar para calcular porcentajes.

**Parámetros:**
• parte: Valor parcial (número)
• total: Valor total (número)

**Retorna:** (parte / total) * 100

**Ejemplo:**
PERCENTAGE(25, 100) // = 25
PERCENTAGE(COUNT_PRIORITIES({status: "COMPLETADO"}), COUNT_PRIORITIES())`,
    insertText: 'PERCENTAGE(, )',
    detail: '🔌 Sistema',
    params: []
  }
];

// Todas las funciones de Excel soportadas por hot-formula-parser (382 funciones únicas)
const EXCEL_FUNCTIONS = [
  { name: 'ABS', signature: 'ABS()', description: 'Función de Excel', insertText: 'ABS()', detail: '🔢 Matemáticas' },
  { name: 'ACCRINT', signature: 'ACCRINT()', description: 'Función de Excel', insertText: 'ACCRINT()', detail: '💰 Financieras' },
  { name: 'ACOS', signature: 'ACOS()', description: 'Función de Excel', insertText: 'ACOS()', detail: '📐 Trigonométricas' },
  { name: 'ACOSH', signature: 'ACOSH()', description: 'Función de Excel', insertText: 'ACOSH()', detail: '📐 Trigonométricas' },
  { name: 'ACOT', signature: 'ACOT()', description: 'Función de Excel', insertText: 'ACOT()', detail: '📐 Trigonométricas' },
  { name: 'ACOTH', signature: 'ACOTH()', description: 'Función de Excel', insertText: 'ACOTH()', detail: '📐 Trigonométricas' },
  { name: 'ADD', signature: 'ADD()', description: 'Función de Excel', insertText: 'ADD()', detail: '🔢 Matemáticas' },
  { name: 'AGGREGATE', signature: 'AGGREGATE()', description: 'Función de Excel', insertText: 'AGGREGATE()', detail: '📦 Otras' },
  { name: 'AND', signature: 'AND()', description: 'Función de Excel', insertText: 'AND()', detail: '🔀 Lógicas' },
  { name: 'ARABIC', signature: 'ARABIC()', description: 'Función de Excel', insertText: 'ARABIC()', detail: '📦 Otras' },
  { name: 'ARGS2ARRAY', signature: 'ARGS2ARRAY()', description: 'Función de Excel', insertText: 'ARGS2ARRAY()', detail: '📦 Otras' },
  { name: 'ASIN', signature: 'ASIN()', description: 'Función de Excel', insertText: 'ASIN()', detail: '📐 Trigonométricas' },
  { name: 'ASINH', signature: 'ASINH()', description: 'Función de Excel', insertText: 'ASINH()', detail: '📐 Trigonométricas' },
  { name: 'ATAN', signature: 'ATAN()', description: 'Función de Excel', insertText: 'ATAN()', detail: '📐 Trigonométricas' },
  { name: 'ATAN2', signature: 'ATAN2()', description: 'Función de Excel', insertText: 'ATAN2()', detail: '📐 Trigonométricas' },
  { name: 'ATANH', signature: 'ATANH()', description: 'Función de Excel', insertText: 'ATANH()', detail: '📐 Trigonométricas' },
  { name: 'AVEDEV', signature: 'AVEDEV()', description: 'Función de Excel', insertText: 'AVEDEV()', detail: '📊 Estadísticas' },
  { name: 'AVERAGE', signature: 'AVERAGE()', description: 'Función de Excel', insertText: 'AVERAGE()', detail: '📊 Estadísticas' },
  { name: 'AVERAGEA', signature: 'AVERAGEA()', description: 'Función de Excel', insertText: 'AVERAGEA()', detail: '📊 Estadísticas' },
  { name: 'AVERAGEIF', signature: 'AVERAGEIF()', description: 'Función de Excel', insertText: 'AVERAGEIF()', detail: '📊 Estadísticas' },
  { name: 'AVERAGEIFS', signature: 'AVERAGEIFS()', description: 'Función de Excel', insertText: 'AVERAGEIFS()', detail: '📊 Estadísticas' },
  { name: 'BASE', signature: 'BASE()', description: 'Función de Excel', insertText: 'BASE()', detail: '📦 Otras' },
  { name: 'BESSELI', signature: 'BESSELI()', description: 'Función de Excel', insertText: 'BESSELI()', detail: '⚙️ Ingeniería' },
  { name: 'BESSELJ', signature: 'BESSELJ()', description: 'Función de Excel', insertText: 'BESSELJ()', detail: '⚙️ Ingeniería' },
  { name: 'BESSELK', signature: 'BESSELK()', description: 'Función de Excel', insertText: 'BESSELK()', detail: '⚙️ Ingeniería' },
  { name: 'BESSELY', signature: 'BESSELY()', description: 'Función de Excel', insertText: 'BESSELY()', detail: '⚙️ Ingeniería' },
  { name: 'BETA.DIST', signature: 'BETA.DIST()', description: 'Función de Excel', insertText: 'BETA.DIST()', detail: '📈 Distribuciones' },
  { name: 'BETA.INV', signature: 'BETA.INV()', description: 'Función de Excel', insertText: 'BETA.INV()', detail: '📈 Distribuciones' },
  { name: 'BETADIST', signature: 'BETADIST()', description: 'Función de Excel', insertText: 'BETADIST()', detail: '📈 Distribuciones' },
  { name: 'BETAINV', signature: 'BETAINV()', description: 'Función de Excel', insertText: 'BETAINV()', detail: '📈 Distribuciones' },
  { name: 'BIN2DEC', signature: 'BIN2DEC()', description: 'Función de Excel', insertText: 'BIN2DEC()', detail: '⚙️ Ingeniería' },
  { name: 'BIN2HEX', signature: 'BIN2HEX()', description: 'Función de Excel', insertText: 'BIN2HEX()', detail: '⚙️ Ingeniería' },
  { name: 'BIN2OCT', signature: 'BIN2OCT()', description: 'Función de Excel', insertText: 'BIN2OCT()', detail: '⚙️ Ingeniería' },
  { name: 'BINOM.DIST', signature: 'BINOM.DIST()', description: 'Función de Excel', insertText: 'BINOM.DIST()', detail: '📈 Distribuciones' },
  { name: 'BINOM.DIST.RANGE', signature: 'BINOM.DIST.RANGE()', description: 'Función de Excel', insertText: 'BINOM.DIST.RANGE()', detail: '📈 Distribuciones' },
  { name: 'BINOM.INV', signature: 'BINOM.INV()', description: 'Función de Excel', insertText: 'BINOM.INV()', detail: '📈 Distribuciones' },
  { name: 'BINOMDIST', signature: 'BINOMDIST()', description: 'Función de Excel', insertText: 'BINOMDIST()', detail: '📈 Distribuciones' },
  { name: 'BITAND', signature: 'BITAND()', description: 'Función de Excel', insertText: 'BITAND()', detail: '⚙️ Ingeniería' },
  { name: 'BITLSHIFT', signature: 'BITLSHIFT()', description: 'Función de Excel', insertText: 'BITLSHIFT()', detail: '⚙️ Ingeniería' },
  { name: 'BITOR', signature: 'BITOR()', description: 'Función de Excel', insertText: 'BITOR()', detail: '⚙️ Ingeniería' },
  { name: 'BITRSHIFT', signature: 'BITRSHIFT()', description: 'Función de Excel', insertText: 'BITRSHIFT()', detail: '⚙️ Ingeniería' },
  { name: 'BITXOR', signature: 'BITXOR()', description: 'Función de Excel', insertText: 'BITXOR()', detail: '⚙️ Ingeniería' },
  { name: 'CEILING', signature: 'CEILING()', description: 'Función de Excel', insertText: 'CEILING()', detail: '🔢 Matemáticas' },
  { name: 'CEILINGMATH', signature: 'CEILINGMATH()', description: 'Función de Excel', insertText: 'CEILINGMATH()', detail: '🔢 Matemáticas' },
  { name: 'CEILINGPRECISE', signature: 'CEILINGPRECISE()', description: 'Función de Excel', insertText: 'CEILINGPRECISE()', detail: '🔢 Matemáticas' },
  { name: 'CHAR', signature: 'CHAR()', description: 'Función de Excel', insertText: 'CHAR()', detail: '📝 Texto' },
  { name: 'CHISQ.DIST', signature: 'CHISQ.DIST()', description: 'Función de Excel', insertText: 'CHISQ.DIST()', detail: '📈 Distribuciones' },
  { name: 'CHISQ.DIST.RT', signature: 'CHISQ.DIST.RT()', description: 'Función de Excel', insertText: 'CHISQ.DIST.RT()', detail: '📈 Distribuciones' },
  { name: 'CHISQ.INV', signature: 'CHISQ.INV()', description: 'Función de Excel', insertText: 'CHISQ.INV()', detail: '📈 Distribuciones' },
  { name: 'CHISQ.INV.RT', signature: 'CHISQ.INV.RT()', description: 'Función de Excel', insertText: 'CHISQ.INV.RT()', detail: '📈 Distribuciones' },
  { name: 'CHOOSE', signature: 'CHOOSE()', description: 'Función de Excel', insertText: 'CHOOSE()', detail: '🔧 Utilidades' },
  { name: 'CLEAN', signature: 'CLEAN()', description: 'Función de Excel', insertText: 'CLEAN()', detail: '📝 Texto' },
  { name: 'CODE', signature: 'CODE()', description: 'Función de Excel', insertText: 'CODE()', detail: '📝 Texto' },
  { name: 'COLUMN', signature: 'COLUMN()', description: 'Función de Excel', insertText: 'COLUMN()', detail: '🔧 Utilidades' },
  { name: 'COLUMNS', signature: 'COLUMNS()', description: 'Función de Excel', insertText: 'COLUMNS()', detail: '🔧 Utilidades' },
  { name: 'COMBIN', signature: 'COMBIN()', description: 'Función de Excel', insertText: 'COMBIN()', detail: '🔧 Utilidades' },
  { name: 'COMBINA', signature: 'COMBINA()', description: 'Función de Excel', insertText: 'COMBINA()', detail: '🔧 Utilidades' },
  { name: 'COMPLEX', signature: 'COMPLEX()', description: 'Función de Excel', insertText: 'COMPLEX()', detail: '⚙️ Ingeniería' },
  { name: 'CONCATENATE', signature: 'CONCATENATE()', description: 'Función de Excel', insertText: 'CONCATENATE()', detail: '📝 Texto' },
  { name: 'CONFIDENCE', signature: 'CONFIDENCE()', description: 'Función de Excel', insertText: 'CONFIDENCE()', detail: '📈 Distribuciones' },
  { name: 'CONFIDENCE.NORM', signature: 'CONFIDENCE.NORM()', description: 'Función de Excel', insertText: 'CONFIDENCE.NORM()', detail: '📈 Distribuciones' },
  { name: 'CONFIDENCE.T', signature: 'CONFIDENCE.T()', description: 'Función de Excel', insertText: 'CONFIDENCE.T()', detail: '📈 Distribuciones' },
  { name: 'CONVERT', signature: 'CONVERT()', description: 'Función de Excel', insertText: 'CONVERT()', detail: '⚙️ Ingeniería' },
  { name: 'CORREL', signature: 'CORREL()', description: 'Función de Excel', insertText: 'CORREL()', detail: '📊 Estadísticas' },
  { name: 'COS', signature: 'COS()', description: 'Función de Excel', insertText: 'COS()', detail: '📐 Trigonométricas' },
  { name: 'COSH', signature: 'COSH()', description: 'Función de Excel', insertText: 'COSH()', detail: '📐 Trigonométricas' },
  { name: 'COT', signature: 'COT()', description: 'Función de Excel', insertText: 'COT()', detail: '📐 Trigonométricas' },
  { name: 'COTH', signature: 'COTH()', description: 'Función de Excel', insertText: 'COTH()', detail: '📐 Trigonométricas' },
  { name: 'COUNT', signature: 'COUNT()', description: 'Función de Excel', insertText: 'COUNT()', detail: '📊 Estadísticas' },
  { name: 'COUNTA', signature: 'COUNTA()', description: 'Función de Excel', insertText: 'COUNTA()', detail: '📊 Estadísticas' },
  { name: 'COUNTBLANK', signature: 'COUNTBLANK()', description: 'Función de Excel', insertText: 'COUNTBLANK()', detail: '📊 Estadísticas' },
  { name: 'COUNTIF', signature: 'COUNTIF()', description: 'Función de Excel', insertText: 'COUNTIF()', detail: '📊 Estadísticas' },
  { name: 'COUNTIFS', signature: 'COUNTIFS()', description: 'Función de Excel', insertText: 'COUNTIFS()', detail: '📊 Estadísticas' },
  { name: 'COUNTIN', signature: 'COUNTIN()', description: 'Función de Excel', insertText: 'COUNTIN()', detail: '📊 Estadísticas' },
  { name: 'COUNTUNIQUE', signature: 'COUNTUNIQUE()', description: 'Función de Excel', insertText: 'COUNTUNIQUE()', detail: '📊 Estadísticas' },
  { name: 'COVARIANCE.P', signature: 'COVARIANCE.P()', description: 'Función de Excel', insertText: 'COVARIANCE.P()', detail: '📊 Estadísticas' },
  { name: 'COVARIANCE.S', signature: 'COVARIANCE.S()', description: 'Función de Excel', insertText: 'COVARIANCE.S()', detail: '📊 Estadísticas' },
  { name: 'CSC', signature: 'CSC()', description: 'Función de Excel', insertText: 'CSC()', detail: '📐 Trigonométricas' },
  { name: 'CSCH', signature: 'CSCH()', description: 'Función de Excel', insertText: 'CSCH()', detail: '📐 Trigonométricas' },
  { name: 'CUMIPMT', signature: 'CUMIPMT()', description: 'Función de Excel', insertText: 'CUMIPMT()', detail: '💰 Financieras' },
  { name: 'CUMPRINC', signature: 'CUMPRINC()', description: 'Función de Excel', insertText: 'CUMPRINC()', detail: '💰 Financieras' },
  { name: 'DATE', signature: 'DATE()', description: 'Función de Excel', insertText: 'DATE()', detail: '📅 Fechas' },
  { name: 'DATEVALUE', signature: 'DATEVALUE()', description: 'Función de Excel', insertText: 'DATEVALUE()', detail: '📅 Fechas' },
  { name: 'DAY', signature: 'DAY()', description: 'Función de Excel', insertText: 'DAY()', detail: '📅 Fechas' },
  { name: 'DAYS', signature: 'DAYS()', description: 'Función de Excel', insertText: 'DAYS()', detail: '📅 Fechas' },
  { name: 'DAYS360', signature: 'DAYS360()', description: 'Función de Excel', insertText: 'DAYS360()', detail: '📅 Fechas' },
  { name: 'DB', signature: 'DB()', description: 'Función de Excel', insertText: 'DB()', detail: '💰 Financieras' },
  { name: 'DDB', signature: 'DDB()', description: 'Función de Excel', insertText: 'DDB()', detail: '💰 Financieras' },
  { name: 'DEC2BIN', signature: 'DEC2BIN()', description: 'Función de Excel', insertText: 'DEC2BIN()', detail: '⚙️ Ingeniería' },
  { name: 'DEC2HEX', signature: 'DEC2HEX()', description: 'Función de Excel', insertText: 'DEC2HEX()', detail: '⚙️ Ingeniería' },
  { name: 'DEC2OCT', signature: 'DEC2OCT()', description: 'Función de Excel', insertText: 'DEC2OCT()', detail: '⚙️ Ingeniería' },
  { name: 'DECIMAL', signature: 'DECIMAL()', description: 'Función de Excel', insertText: 'DECIMAL()', detail: '📦 Otras' },
  { name: 'DEGREES', signature: 'DEGREES()', description: 'Función de Excel', insertText: 'DEGREES()', detail: '🔢 Matemáticas' },
  { name: 'DELTA', signature: 'DELTA()', description: 'Función de Excel', insertText: 'DELTA()', detail: '⚙️ Ingeniería' },
  { name: 'DEVSQ', signature: 'DEVSQ()', description: 'Función de Excel', insertText: 'DEVSQ()', detail: '📊 Estadísticas' },
  { name: 'DIVIDE', signature: 'DIVIDE()', description: 'Función de Excel', insertText: 'DIVIDE()', detail: '🔢 Matemáticas' },
  { name: 'DOLLARDE', signature: 'DOLLARDE()', description: 'Función de Excel', insertText: 'DOLLARDE()', detail: '💰 Financieras' },
  { name: 'DOLLARFR', signature: 'DOLLARFR()', description: 'Función de Excel', insertText: 'DOLLARFR()', detail: '💰 Financieras' },
  { name: 'E', signature: 'E()', description: 'Función de Excel', insertText: 'E()', detail: '🔧 Utilidades' },
  { name: 'EDATE', signature: 'EDATE()', description: 'Función de Excel', insertText: 'EDATE()', detail: '📅 Fechas' },
  { name: 'EFFECT', signature: 'EFFECT()', description: 'Función de Excel', insertText: 'EFFECT()', detail: '💰 Financieras' },
  { name: 'EOMONTH', signature: 'EOMONTH()', description: 'Función de Excel', insertText: 'EOMONTH()', detail: '📅 Fechas' },
  { name: 'EQ', signature: 'EQ()', description: 'Función de Excel', insertText: 'EQ()', detail: '📦 Otras' },
  { name: 'ERF', signature: 'ERF()', description: 'Función de Excel', insertText: 'ERF()', detail: '⚙️ Ingeniería' },
  { name: 'ERFC', signature: 'ERFC()', description: 'Función de Excel', insertText: 'ERFC()', detail: '⚙️ Ingeniería' },
  { name: 'EVEN', signature: 'EVEN()', description: 'Función de Excel', insertText: 'EVEN()', detail: '🔢 Matemáticas' },
  { name: 'EXACT', signature: 'EXACT()', description: 'Función de Excel', insertText: 'EXACT()', detail: '📝 Texto' },
  { name: 'EXP', signature: 'EXP()', description: 'Función de Excel', insertText: 'EXP()', detail: '🔢 Matemáticas' },
  { name: 'EXPON.DIST', signature: 'EXPON.DIST()', description: 'Función de Excel', insertText: 'EXPON.DIST()', detail: '📈 Distribuciones' },
  { name: 'EXPONDIST', signature: 'EXPONDIST()', description: 'Función de Excel', insertText: 'EXPONDIST()', detail: '📈 Distribuciones' },
  { name: 'F.DIST', signature: 'F.DIST()', description: 'Función de Excel', insertText: 'F.DIST()', detail: '📈 Distribuciones' },
  { name: 'F.DIST.RT', signature: 'F.DIST.RT()', description: 'Función de Excel', insertText: 'F.DIST.RT()', detail: '📈 Distribuciones' },
  { name: 'F.INV', signature: 'F.INV()', description: 'Función de Excel', insertText: 'F.INV()', detail: '📈 Distribuciones' },
  { name: 'F.INV.RT', signature: 'F.INV.RT()', description: 'Función de Excel', insertText: 'F.INV.RT()', detail: '📈 Distribuciones' },
  { name: 'FACT', signature: 'FACT()', description: 'Función de Excel', insertText: 'FACT()', detail: '🔢 Matemáticas' },
  { name: 'FACTDOUBLE', signature: 'FACTDOUBLE()', description: 'Función de Excel', insertText: 'FACTDOUBLE()', detail: '🔢 Matemáticas' },
  { name: 'FALSE', signature: 'FALSE()', description: 'Función de Excel', insertText: 'FALSE()', detail: '🔀 Lógicas' },
  { name: 'FDIST', signature: 'FDIST()', description: 'Función de Excel', insertText: 'FDIST()', detail: '📈 Distribuciones' },
  { name: 'FDISTRT', signature: 'FDISTRT()', description: 'Función de Excel', insertText: 'FDISTRT()', detail: '📈 Distribuciones' },
  { name: 'FIND', signature: 'FIND()', description: 'Función de Excel', insertText: 'FIND()', detail: '📝 Texto' },
  { name: 'FINV', signature: 'FINV()', description: 'Función de Excel', insertText: 'FINV()', detail: '📈 Distribuciones' },
  { name: 'FINVRT', signature: 'FINVRT()', description: 'Función de Excel', insertText: 'FINVRT()', detail: '📈 Distribuciones' },
  { name: 'FISHER', signature: 'FISHER()', description: 'Función de Excel', insertText: 'FISHER()', detail: '📈 Distribuciones' },
  { name: 'FISHERINV', signature: 'FISHERINV()', description: 'Función de Excel', insertText: 'FISHERINV()', detail: '📈 Distribuciones' },
  { name: 'FLATTEN', signature: 'FLATTEN()', description: 'Función de Excel', insertText: 'FLATTEN()', detail: '🔧 Utilidades' },
  { name: 'FLOOR', signature: 'FLOOR()', description: 'Función de Excel', insertText: 'FLOOR()', detail: '🔢 Matemáticas' },
  { name: 'FORECAST', signature: 'FORECAST()', description: 'Función de Excel', insertText: 'FORECAST()', detail: '🔧 Utilidades' },
  { name: 'FREQUENCY', signature: 'FREQUENCY()', description: 'Función de Excel', insertText: 'FREQUENCY()', detail: '🔧 Utilidades' },
  { name: 'FV', signature: 'FV()', description: 'Función de Excel', insertText: 'FV()', detail: '💰 Financieras' },
  { name: 'FVSCHEDULE', signature: 'FVSCHEDULE()', description: 'Función de Excel', insertText: 'FVSCHEDULE()', detail: '💰 Financieras' },
  { name: 'GAMMA', signature: 'GAMMA()', description: 'Función de Excel', insertText: 'GAMMA()', detail: '📈 Distribuciones' },
  { name: 'GAMMA.DIST', signature: 'GAMMA.DIST()', description: 'Función de Excel', insertText: 'GAMMA.DIST()', detail: '📈 Distribuciones' },
  { name: 'GAMMA.INV', signature: 'GAMMA.INV()', description: 'Función de Excel', insertText: 'GAMMA.INV()', detail: '📈 Distribuciones' },
  { name: 'GAMMADIST', signature: 'GAMMADIST()', description: 'Función de Excel', insertText: 'GAMMADIST()', detail: '📈 Distribuciones' },
  { name: 'GAMMAINV', signature: 'GAMMAINV()', description: 'Función de Excel', insertText: 'GAMMAINV()', detail: '📈 Distribuciones' },
  { name: 'GAMMALN', signature: 'GAMMALN()', description: 'Función de Excel', insertText: 'GAMMALN()', detail: '📈 Distribuciones' },
  { name: 'GAMMALN.PRECISE', signature: 'GAMMALN.PRECISE()', description: 'Función de Excel', insertText: 'GAMMALN.PRECISE()', detail: '📈 Distribuciones' },
  { name: 'GAUSS', signature: 'GAUSS()', description: 'Función de Excel', insertText: 'GAUSS()', detail: '📈 Distribuciones' },
  { name: 'GCD', signature: 'GCD()', description: 'Función de Excel', insertText: 'GCD()', detail: '🔢 Matemáticas' },
  { name: 'GEOMEAN', signature: 'GEOMEAN()', description: 'Función de Excel', insertText: 'GEOMEAN()', detail: '📊 Estadísticas' },
  { name: 'GESTEP', signature: 'GESTEP()', description: 'Función de Excel', insertText: 'GESTEP()', detail: '⚙️ Ingeniería' },
  { name: 'GROWTH', signature: 'GROWTH()', description: 'Función de Excel', insertText: 'GROWTH()', detail: '📈 Distribuciones' },
  { name: 'GTE', signature: 'GTE()', description: 'Función de Excel', insertText: 'GTE()', detail: '📦 Otras' },
  { name: 'HARMEAN', signature: 'HARMEAN()', description: 'Función de Excel', insertText: 'HARMEAN()', detail: '📊 Estadísticas' },
  { name: 'HEX2BIN', signature: 'HEX2BIN()', description: 'Función de Excel', insertText: 'HEX2BIN()', detail: '⚙️ Ingeniería' },
  { name: 'HEX2DEC', signature: 'HEX2DEC()', description: 'Función de Excel', insertText: 'HEX2DEC()', detail: '⚙️ Ingeniería' },
  { name: 'HEX2OCT', signature: 'HEX2OCT()', description: 'Función de Excel', insertText: 'HEX2OCT()', detail: '⚙️ Ingeniería' },
  { name: 'HOUR', signature: 'HOUR()', description: 'Función de Excel', insertText: 'HOUR()', detail: '📅 Fechas' },
  { name: 'HTML2TEXT', signature: 'HTML2TEXT()', description: 'Función de Excel', insertText: 'HTML2TEXT()', detail: '📦 Otras' },
  { name: 'HYPGEOM.DIST', signature: 'HYPGEOM.DIST()', description: 'Función de Excel', insertText: 'HYPGEOM.DIST()', detail: '📈 Distribuciones' },
  { name: 'HYPGEOMDIST', signature: 'HYPGEOMDIST()', description: 'Función de Excel', insertText: 'HYPGEOMDIST()', detail: '📈 Distribuciones' },
  { name: 'IF', signature: 'IF()', description: 'Función de Excel', insertText: 'IF()', detail: '🔀 Lógicas' },
  { name: 'IMABS', signature: 'IMABS()', description: 'Función de Excel', insertText: 'IMABS()', detail: '⚙️ Ingeniería' },
  { name: 'IMAGINARY', signature: 'IMAGINARY()', description: 'Función de Excel', insertText: 'IMAGINARY()', detail: '⚙️ Ingeniería' },
  { name: 'IMARGUMENT', signature: 'IMARGUMENT()', description: 'Función de Excel', insertText: 'IMARGUMENT()', detail: '⚙️ Ingeniería' },
  { name: 'IMCONJUGATE', signature: 'IMCONJUGATE()', description: 'Función de Excel', insertText: 'IMCONJUGATE()', detail: '⚙️ Ingeniería' },
  { name: 'IMCOS', signature: 'IMCOS()', description: 'Función de Excel', insertText: 'IMCOS()', detail: '⚙️ Ingeniería' },
  { name: 'IMCOSH', signature: 'IMCOSH()', description: 'Función de Excel', insertText: 'IMCOSH()', detail: '⚙️ Ingeniería' },
  { name: 'IMCOT', signature: 'IMCOT()', description: 'Función de Excel', insertText: 'IMCOT()', detail: '⚙️ Ingeniería' },
  { name: 'IMCSC', signature: 'IMCSC()', description: 'Función de Excel', insertText: 'IMCSC()', detail: '⚙️ Ingeniería' },
  { name: 'IMCSCH', signature: 'IMCSCH()', description: 'Función de Excel', insertText: 'IMCSCH()', detail: '⚙️ Ingeniería' },
  { name: 'IMDIV', signature: 'IMDIV()', description: 'Función de Excel', insertText: 'IMDIV()', detail: '⚙️ Ingeniería' },
  { name: 'IMEXP', signature: 'IMEXP()', description: 'Función de Excel', insertText: 'IMEXP()', detail: '⚙️ Ingeniería' },
  { name: 'IMLN', signature: 'IMLN()', description: 'Función de Excel', insertText: 'IMLN()', detail: '⚙️ Ingeniería' },
  { name: 'IMLOG10', signature: 'IMLOG10()', description: 'Función de Excel', insertText: 'IMLOG10()', detail: '⚙️ Ingeniería' },
  { name: 'IMLOG2', signature: 'IMLOG2()', description: 'Función de Excel', insertText: 'IMLOG2()', detail: '⚙️ Ingeniería' },
  { name: 'IMPOWER', signature: 'IMPOWER()', description: 'Función de Excel', insertText: 'IMPOWER()', detail: '⚙️ Ingeniería' },
  { name: 'IMPRODUCT', signature: 'IMPRODUCT()', description: 'Función de Excel', insertText: 'IMPRODUCT()', detail: '⚙️ Ingeniería' },
  { name: 'IMREAL', signature: 'IMREAL()', description: 'Función de Excel', insertText: 'IMREAL()', detail: '⚙️ Ingeniería' },
  { name: 'IMSEC', signature: 'IMSEC()', description: 'Función de Excel', insertText: 'IMSEC()', detail: '⚙️ Ingeniería' },
  { name: 'IMSECH', signature: 'IMSECH()', description: 'Función de Excel', insertText: 'IMSECH()', detail: '⚙️ Ingeniería' },
  { name: 'IMSIN', signature: 'IMSIN()', description: 'Función de Excel', insertText: 'IMSIN()', detail: '⚙️ Ingeniería' },
  { name: 'IMSINH', signature: 'IMSINH()', description: 'Función de Excel', insertText: 'IMSINH()', detail: '⚙️ Ingeniería' },
  { name: 'IMSQRT', signature: 'IMSQRT()', description: 'Función de Excel', insertText: 'IMSQRT()', detail: '⚙️ Ingeniería' },
  { name: 'IMSUB', signature: 'IMSUB()', description: 'Función de Excel', insertText: 'IMSUB()', detail: '⚙️ Ingeniería' },
  { name: 'IMSUM', signature: 'IMSUM()', description: 'Función de Excel', insertText: 'IMSUM()', detail: '⚙️ Ingeniería' },
  { name: 'IMTAN', signature: 'IMTAN()', description: 'Función de Excel', insertText: 'IMTAN()', detail: '⚙️ Ingeniería' },
  { name: 'INT', signature: 'INT()', description: 'Función de Excel', insertText: 'INT()', detail: '🔢 Matemáticas' },
  { name: 'INTERCEPT', signature: 'INTERCEPT()', description: 'Función de Excel', insertText: 'INTERCEPT()', detail: '📈 Distribuciones' },
  { name: 'INTERVAL', signature: 'INTERVAL()', description: 'Función de Excel', insertText: 'INTERVAL()', detail: '📅 Fechas' },
  { name: 'IPMT', signature: 'IPMT()', description: 'Función de Excel', insertText: 'IPMT()', detail: '💰 Financieras' },
  { name: 'IRR', signature: 'IRR()', description: 'Función de Excel', insertText: 'IRR()', detail: '💰 Financieras' },
  { name: 'ISBINARY', signature: 'ISBINARY()', description: 'Función de Excel', insertText: 'ISBINARY()', detail: '🔧 Utilidades' },
  { name: 'ISBLANK', signature: 'ISBLANK()', description: 'Función de Excel', insertText: 'ISBLANK()', detail: '🔧 Utilidades' },
  { name: 'ISEVEN', signature: 'ISEVEN()', description: 'Función de Excel', insertText: 'ISEVEN()', detail: '🔧 Utilidades' },
  { name: 'ISLOGICAL', signature: 'ISLOGICAL()', description: 'Función de Excel', insertText: 'ISLOGICAL()', detail: '🔧 Utilidades' },
  { name: 'ISNONTEXT', signature: 'ISNONTEXT()', description: 'Función de Excel', insertText: 'ISNONTEXT()', detail: '🔧 Utilidades' },
  { name: 'ISNUMBER', signature: 'ISNUMBER()', description: 'Función de Excel', insertText: 'ISNUMBER()', detail: '🔧 Utilidades' },
  { name: 'ISODD', signature: 'ISODD()', description: 'Función de Excel', insertText: 'ISODD()', detail: '🔧 Utilidades' },
  { name: 'ISOWEEKNUM', signature: 'ISOWEEKNUM()', description: 'Función de Excel', insertText: 'ISOWEEKNUM()', detail: '📅 Fechas' },
  { name: 'ISPMT', signature: 'ISPMT()', description: 'Función de Excel', insertText: 'ISPMT()', detail: '💰 Financieras' },
  { name: 'ISTEXT', signature: 'ISTEXT()', description: 'Función de Excel', insertText: 'ISTEXT()', detail: '🔧 Utilidades' },
  { name: 'JOIN', signature: 'JOIN()', description: 'Función de Excel', insertText: 'JOIN()', detail: '📝 Texto' },
  { name: 'KURT', signature: 'KURT()', description: 'Función de Excel', insertText: 'KURT()', detail: '📊 Estadísticas' },
  { name: 'LARGE', signature: 'LARGE()', description: 'Función de Excel', insertText: 'LARGE()', detail: '📊 Estadísticas' },
  { name: 'LCM', signature: 'LCM()', description: 'Función de Excel', insertText: 'LCM()', detail: '🔢 Matemáticas' },
  { name: 'LEFT', signature: 'LEFT()', description: 'Función de Excel', insertText: 'LEFT()', detail: '📝 Texto' },
  { name: 'LEN', signature: 'LEN()', description: 'Función de Excel', insertText: 'LEN()', detail: '📝 Texto' },
  { name: 'LINEST', signature: 'LINEST()', description: 'Función de Excel', insertText: 'LINEST()', detail: '📈 Distribuciones' },
  { name: 'LN', signature: 'LN()', description: 'Función de Excel', insertText: 'LN()', detail: '🔢 Matemáticas' },
  { name: 'LOG', signature: 'LOG()', description: 'Función de Excel', insertText: 'LOG()', detail: '🔢 Matemáticas' },
  { name: 'LOG10', signature: 'LOG10()', description: 'Función de Excel', insertText: 'LOG10()', detail: '🔢 Matemáticas' },
  { name: 'LOGEST', signature: 'LOGEST()', description: 'Función de Excel', insertText: 'LOGEST()', detail: '📈 Distribuciones' },
  { name: 'LOGNORM.DIST', signature: 'LOGNORM.DIST()', description: 'Función de Excel', insertText: 'LOGNORM.DIST()', detail: '📈 Distribuciones' },
  { name: 'LOGNORM.INV', signature: 'LOGNORM.INV()', description: 'Función de Excel', insertText: 'LOGNORM.INV()', detail: '📈 Distribuciones' },
  { name: 'LOGNORMDIST', signature: 'LOGNORMDIST()', description: 'Función de Excel', insertText: 'LOGNORMDIST()', detail: '📈 Distribuciones' },
  { name: 'LOGNORMINV', signature: 'LOGNORMINV()', description: 'Función de Excel', insertText: 'LOGNORMINV()', detail: '📈 Distribuciones' },
  { name: 'LOWER', signature: 'LOWER()', description: 'Función de Excel', insertText: 'LOWER()', detail: '📝 Texto' },
  { name: 'LT', signature: 'LT()', description: 'Función de Excel', insertText: 'LT()', detail: '📦 Otras' },
  { name: 'LTE', signature: 'LTE()', description: 'Función de Excel', insertText: 'LTE()', detail: '📦 Otras' },
  { name: 'MATCH', signature: 'MATCH()', description: 'Función de Excel', insertText: 'MATCH()', detail: '🔧 Utilidades' },
  { name: 'MAX', signature: 'MAX()', description: 'Función de Excel', insertText: 'MAX()', detail: '📊 Estadísticas' },
  { name: 'MAXA', signature: 'MAXA()', description: 'Función de Excel', insertText: 'MAXA()', detail: '📊 Estadísticas' },
  { name: 'MEDIAN', signature: 'MEDIAN()', description: 'Función de Excel', insertText: 'MEDIAN()', detail: '📊 Estadísticas' },
  { name: 'MID', signature: 'MID()', description: 'Función de Excel', insertText: 'MID()', detail: '📝 Texto' },
  { name: 'MIN', signature: 'MIN()', description: 'Función de Excel', insertText: 'MIN()', detail: '📊 Estadísticas' },
  { name: 'MINA', signature: 'MINA()', description: 'Función de Excel', insertText: 'MINA()', detail: '📊 Estadísticas' },
  { name: 'MINUS', signature: 'MINUS()', description: 'Función de Excel', insertText: 'MINUS()', detail: '🔢 Matemáticas' },
  { name: 'MINUTE', signature: 'MINUTE()', description: 'Función de Excel', insertText: 'MINUTE()', detail: '📅 Fechas' },
  { name: 'MIRR', signature: 'MIRR()', description: 'Función de Excel', insertText: 'MIRR()', detail: '💰 Financieras' },
  { name: 'MOD', signature: 'MOD()', description: 'Función de Excel', insertText: 'MOD()', detail: '🔢 Matemáticas' },
  { name: 'MODE.MULT', signature: 'MODE.MULT()', description: 'Función de Excel', insertText: 'MODE.MULT()', detail: '📊 Estadísticas' },
  { name: 'MODE.SNGL', signature: 'MODE.SNGL()', description: 'Función de Excel', insertText: 'MODE.SNGL()', detail: '📊 Estadísticas' },
  { name: 'MODEMULT', signature: 'MODEMULT()', description: 'Función de Excel', insertText: 'MODEMULT()', detail: '📊 Estadísticas' },
  { name: 'MODESNGL', signature: 'MODESNGL()', description: 'Función de Excel', insertText: 'MODESNGL()', detail: '📊 Estadísticas' },
  { name: 'MONTH', signature: 'MONTH()', description: 'Función de Excel', insertText: 'MONTH()', detail: '📅 Fechas' },
  { name: 'MROUND', signature: 'MROUND()', description: 'Función de Excel', insertText: 'MROUND()', detail: '🔢 Matemáticas' },
  { name: 'MULTINOMIAL', signature: 'MULTINOMIAL()', description: 'Función de Excel', insertText: 'MULTINOMIAL()', detail: '🔧 Utilidades' },
  { name: 'MULTIPLY', signature: 'MULTIPLY()', description: 'Función de Excel', insertText: 'MULTIPLY()', detail: '🔢 Matemáticas' },
  { name: 'NE', signature: 'NE()', description: 'Función de Excel', insertText: 'NE()', detail: '📦 Otras' },
  { name: 'NEGBINOM.DIST', signature: 'NEGBINOM.DIST()', description: 'Función de Excel', insertText: 'NEGBINOM.DIST()', detail: '📈 Distribuciones' },
  { name: 'NEGBINOMDIST', signature: 'NEGBINOMDIST()', description: 'Función de Excel', insertText: 'NEGBINOMDIST()', detail: '📈 Distribuciones' },
  { name: 'NETWORKDAYS', signature: 'NETWORKDAYS()', description: 'Función de Excel', insertText: 'NETWORKDAYS()', detail: '📅 Fechas' },
  { name: 'NOMINAL', signature: 'NOMINAL()', description: 'Función de Excel', insertText: 'NOMINAL()', detail: '💰 Financieras' },
  { name: 'NORM.DIST', signature: 'NORM.DIST()', description: 'Función de Excel', insertText: 'NORM.DIST()', detail: '📈 Distribuciones' },
  { name: 'NORM.INV', signature: 'NORM.INV()', description: 'Función de Excel', insertText: 'NORM.INV()', detail: '📈 Distribuciones' },
  { name: 'NORM.S.DIST', signature: 'NORM.S.DIST()', description: 'Función de Excel', insertText: 'NORM.S.DIST()', detail: '📈 Distribuciones' },
  { name: 'NORM.S.INV', signature: 'NORM.S.INV()', description: 'Función de Excel', insertText: 'NORM.S.INV()', detail: '📈 Distribuciones' },
  { name: 'NORMDIST', signature: 'NORMDIST()', description: 'Función de Excel', insertText: 'NORMDIST()', detail: '📈 Distribuciones' },
  { name: 'NORMINV', signature: 'NORMINV()', description: 'Función de Excel', insertText: 'NORMINV()', detail: '📈 Distribuciones' },
  { name: 'NORMSDIST', signature: 'NORMSDIST()', description: 'Función de Excel', insertText: 'NORMSDIST()', detail: '📈 Distribuciones' },
  { name: 'NORMSINV', signature: 'NORMSINV()', description: 'Función de Excel', insertText: 'NORMSINV()', detail: '📈 Distribuciones' },
  { name: 'NOT', signature: 'NOT()', description: 'Función de Excel', insertText: 'NOT()', detail: '🔀 Lógicas' },
  { name: 'NOW', signature: 'NOW()', description: 'Función de Excel', insertText: 'NOW()', detail: '📅 Fechas' },
  { name: 'NPER', signature: 'NPER()', description: 'Función de Excel', insertText: 'NPER()', detail: '💰 Financieras' },
  { name: 'NPV', signature: 'NPV()', description: 'Función de Excel', insertText: 'NPV()', detail: '💰 Financieras' },
  { name: 'NUMBERS', signature: 'NUMBERS()', description: 'Función de Excel', insertText: 'NUMBERS()', detail: '🔧 Utilidades' },
  { name: 'OCT2BIN', signature: 'OCT2BIN()', description: 'Función de Excel', insertText: 'OCT2BIN()', detail: '⚙️ Ingeniería' },
  { name: 'OCT2DEC', signature: 'OCT2DEC()', description: 'Función de Excel', insertText: 'OCT2DEC()', detail: '⚙️ Ingeniería' },
  { name: 'OCT2HEX', signature: 'OCT2HEX()', description: 'Función de Excel', insertText: 'OCT2HEX()', detail: '⚙️ Ingeniería' },
  { name: 'ODD', signature: 'ODD()', description: 'Función de Excel', insertText: 'ODD()', detail: '🔢 Matemáticas' },
  { name: 'OR', signature: 'OR()', description: 'Función de Excel', insertText: 'OR()', detail: '🔀 Lógicas' },
  { name: 'PDURATION', signature: 'PDURATION()', description: 'Función de Excel', insertText: 'PDURATION()', detail: '💰 Financieras' },
  { name: 'PEARSON', signature: 'PEARSON()', description: 'Función de Excel', insertText: 'PEARSON()', detail: '📊 Estadísticas' },
  { name: 'PERCENTILEEXC', signature: 'PERCENTILEEXC()', description: 'Función de Excel', insertText: 'PERCENTILEEXC()', detail: '📊 Estadísticas' },
  { name: 'PERCENTILEINC', signature: 'PERCENTILEINC()', description: 'Función de Excel', insertText: 'PERCENTILEINC()', detail: '📊 Estadísticas' },
  { name: 'PERCENTRANKEXC', signature: 'PERCENTRANKEXC()', description: 'Función de Excel', insertText: 'PERCENTRANKEXC()', detail: '📊 Estadísticas' },
  { name: 'PERCENTRANKINC', signature: 'PERCENTRANKINC()', description: 'Función de Excel', insertText: 'PERCENTRANKINC()', detail: '📊 Estadísticas' },
  { name: 'PERMUT', signature: 'PERMUT()', description: 'Función de Excel', insertText: 'PERMUT()', detail: '📊 Estadísticas' },
  { name: 'PERMUTATIONA', signature: 'PERMUTATIONA()', description: 'Función de Excel', insertText: 'PERMUTATIONA()', detail: '📊 Estadísticas' },
  { name: 'PHI', signature: 'PHI()', description: 'Función de Excel', insertText: 'PHI()', detail: '📈 Distribuciones' },
  { name: 'PI', signature: 'PI()', description: 'Función de Excel', insertText: 'PI()', detail: '🔢 Matemáticas' },
  { name: 'PMT', signature: 'PMT()', description: 'Función de Excel', insertText: 'PMT()', detail: '💰 Financieras' },
  { name: 'POISSON.DIST', signature: 'POISSON.DIST()', description: 'Función de Excel', insertText: 'POISSON.DIST()', detail: '📈 Distribuciones' },
  { name: 'POISSONDIST', signature: 'POISSONDIST()', description: 'Función de Excel', insertText: 'POISSONDIST()', detail: '📈 Distribuciones' },
  { name: 'POW', signature: 'POW()', description: 'Función de Excel', insertText: 'POW()', detail: '🔢 Matemáticas' },
  { name: 'POWER', signature: 'POWER()', description: 'Función de Excel', insertText: 'POWER()', detail: '🔢 Matemáticas' },
  { name: 'PPMT', signature: 'PPMT()', description: 'Función de Excel', insertText: 'PPMT()', detail: '💰 Financieras' },
  { name: 'PROB', signature: 'PROB()', description: 'Función de Excel', insertText: 'PROB()', detail: '📈 Distribuciones' },
  { name: 'PRODUCT', signature: 'PRODUCT()', description: 'Función de Excel', insertText: 'PRODUCT()', detail: '🔢 Matemáticas' },
  { name: 'PROPER', signature: 'PROPER()', description: 'Función de Excel', insertText: 'PROPER()', detail: '📝 Texto' },
  { name: 'PV', signature: 'PV()', description: 'Función de Excel', insertText: 'PV()', detail: '📦 Otras' },
  { name: 'QUARTILE.EXC', signature: 'QUARTILE.EXC()', description: 'Función de Excel', insertText: 'QUARTILE.EXC()', detail: '📊 Estadísticas' },
  { name: 'QUARTILE.INC', signature: 'QUARTILE.INC()', description: 'Función de Excel', insertText: 'QUARTILE.INC()', detail: '📊 Estadísticas' },
  { name: 'QUARTILEEXC', signature: 'QUARTILEEXC()', description: 'Función de Excel', insertText: 'QUARTILEEXC()', detail: '📊 Estadísticas' },
  { name: 'QUARTILEINC', signature: 'QUARTILEINC()', description: 'Función de Excel', insertText: 'QUARTILEINC()', detail: '📊 Estadísticas' },
  { name: 'QUOTIENT', signature: 'QUOTIENT()', description: 'Función de Excel', insertText: 'QUOTIENT()', detail: '🔢 Matemáticas' },
  { name: 'RADIANS', signature: 'RADIANS()', description: 'Función de Excel', insertText: 'RADIANS()', detail: '🔢 Matemáticas' },
  { name: 'RAND', signature: 'RAND()', description: 'Función de Excel', insertText: 'RAND()', detail: '🔢 Matemáticas' },
  { name: 'RANDBETWEEN', signature: 'RANDBETWEEN()', description: 'Función de Excel', insertText: 'RANDBETWEEN()', detail: '🔢 Matemáticas' },
  { name: 'RANK.AVG', signature: 'RANK.AVG()', description: 'Función de Excel', insertText: 'RANK.AVG()', detail: '📊 Estadísticas' },
  { name: 'RANK.EQ', signature: 'RANK.EQ()', description: 'Función de Excel', insertText: 'RANK.EQ()', detail: '📊 Estadísticas' },
  { name: 'RANKAVG', signature: 'RANKAVG()', description: 'Función de Excel', insertText: 'RANKAVG()', detail: '📊 Estadísticas' },
  { name: 'RANKEQ', signature: 'RANKEQ()', description: 'Función de Excel', insertText: 'RANKEQ()', detail: '📊 Estadísticas' },
  { name: 'RATE', signature: 'RATE()', description: 'Función de Excel', insertText: 'RATE()', detail: '💰 Financieras' },
  { name: 'REFERENCE', signature: 'REFERENCE()', description: 'Función de Excel', insertText: 'REFERENCE()', detail: '🔧 Utilidades' },
  { name: 'REGEXEXTRACT', signature: 'REGEXEXTRACT()', description: 'Función de Excel', insertText: 'REGEXEXTRACT()', detail: '📝 Texto' },
  { name: 'REGEXMATCH', signature: 'REGEXMATCH()', description: 'Función de Excel', insertText: 'REGEXMATCH()', detail: '📝 Texto' },
  { name: 'REGEXREPLACE', signature: 'REGEXREPLACE()', description: 'Función de Excel', insertText: 'REGEXREPLACE()', detail: '📝 Texto' },
  { name: 'REPLACE', signature: 'REPLACE()', description: 'Función de Excel', insertText: 'REPLACE()', detail: '📝 Texto' },
  { name: 'REPT', signature: 'REPT()', description: 'Función de Excel', insertText: 'REPT()', detail: '📝 Texto' },
  { name: 'RIGHT', signature: 'RIGHT()', description: 'Función de Excel', insertText: 'RIGHT()', detail: '📝 Texto' },
  { name: 'ROMAN', signature: 'ROMAN()', description: 'Función de Excel', insertText: 'ROMAN()', detail: '🔢 Matemáticas' },
  { name: 'ROUND', signature: 'ROUND()', description: 'Función de Excel', insertText: 'ROUND()', detail: '🔢 Matemáticas' },
  { name: 'ROUNDDOWN', signature: 'ROUNDDOWN()', description: 'Función de Excel', insertText: 'ROUNDDOWN()', detail: '🔢 Matemáticas' },
  { name: 'ROUNDUP', signature: 'ROUNDUP()', description: 'Función de Excel', insertText: 'ROUNDUP()', detail: '🔢 Matemáticas' },
  { name: 'ROW', signature: 'ROW()', description: 'Función de Excel', insertText: 'ROW()', detail: '🔧 Utilidades' },
  { name: 'ROWS', signature: 'ROWS()', description: 'Función de Excel', insertText: 'ROWS()', detail: '🔧 Utilidades' },
  { name: 'RRI', signature: 'RRI()', description: 'Función de Excel', insertText: 'RRI()', detail: '💰 Financieras' },
  { name: 'RSQ', signature: 'RSQ()', description: 'Función de Excel', insertText: 'RSQ()', detail: '📊 Estadísticas' },
  { name: 'SEARCH', signature: 'SEARCH()', description: 'Función de Excel', insertText: 'SEARCH()', detail: '📝 Texto' },
  { name: 'SEC', signature: 'SEC()', description: 'Función de Excel', insertText: 'SEC()', detail: '📐 Trigonométricas' },
  { name: 'SECH', signature: 'SECH()', description: 'Función de Excel', insertText: 'SECH()', detail: '📐 Trigonométricas' },
  { name: 'SECOND', signature: 'SECOND()', description: 'Función de Excel', insertText: 'SECOND()', detail: '📅 Fechas' },
  { name: 'SERIESSUM', signature: 'SERIESSUM()', description: 'Función de Excel', insertText: 'SERIESSUM()', detail: '🔧 Utilidades' },
  { name: 'SIGN', signature: 'SIGN()', description: 'Función de Excel', insertText: 'SIGN()', detail: '🔢 Matemáticas' },
  { name: 'SIN', signature: 'SIN()', description: 'Función de Excel', insertText: 'SIN()', detail: '📐 Trigonométricas' },
  { name: 'SINH', signature: 'SINH()', description: 'Función de Excel', insertText: 'SINH()', detail: '📐 Trigonométricas' },
  { name: 'SKEW', signature: 'SKEW()', description: 'Función de Excel', insertText: 'SKEW()', detail: '📊 Estadísticas' },
  { name: 'SKEW.P', signature: 'SKEW.P()', description: 'Función de Excel', insertText: 'SKEW.P()', detail: '📊 Estadísticas' },
  { name: 'SKEWP', signature: 'SKEWP()', description: 'Función de Excel', insertText: 'SKEWP()', detail: '📊 Estadísticas' },
  { name: 'SLN', signature: 'SLN()', description: 'Función de Excel', insertText: 'SLN()', detail: '💰 Financieras' },
  { name: 'SLOPE', signature: 'SLOPE()', description: 'Función de Excel', insertText: 'SLOPE()', detail: '📈 Distribuciones' },
  { name: 'SMALL', signature: 'SMALL()', description: 'Función de Excel', insertText: 'SMALL()', detail: '📊 Estadísticas' },
  { name: 'SPLIT', signature: 'SPLIT()', description: 'Función de Excel', insertText: 'SPLIT()', detail: '📝 Texto' },
  { name: 'SQRT', signature: 'SQRT()', description: 'Función de Excel', insertText: 'SQRT()', detail: '🔢 Matemáticas' },
  { name: 'SQRTPI', signature: 'SQRTPI()', description: 'Función de Excel', insertText: 'SQRTPI()', detail: '🔢 Matemáticas' },
  { name: 'STANDARDIZE', signature: 'STANDARDIZE()', description: 'Función de Excel', insertText: 'STANDARDIZE()', detail: '📊 Estadísticas' },
  { name: 'STDEV.P', signature: 'STDEV.P()', description: 'Función de Excel', insertText: 'STDEV.P()', detail: '📊 Estadísticas' },
  { name: 'STDEV.S', signature: 'STDEV.S()', description: 'Función de Excel', insertText: 'STDEV.S()', detail: '📊 Estadísticas' },
  { name: 'STDEVA', signature: 'STDEVA()', description: 'Función de Excel', insertText: 'STDEVA()', detail: '📊 Estadísticas' },
  { name: 'STDEVP', signature: 'STDEVP()', description: 'Función de Excel', insertText: 'STDEVP()', detail: '📊 Estadísticas' },
  { name: 'STDEVPA', signature: 'STDEVPA()', description: 'Función de Excel', insertText: 'STDEVPA()', detail: '📊 Estadísticas' },
  { name: 'STDEVS', signature: 'STDEVS()', description: 'Función de Excel', insertText: 'STDEVS()', detail: '📊 Estadísticas' },
  { name: 'STEYX', signature: 'STEYX()', description: 'Función de Excel', insertText: 'STEYX()', detail: '📊 Estadísticas' },
  { name: 'SUBSTITUTE', signature: 'SUBSTITUTE()', description: 'Función de Excel', insertText: 'SUBSTITUTE()', detail: '📝 Texto' },
  { name: 'SUBTOTAL', signature: 'SUBTOTAL()', description: 'Función de Excel', insertText: 'SUBTOTAL()', detail: '📦 Otras' },
  { name: 'SUM', signature: 'SUM()', description: 'Función de Excel', insertText: 'SUM()', detail: '🔢 Matemáticas' },
  { name: 'SUMIF', signature: 'SUMIF()', description: 'Función de Excel', insertText: 'SUMIF()', detail: '🔢 Matemáticas' },
  { name: 'SUMIFS', signature: 'SUMIFS()', description: 'Función de Excel', insertText: 'SUMIFS()', detail: '🔢 Matemáticas' },
  { name: 'SUMPRODUCT', signature: 'SUMPRODUCT()', description: 'Función de Excel', insertText: 'SUMPRODUCT()', detail: '🔢 Matemáticas' },
  { name: 'SUMSQ', signature: 'SUMSQ()', description: 'Función de Excel', insertText: 'SUMSQ()', detail: '🔢 Matemáticas' },
  { name: 'SUMX2MY2', signature: 'SUMX2MY2()', description: 'Función de Excel', insertText: 'SUMX2MY2()', detail: '🔢 Matemáticas' },
  { name: 'SUMX2PY2', signature: 'SUMX2PY2()', description: 'Función de Excel', insertText: 'SUMX2PY2()', detail: '🔢 Matemáticas' },
  { name: 'SUMXMY2', signature: 'SUMXMY2()', description: 'Función de Excel', insertText: 'SUMXMY2()', detail: '🔢 Matemáticas' },
  { name: 'SWITCH', signature: 'SWITCH()', description: 'Función de Excel', insertText: 'SWITCH()', detail: '🔀 Lógicas' },
  { name: 'SYD', signature: 'SYD()', description: 'Función de Excel', insertText: 'SYD()', detail: '💰 Financieras' },
  { name: 'T', signature: 'T()', description: 'Función de Excel', insertText: 'T()', detail: '📝 Texto' },
  { name: 'T.DIST', signature: 'T.DIST()', description: 'Función de Excel', insertText: 'T.DIST()', detail: '📈 Distribuciones' },
  { name: 'T.DIST.2T', signature: 'T.DIST.2T()', description: 'Función de Excel', insertText: 'T.DIST.2T()', detail: '📈 Distribuciones' },
  { name: 'T.DIST.RT', signature: 'T.DIST.RT()', description: 'Función de Excel', insertText: 'T.DIST.RT()', detail: '📈 Distribuciones' },
  { name: 'T.INV', signature: 'T.INV()', description: 'Función de Excel', insertText: 'T.INV()', detail: '📈 Distribuciones' },
  { name: 'T.INV.2T', signature: 'T.INV.2T()', description: 'Función de Excel', insertText: 'T.INV.2T()', detail: '📈 Distribuciones' },
  { name: 'TAN', signature: 'TAN()', description: 'Función de Excel', insertText: 'TAN()', detail: '📐 Trigonométricas' },
  { name: 'TANH', signature: 'TANH()', description: 'Función de Excel', insertText: 'TANH()', detail: '📐 Trigonométricas' },
  { name: 'TBILLEQ', signature: 'TBILLEQ()', description: 'Función de Excel', insertText: 'TBILLEQ()', detail: '💰 Financieras' },
  { name: 'TBILLPRICE', signature: 'TBILLPRICE()', description: 'Función de Excel', insertText: 'TBILLPRICE()', detail: '💰 Financieras' },
  { name: 'TBILLYIELD', signature: 'TBILLYIELD()', description: 'Función de Excel', insertText: 'TBILLYIELD()', detail: '💰 Financieras' },
  { name: 'TDIST', signature: 'TDIST()', description: 'Función de Excel', insertText: 'TDIST()', detail: '📈 Distribuciones' },
  { name: 'TDIST2T', signature: 'TDIST2T()', description: 'Función de Excel', insertText: 'TDIST2T()', detail: '📈 Distribuciones' },
  { name: 'TDISTRT', signature: 'TDISTRT()', description: 'Función de Excel', insertText: 'TDISTRT()', detail: '📈 Distribuciones' },
  { name: 'TIME', signature: 'TIME()', description: 'Función de Excel', insertText: 'TIME()', detail: '📅 Fechas' },
  { name: 'TIMEVALUE', signature: 'TIMEVALUE()', description: 'Función de Excel', insertText: 'TIMEVALUE()', detail: '📅 Fechas' },
  { name: 'TINV', signature: 'TINV()', description: 'Función de Excel', insertText: 'TINV()', detail: '📈 Distribuciones' },
  { name: 'TINV2T', signature: 'TINV2T()', description: 'Función de Excel', insertText: 'TINV2T()', detail: '📈 Distribuciones' },
  { name: 'TODAY', signature: 'TODAY()', description: 'Función de Excel', insertText: 'TODAY()', detail: '📅 Fechas' },
  { name: 'TRANSPOSE', signature: 'TRANSPOSE()', description: 'Función de Excel', insertText: 'TRANSPOSE()', detail: '🔧 Utilidades' },
  { name: 'TREND', signature: 'TREND()', description: 'Función de Excel', insertText: 'TREND()', detail: '🔧 Utilidades' },
  { name: 'TRIM', signature: 'TRIM()', description: 'Función de Excel', insertText: 'TRIM()', detail: '📝 Texto' },
  { name: 'TRIMMEAN', signature: 'TRIMMEAN()', description: 'Función de Excel', insertText: 'TRIMMEAN()', detail: '📊 Estadísticas' },
  { name: 'TRUE', signature: 'TRUE()', description: 'Función de Excel', insertText: 'TRUE()', detail: '🔀 Lógicas' },
  { name: 'TRUNC', signature: 'TRUNC()', description: 'Función de Excel', insertText: 'TRUNC()', detail: '🔢 Matemáticas' },
  { name: 'UNICHAR', signature: 'UNICHAR()', description: 'Función de Excel', insertText: 'UNICHAR()', detail: '📝 Texto' },
  { name: 'UNICODE', signature: 'UNICODE()', description: 'Función de Excel', insertText: 'UNICODE()', detail: '📝 Texto' },
  { name: 'UNIQUE', signature: 'UNIQUE()', description: 'Función de Excel', insertText: 'UNIQUE()', detail: '🔧 Utilidades' },
  { name: 'UPPER', signature: 'UPPER()', description: 'Función de Excel', insertText: 'UPPER()', detail: '📝 Texto' },
  { name: 'VAR.P', signature: 'VAR.P()', description: 'Función de Excel', insertText: 'VAR.P()', detail: '📊 Estadísticas' },
  { name: 'VAR.S', signature: 'VAR.S()', description: 'Función de Excel', insertText: 'VAR.S()', detail: '📊 Estadísticas' },
  { name: 'VARA', signature: 'VARA()', description: 'Función de Excel', insertText: 'VARA()', detail: '📊 Estadísticas' },
  { name: 'VARP', signature: 'VARP()', description: 'Función de Excel', insertText: 'VARP()', detail: '📊 Estadísticas' },
  { name: 'VARPA', signature: 'VARPA()', description: 'Función de Excel', insertText: 'VARPA()', detail: '📊 Estadísticas' },
  { name: 'VARS', signature: 'VARS()', description: 'Función de Excel', insertText: 'VARS()', detail: '📊 Estadísticas' },
  { name: 'WEEKDAY', signature: 'WEEKDAY()', description: 'Función de Excel', insertText: 'WEEKDAY()', detail: '📅 Fechas' },
  { name: 'WEEKNUM', signature: 'WEEKNUM()', description: 'Función de Excel', insertText: 'WEEKNUM()', detail: '📅 Fechas' },
  { name: 'WEIBULL.DIST', signature: 'WEIBULL.DIST()', description: 'Función de Excel', insertText: 'WEIBULL.DIST()', detail: '📈 Distribuciones' },
  { name: 'WEIBULLDIST', signature: 'WEIBULLDIST()', description: 'Función de Excel', insertText: 'WEIBULLDIST()', detail: '📈 Distribuciones' },
  { name: 'WORKDAY', signature: 'WORKDAY()', description: 'Función de Excel', insertText: 'WORKDAY()', detail: '📅 Fechas' },
  { name: 'XIRR', signature: 'XIRR()', description: 'Función de Excel', insertText: 'XIRR()', detail: '💰 Financieras' },
  { name: 'XNPV', signature: 'XNPV()', description: 'Función de Excel', insertText: 'XNPV()', detail: '💰 Financieras' },
  { name: 'XOR', signature: 'XOR()', description: 'Función de Excel', insertText: 'XOR()', detail: '🔀 Lógicas' },
  { name: 'YEAR', signature: 'YEAR()', description: 'Función de Excel', insertText: 'YEAR()', detail: '📅 Fechas' },
  { name: 'YEARFRAC', signature: 'YEARFRAC()', description: 'Función de Excel', insertText: 'YEARFRAC()', detail: '📅 Fechas' },
];

export default function MonacoFormulaEditor({ value, onChange }: MonacoFormulaEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [autocompleteData, setAutocompleteData] = useState<AutocompleteData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [showValidation, setShowValidation] = useState(false); // Nuevo estado para validación manual

  // Cargar datos de autocompletado
  useEffect(() => {
    const loadAutocompleteData = async () => {
      try {
        const response = await fetch('/api/kpis/autocomplete-data');
        if (response.ok) {
          const data = await response.json();
          setAutocompleteData(data);
        }
      } catch (error) {
        console.error('Error loading autocomplete data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    loadAutocompleteData();
  }, []);

  // Extraer variables automáticamente
  useEffect(() => {
    const variables = extractVariablesFromFormula(value);
    setDetectedVariables(variables);
  }, [value]);

  const handleEditorDidMount: OnMount = (monacoEditor, monaco) => {
    editorRef.current = monacoEditor;

    // CRÍTICO: Configurar el lenguaje para que reconozca palabras desde el primer carácter
    monaco.languages.setLanguageConfiguration('plaintext', {
      wordPattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
    });

    // Registrar proveedor de autocompletado
    // SOLUCIÓN: Solo incluir caracteres especiales para contextos específicos
    // NO incluir letras - quickSuggestions maneja las letras automáticamente
    monaco.languages.registerCompletionItemProvider('plaintext', {
      triggerCharacters: ['(', ',', ' ', ':', '"', '{'], // Solo símbolos, NO letras
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);

        // LOG: Provider fue llamado
        console.log('%c[Provider Called]', 'color: #d7ba7d; font-weight: bold', {
          word: word.word,
          position: { line: position.lineNumber, column: position.column },
        });

        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const lineText = model.getLineContent(position.lineNumber);
        const beforeCursor = lineText.substring(0, position.column - 1);

        let suggestions: any[] = [];

        // Detectar contexto: ¿estamos dentro de una función del sistema?
        const inSystemFunction = SYSTEM_FUNCTIONS.find(fn => {
          const functionStart = textUntilPosition.lastIndexOf(fn.name + '(');
          if (functionStart === -1) return false;

          const afterFunction = textUntilPosition.substring(functionStart);
          const openParens = (afterFunction.match(/\(/g) || []).length;
          const closeParens = (afterFunction.match(/\)/g) || []).length;

          return openParens > closeParens;
        });

        // Detectar si estamos dentro de un objeto de parámetros {}
        const insideObjectBraces = () => {
          let braceCount = 0;
          for (let i = textUntilPosition.length - 1; i >= 0; i--) {
            if (textUntilPosition[i] === '}') braceCount++;
            if (textUntilPosition[i] === '{') {
              braceCount--;
              if (braceCount < 0) return true; // Estamos dentro de {}
            }
          }
          return false;
        };

        // Detectar si estamos dentro de comillas ""
        const insideQuotes = () => {
          const quotesBeforeCursor = (beforeCursor.match(/"/g) || []).length;
          return quotesBeforeCursor % 2 === 1; // Número impar de comillas = estamos dentro
        };

        if (inSystemFunction && autocompleteData) {
          // Estamos dentro de una función del sistema

          // Detectar si estamos escribiendo el valor de un parámetro (después de ":" y posiblemente dentro de "")
          const paramValueMatch = beforeCursor.match(/(\w+):\s*"([^"]*)$/);

          if (paramValueMatch) {
            const paramName = paramValueMatch[1];
            // Estamos escribiendo el valor dentro de comillas

            // Autocompletar valores según el parámetro
            if (paramName === 'status') {
              suggestions = autocompleteData.statuses.map(status => ({
                label: status.label,
                kind: monaco.languages.CompletionItemKind.EnumMember,
                detail: status.description,
                insertText: `"${status.value}"`,
                range: range,
                sortText: '0' + status.label,
              }));
            } else if (paramName === 'userName' || paramName === 'projectManagerName') {
              suggestions = autocompleteData.users.map(user => ({
                label: user.label,
                kind: monaco.languages.CompletionItemKind.User,
                detail: `Área: ${user.area || 'N/A'}`,
                insertText: `"${user.value}"`,
                range: range,
                documentation: `Email: ${user.email}`,
                sortText: '0' + user.name,
              }));
            } else if (paramName === 'projectName') {
              suggestions = autocompleteData.projects.map(project => ({
                label: project.label,
                kind: monaco.languages.CompletionItemKind.Module,
                detail: 'Proyecto',
                insertText: `"${project.value}"`,
                range: range,
                sortText: '0' + project.name,
              }));
            } else if (paramName === 'initiativeName') {
              suggestions = autocompleteData.initiatives.map(initiative => ({
                label: initiative.label,
                kind: monaco.languages.CompletionItemKind.Class,
                detail: 'Iniciativa Estratégica',
                insertText: `"${initiative.value}"`,
                range: range,
                sortText: '0' + initiative.name,
              }));
            } else if (paramName === 'clientName') {
              suggestions = autocompleteData.clients.map(client => ({
                label: client.label,
                kind: monaco.languages.CompletionItemKind.Reference,
                detail: 'Cliente',
                insertText: `"${client.value}"`,
                range: range,
                sortText: '0' + client.name,
              }));
            } else if (paramName === 'area') {
              suggestions = autocompleteData.areas.map(area => ({
                label: area.label,
                kind: monaco.languages.CompletionItemKind.Folder,
                detail: 'Área',
                insertText: `"${area.value}"`,
                range: range,
                sortText: '0' + area.value,
              }));
            } else if (paramName === 'role') {
              suggestions = autocompleteData.roles.map(role => ({
                label: role.label,
                kind: monaco.languages.CompletionItemKind.EnumMember,
                detail: role.description,
                insertText: `"${role.value}"`,
                range: range,
                sortText: '0' + role.label,
              }));
            } else if (paramName === 'isCompleted' || paramName === 'isActive' || paramName === 'isAreaLeader' || paramName === 'isCarriedOver') {
              suggestions = [
                {
                  label: 'true',
                  kind: monaco.languages.CompletionItemKind.Constant,
                  detail: 'Verdadero',
                  insertText: 'true',
                  range: range,
                  sortText: '0true',
                },
                {
                  label: 'false',
                  kind: monaco.languages.CompletionItemKind.Constant,
                  detail: 'Falso',
                  insertText: 'false',
                  range: range,
                  sortText: '0false',
                }
              ];
            }
          } else if (insideObjectBraces() && !insideQuotes()) {
            // Estamos dentro de {} pero NO dentro de comillas
            // Esto significa que estamos escribiendo un nombre de parámetro

            // Verificar si ya hay dos puntos después del cursor (entonces estamos escribiendo el nombre)
            const afterCursor = lineText.substring(position.column - 1);
            const hasColonAfter = afterCursor.match(/^\w*:/);

            if (!hasColonAfter) {
              // No hay ":" después, estamos escribiendo el nombre de un parámetro
              const availableParams = inSystemFunction.params;

              suggestions = availableParams.map(param => {
                let detail = 'Parámetro';
                let insertText = `${param}: `;

                if (param.includes('Name')) {
                  detail = 'Nombre (autocompletado disponible)';
                  insertText = `${param}: ""`;
                } else if (param === 'status') {
                  detail = 'Estado (autocompletado disponible)';
                  insertText = `${param}: ""`;
                } else if (param.startsWith('is')) {
                  detail = 'Booleano (true/false)';
                  insertText = `${param}: true`;
                } else if (param.includes('Date') || param.includes('week')) {
                  detail = 'Fecha (formato: "YYYY-MM-DD")';
                  insertText = `${param}: "2025-01-01"`;
                } else if (param.includes('Min') || param.includes('Max')) {
                  detail = 'Número (0-100)';
                  insertText = `${param}: 0`;
                }

                return {
                  label: param,
                  kind: monaco.languages.CompletionItemKind.Property,
                  detail: detail,
                  insertText: insertText,
                  range: range,
                  sortText: '0' + param,
                };
              });
            }
          } else if (beforeCursor.match(/{\s*$/)) {
            // Acabamos de abrir llaves, sugerir parámetros disponibles para esta función
            const availableParams = inSystemFunction.params;

            suggestions = availableParams.map(param => {
              let detail = 'Parámetro';
              let insertText = `${param}: `;

              if (param.includes('Name')) {
                detail = 'Nombre (autocompletado disponible)';
                insertText = `${param}: ""`;
              } else if (param === 'status') {
                detail = 'Estado (autocompletado disponible)';
                insertText = `${param}: ""`;
              } else if (param.startsWith('is')) {
                detail = 'Booleano (true/false)';
                insertText = `${param}: true`;
              } else if (param.includes('Date') || param.includes('week')) {
                detail = 'Fecha (formato: "YYYY-MM-DD")';
                insertText = `${param}: "2025-01-01"`;
              } else if (param.includes('Min') || param.includes('Max')) {
                detail = 'Número (0-100)';
                insertText = `${param}: 0`;
              }

              return {
                label: param,
                kind: monaco.languages.CompletionItemKind.Property,
                detail: detail,
                insertText: insertText,
                range: range,
                sortText: '0' + param,
              };
            });
          } else if (beforeCursor.match(/,\s*$/)) {
            // Después de una coma, sugerir más parámetros
            const availableParams = inSystemFunction.params;

            suggestions = availableParams.map(param => {
              let insertText = `${param}: `;

              if (param.includes('Name') || param === 'status' || param === 'role' || param === 'area') {
                insertText = `${param}: ""`;
              } else if (param.startsWith('is')) {
                insertText = `${param}: true`;
              } else if (param.includes('Date') || param.includes('week')) {
                insertText = `${param}: "2025-01-01"`;
              } else if (param.includes('Min') || param.includes('Max')) {
                insertText = `${param}: 0`;
              }

              return {
                label: param,
                kind: monaco.languages.CompletionItemKind.Property,
                detail: 'Parámetro adicional',
                insertText: insertText,
                range: range,
                sortText: '0' + param,
              };
            });
          }
        } else if (!insideQuotes() && !insideObjectBraces()) {
          // No estamos dentro de una función del sistema NI dentro de comillas NI dentro de {}
          // Aquí sí podemos sugerir funciones

          // CRÍTICO: Pre-filtrar funciones basándose en la palabra actual
          // Monaco NO filtra automáticamente, nosotros debemos hacerlo
          const wordUpper = word.word.toUpperCase();

          const systemSuggestions = SYSTEM_FUNCTIONS
            .filter(func => wordUpper === '' || func.name.toUpperCase().startsWith(wordUpper))
            .slice(0, 5) // LÍMITE: máximo 5 sugerencias de sistema
            .map(func => ({
              label: {
                label: func.name,
                description: func.signature, // Mostrar signature al lado del nombre
              },
              kind: monaco.languages.CompletionItemKind.Function,
              detail: func.detail,
              documentation: {
                value: `**${func.signature}**\n\n${func.description}\n\n${func.documentation}`,
                isTrusted: true,
              },
              insertText: func.insertText,
              range: range,
              sortText: '!' + func.name, // ! da máxima prioridad en el ordenamiento
              filterText: func.name, // Asegurar que Monaco use el nombre completo para filtrar
            }));

          const excelSuggestions = EXCEL_FUNCTIONS
            .filter(func => wordUpper === '' || func.name.toUpperCase().startsWith(wordUpper))
            .slice(0, 5) // LÍMITE: máximo 5 sugerencias de Excel
            .map(func => ({
              label: {
                label: func.name,
                description: func.signature, // Mostrar signature al lado del nombre
              },
              kind: monaco.languages.CompletionItemKind.Function,
              detail: func.detail,
              documentation: {
                value: `**${func.signature}**\n\n${func.description}`,
                isTrusted: true,
              },
              insertText: func.insertText,
              range: range,
              sortText: '!!' + func.name, // !! para Excel (después de funciones del sistema)
              filterText: func.name, // Asegurar que Monaco use el nombre completo para filtrar
            }));

          suggestions = [...systemSuggestions, ...excelSuggestions];
        }

        // Si no hay sugerencias específicas de contexto, siempre mostrar las funciones
        // Esto evita que Monaco muestre sugerencias de variables por defecto
        if (suggestions.length === 0 && !insideQuotes() && !insideObjectBraces()) {
          // CRÍTICO: Pre-filtrar las funciones basándose en la palabra actual
          // Monaco espera que nosotros hagamos el filtrado, no lo hace automáticamente
          const wordUpper = word.word.toUpperCase();

          const systemSuggestions = SYSTEM_FUNCTIONS
            .filter(func => wordUpper === '' || func.name.toUpperCase().startsWith(wordUpper))
            .slice(0, 5) // LÍMITE: máximo 5 sugerencias de sistema
            .map(func => ({
              label: {
                label: func.name,
                description: func.signature,
              },
              kind: monaco.languages.CompletionItemKind.Function,
              detail: func.detail,
              documentation: {
                value: `**${func.signature}**\n\n${func.description}\n\n${func.documentation}`,
                isTrusted: true,
              },
              insertText: func.insertText,
              range: range,
              sortText: '!' + func.name, // ! da máxima prioridad
              filterText: func.name,
            }));

          const excelSuggestions = EXCEL_FUNCTIONS
            .filter(func => wordUpper === '' || func.name.toUpperCase().startsWith(wordUpper))
            .slice(0, 5) // LÍMITE: máximo 5 sugerencias de Excel
            .map(func => ({
              label: {
                label: func.name,
                description: func.signature,
              },
              kind: monaco.languages.CompletionItemKind.Function,
              detail: func.detail,
              documentation: {
                value: `**${func.signature}**\n\n${func.description}`,
                isTrusted: true,
              },
              insertText: func.insertText,
              range: range,
              sortText: '!!' + func.name, // !! para Excel
              filterText: func.name,
            }));

          suggestions = [...systemSuggestions, ...excelSuggestions];
        }

        // LOG: Qué estamos retornando
        console.log('%c[Provider Return]', 'color: #89d185; font-weight: bold', {
          word: word.word,
          suggestionCount: suggestions.length,
          firstFew: suggestions.slice(0, 5).map(s => typeof s.label === 'object' ? s.label.label : s.label),
          incomplete: false,
        });

        return {
          suggestions: suggestions,
          incomplete: false, // IMPORTANTE: false = lista completa, Monaco no buscará más providers
        };
      },
    });

    // Configurar tema
    monaco.editor.defineTheme('formulaTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1f2937',
      },
    });

    // DIAGNÓSTICO: Logs detallados para entender qué está pasando
    console.log('%c[Monaco Setup] Editor montado y configurado', 'color: #4ec9b0; font-weight: bold');
    console.log('  - quickSuggestions:', monacoEditor.getOption(monaco.editor.EditorOption.quickSuggestions));
    console.log('  - suggestOnTriggerCharacters:', monacoEditor.getOption(monaco.editor.EditorOption.suggestOnTriggerCharacters));

    // SOLUCIÓN: Forzar que Monaco muestre sugerencias incluso con 1 carácter
    let lastTriggerTime = 0;
    monacoEditor.onDidChangeModelContent((e) => {
      // Log de cambios
      const changes = e.changes;
      if (changes.length > 0) {
        const lastChange = changes[changes.length - 1];
        console.log('%c[Monaco Change]', 'color: #569cd6; font-weight: bold', {
          text: lastChange.text,
          isLetter: /[a-zA-Z]/.test(lastChange.text),
        });
      }

      // Obtener la posición del cursor
      const position = monacoEditor.getPosition();
      if (!position) {
        console.log('%c[Monaco] No position', 'color: #f48771');
        return;
      }

      const model = monacoEditor.getModel();
      if (!model) {
        console.log('%c[Monaco] No model', 'color: #f48771');
        return;
      }

      // Obtener la palabra actual
      const word = model.getWordUntilPosition(position);
      console.log('%c[Monaco Word]', 'color: #ce9178', {
        word: word.word,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
        length: word.word.length,
      });

      // Si hay una palabra (aunque sea de 1 letra)
      if (word.word.length > 0 && word.word.length <= 2) {
        // Evitar triggers repetidos demasiado rápido
        const now = Date.now();
        if (now - lastTriggerTime < 50) {
          console.log('%c[Monaco] Trigger skipped (too soon)', 'color: #f48771');
          return;
        }
        lastTriggerTime = now;

        // Forzar trigger de sugerencias
        console.log('%c[Monaco] ⚡ TRIGGERING SUGGEST', 'color: #89d185; font-weight: bold', word.word);
        setTimeout(() => {
          monacoEditor.trigger('keyboard', 'editor.action.triggerSuggest', {});

          // DEBUG: Verificar estado del suggest widget
          setTimeout(() => {
            try {
              const suggestController = monacoEditor.getContribution('editor.contrib.suggestController');
              if (suggestController) {
                // @ts-ignore - accedemos a propiedades internas para debugging
                const state = suggestController.model?.state;
                console.log('%c[Monaco Widget State]', 'color: #f48771', {
                  state: state, // 0 = closed, 1 = loading, 2 = open
                  isVisible: state === 2,
                });
              }
            } catch (e) {
              console.error('Error checking suggest state:', e);
            }
          }, 50);
        }, 1);
      } else {
        console.log('%c[Monaco] No trigger needed', 'color: #888', 'word length:', word.word.length);
      }
    });
  };

  const validateFormula = () => {
    if (!value.trim()) return null;

    try {
      const Parser = require('hot-formula-parser').Parser;
      const parser = new Parser();

      // Asignar valores de prueba a las variables detectadas
      // Usar 0.5 en lugar de 100 para evitar errores en funciones trigonométricas
      // (ASIN, ACOS requieren valores entre -1 y 1)
      detectedVariables.forEach((varName) => {
        parser.setVariable(varName, 0.5);
      });

      // Reemplazar funciones del sistema con valores de prueba
      // Usando un enfoque más robusto que maneja anidamiento
      let processedFormula = value;

      // Función helper para encontrar el cierre de paréntesis correcto
      const findClosingParen = (str: string, startIndex: number): number => {
        let depth = 1;
        for (let i = startIndex; i < str.length; i++) {
          if (str[i] === '(') depth++;
          else if (str[i] === ')') {
            depth--;
            if (depth === 0) return i;
          }
        }
        return -1;
      };

      const systemFunctionNames = [
        'COUNT_PRIORITIES', 'SUM_PRIORITIES', 'AVG_PRIORITIES',
        'COUNT_MILESTONES', 'COUNT_PROJECTS', 'COUNT_USERS',
        'COMPLETION_RATE', 'PERCENTAGE'
      ];

      // Reemplazar desde el más interno hacia afuera (máximo 20 iteraciones para evitar loops infinitos)
      let maxIterations = 20;
      let iteration = 0;
      let foundSystemFunction = true;

      while (foundSystemFunction && iteration < maxIterations) {
        foundSystemFunction = false;
        iteration++;

        for (const funcName of systemFunctionNames) {
          const funcIndex = processedFormula.indexOf(funcName + '(');
          if (funcIndex !== -1) {
            foundSystemFunction = true;
            const openParenIndex = funcIndex + funcName.length;
            const closeParenIndex = findClosingParen(processedFormula, openParenIndex + 1);

            if (closeParenIndex !== -1) {
              const fullMatch = processedFormula.substring(funcIndex, closeParenIndex + 1);

              let testValue = 50;
              switch (funcName) {
                case 'COUNT_PRIORITIES':
                case 'COUNT_MILESTONES':
                case 'COUNT_PROJECTS':
                case 'COUNT_USERS':
                  testValue = 100;
                  break;
                case 'COMPLETION_RATE':
                  testValue = 75.5;
                  break;
                case 'PERCENTAGE':
                  testValue = 50;
                  break;
                case 'SUM_PRIORITIES':
                  testValue = 500;
                  break;
                case 'AVG_PRIORITIES':
                  testValue = 65.3;
                  break;
              }

              processedFormula = processedFormula.replace(fullMatch, testValue.toString());
              break; // Salir del loop de funciones para recalcular índices
            }
          }
        }
      }

      const result = parser.parse(processedFormula);

      if (result.error) {
        return { valid: false, error: result.error };
      }

      // Formatear el resultado según su tipo
      let formattedResult = result.result;

      if (result.result instanceof Date) {
        // Si es una fecha, formatearla legiblemente
        formattedResult = result.result.toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (typeof result.result === 'number') {
        // Si es un número, formatearlo con 2 decimales máximo
        formattedResult = Number.isInteger(result.result)
          ? result.result
          : result.result.toFixed(2);
      } else if (typeof result.result === 'boolean') {
        formattedResult = result.result ? 'Verdadero' : 'Falso';
      } else if (result.result === null || result.result === undefined) {
        formattedResult = 'Sin valor';
      } else if (typeof result.result === 'object') {
        formattedResult = JSON.stringify(result.result);
      }

      return { valid: true, result: formattedResult, rawResult: result.result };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  };

  const downloadPDF = async () => {
    try {
      setIsDownloading(true);
      const { generateSystemDataDocsPDF } = await import('@/lib/kpi-utils/generate-docs-pdf');
      generateSystemDataDocsPDF();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error al descargar el PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const validation = validateFormula();

  return (
    <>
      {/* CSS FIX: Asegurar que el widget de sugerencias de Monaco sea visible */}
      <style jsx global>{`
        .monaco-editor .suggest-widget {
          z-index: 9999 !important;
          visibility: visible !important;
          opacity: 1 !important;
          display: flex !important;
        }
        .monaco-editor .suggest-widget .monaco-list {
          max-height: 250px !important;
          min-height: 40px !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .monaco-editor .suggest-widget .monaco-list .monaco-list-row {
          height: auto !important;
          min-height: 24px !important;
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .monaco-editor .suggest-widget .monaco-list .monaco-list-row .label {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .monaco-editor .suggest-widget .details {
          display: block !important;
        }
      `}</style>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fórmula de cálculo {loadingData && <span className="text-xs text-gray-500">(cargando datos...)</span>}
            </label>
          <button
            type="button"
            onClick={downloadPDF}
            disabled={isDownloading}
            className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {isDownloading ? 'Descargando...' : 'Descargar Documentación PDF'}
          </button>
        </div>

        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-900">
          <Editor
            height="200px"
            defaultLanguage="plaintext"
            value={value}
            onChange={(newValue) => onChange(newValue || '')}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              lineNumbers: 'off',
              glyphMargin: false,
              folding: false,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 0,
              renderLineHighlight: 'none',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              fontSize: 14,
              fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Monaco, "Courier New", monospace',
              suggest: {
                showKeywords: false,
                showSnippets: true,
                insertMode: 'replace',
                snippetsPreventQuickSuggestions: false,
                filterGraceful: true,
                showWords: false,
                localityBonus: false,
                shareSuggestSelections: false,
                showIcons: true,
                showFunctions: true,
                showVariables: false,
                preview: true,
                previewMode: 'subwordSmart',
                selectionMode: 'always',
                showStatusBar: true, // Mostrar barra de estado del suggest
              },
              quickSuggestions: true, // CAMBIO CRÍTICO: true simple en lugar de objeto
              quickSuggestionsDelay: 0,
              parameterHints: {
                enabled: true,
              },
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnCommitCharacter: false, // Evitar que caracteres especiales confirmen sugerencias
              acceptSuggestionOnEnter: 'on',
              tabCompletion: 'on',
              wordBasedSuggestions: 'off',
            }}
          />
        </div>

        <div className="mt-2 flex items-start gap-2">
          <div className="flex-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              💡 Autocompletado instantáneo: escribe una letra y aparecen las sugerencias automáticamente
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              ✨ 382 funciones de Excel + funciones del sistema con datos reales (usuarios, proyectos, iniciativas)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowValidation(!showValidation)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 transition-colors whitespace-nowrap"
          >
            {showValidation ? '👁️ Ocultar validación' : '🔍 Validar fórmula'}
          </button>
        </div>

        {showValidation && validation && (
          <div
            className={`mt-3 p-3 rounded-lg text-sm ${
              validation.valid
                ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
            }`}
          >
            {validation.valid ? (
              <div>
                <strong>✓ Fórmula válida</strong>
                <div className="mt-1">
                  <span className="text-xs opacity-75">Resultado de prueba:</span>
                  <div className="font-mono font-bold mt-1">
                    {validation.result}
                  </div>
                  {(validation as any).rawResult && (
                    <div className="text-xs mt-2 opacity-75">
                      Tipo: {
                        (validation as any).rawResult instanceof Date
                          ? '📅 Fecha'
                          : typeof (validation as any).rawResult === 'number'
                          ? '🔢 Número'
                          : typeof (validation as any).rawResult === 'boolean'
                          ? '✅ Booleano'
                          : typeof (validation as any).rawResult === 'string'
                          ? '📝 Texto'
                          : '📦 Objeto'
                      }
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <strong>✗ Error en la fórmula</strong>
                <div className="mt-1">{validation.error}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {detectedVariables.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h5 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
            📋 Variables detectadas en la fórmula:
          </h5>
          <div className="flex flex-wrap gap-2">
            {detectedVariables.map((varName) => (
              <span
                key={varName}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-sm font-mono"
              >
                {varName}
              </span>
            ))}
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-3">
            💡 Estas variables se solicitarán al registrar valores para este KPI
          </p>
        </div>
      )}
      </div>
    </>
  );
}
