# Script de Importación de Horas desde Azure DevOps

## Descripción

Este script importa las horas trabajadas desde Azure DevOps hacia el sistema de prioridades.

Para cada prioridad ligada a Azure DevOps:
1. Obtiene las tareas hijas (child tasks) del Work Item en Azure DevOps
2. Busca las tareas correspondientes en el checklist de la prioridad
3. Actualiza el campo `completedHours` con el valor de `Microsoft.VSTS.Scheduling.CompletedWork` desde Azure DevOps

## Uso

### Importar horas para todos los usuarios

```bash
npx tsx scripts/import-hours-from-azure.ts
```

### Importar horas para un usuario específico

```bash
npx tsx scripts/import-hours-from-azure.ts <userId>
```

**Ejemplo:**
```bash
npx tsx scripts/import-hours-from-azure.ts 507f1f77bcf86cd799439011
```

## Requisitos

- El usuario debe tener una configuración activa de Azure DevOps (`AzureDevOpsConfig`)
- La prioridad debe estar ligada a un Work Item de Azure DevOps (`AzureDevOpsWorkItem`)
- Las tareas en el checklist deben tener el mismo título (`System.Title`) que las tareas en Azure DevOps

## Comportamiento

### Actualización de Horas

- Solo actualiza tareas que tienen horas completadas (`CompletedWork > 0`) en Azure DevOps
- Solo actualiza si el valor es diferente al actual en la base de datos
- Respeta el estado actual de las tareas (completadas/pendientes)

### Coincidencia de Tareas

Las tareas se emparejan por título exacto:
- Título en checklist local: `checklistItem.text`
- Título en Azure DevOps: `task.fields['System.Title']`

**Importante:** Los títulos deben coincidir exactamente para que se importen las horas.

## Salida del Script

El script muestra:

1. **Progreso por prioridad:**
   - Título de la prioridad
   - Usuario asignado
   - Work Item ID
   - Número de tareas encontradas
   - Actualizaciones realizadas (tarea: horas anteriores → horas nuevas)

2. **Resumen general:**
   - Total de prioridades actualizadas
   - Total de tareas procesadas
   - Total de tareas actualizadas
   - Total de horas importadas
   - Número de errores

3. **Estadísticas por usuario:**
   - Nombre del usuario
   - Prioridades actualizadas
   - Tareas actualizadas
   - Horas importadas

## Ejemplo de Salida

```
🔄 Iniciando importación de horas desde Azure DevOps...

✅ Conectado a MongoDB

📊 Encontrados 47 vínculos de Azure DevOps

📋 Procesando: "Integración azure devops con sistema de prioridades"
   Usuario: Luis García
   Work Item ID: 11808
   📝 Tareas encontradas en Azure DevOps: 2
   ✅ "elaborar integracion": 0h → 8h
   ✅ "pruebas de despliegue": 0h → 4h
   📊 Resumen: 2 tareas actualizadas, 12h importadas

============================================================
📊 RESUMEN DE IMPORTACIÓN
============================================================
✅ Prioridades actualizadas: 35
📝 Tareas procesadas: 280
✏️  Tareas actualizadas: 145
⏱️  Horas importadas: 580h
❌ Errores: 0

📈 Estadísticas por usuario:
------------------------------------------------------------

👤 Luis García
   Prioridades: 10
   Tareas actualizadas: 40
   Horas importadas: 160h

✅ Importación completada
```

## Casos de Error

El script maneja los siguientes casos de error:

1. **Configuración de Azure DevOps no encontrada**
   - Mensaje: `⚠️  No hay configuración de Azure DevOps activa para este usuario`
   - Acción: Continúa con la siguiente prioridad

2. **No hay tareas hijas en Azure DevOps**
   - Mensaje: `ℹ️  No hay tareas hijas para importar`
   - Acción: Continúa con la siguiente prioridad

3. **Prioridad sin checklist**
   - Mensaje: `ℹ️  La prioridad no tiene checklist`
   - Acción: Continúa con la siguiente prioridad

4. **Error de API de Azure DevOps**
   - Mensaje: `❌ Error procesando prioridad: <mensaje de error>`
   - Acción: Incrementa contador de errores y continúa

## Notas Importantes

- El script NO modifica datos en Azure DevOps, solo lee
- El script actualiza el campo `updatedAt` de las prioridades modificadas
- Las horas se importan en el formato de Azure DevOps (horas decimales)
- Si una tarea existe en el checklist pero no en Azure DevOps, no se modifica
- Si una tarea existe en Azure DevOps pero no en el checklist, se ignora

## Frecuencia Recomendada

Se recomienda ejecutar este script:
- **Semanalmente:** Al final de cada semana para actualizar horas de la semana
- **Antes de generar reportes:** Para asegurar que las horas estén actualizadas
- **Después de una migración:** Si se agregaron vínculos masivos a Azure DevOps

## Seguridad

- Requiere credenciales válidas de Azure DevOps (Personal Access Token)
- Usa la configuración existente de cada usuario (`AzureDevOpsConfig`)
- No expone tokens en la salida del script
