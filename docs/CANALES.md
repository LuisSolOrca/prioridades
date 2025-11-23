# Sistema de Canales - Documentación Completa

## Índice
1. [Introducción](#introducción)
2. [Características Principales](#características-principales)
3. [Mensajería](#mensajería)
4. [Menciones](#menciones)
5. [Reacciones](#reacciones)
6. [Threads (Hilos)](#threads-hilos)
7. [Mensajes Anclados](#mensajes-anclados)
8. [Búsqueda](#búsqueda)
9. [Slash Commands](#slash-commands)
10. [Notificaciones](#notificaciones)
11. [Gestión de Usuarios Eliminados](#gestión-de-usuarios-eliminados)

---

## Introducción

El sistema de **Canales** es una plataforma de comunicación en tiempo real integrada en cada proyecto, diseñada para facilitar la colaboración del equipo mediante chat, comandos especializados y funcionalidades avanzadas de gestión de conversaciones.

**Ubicación:** `/projects/[id]/canales`

---

## Características Principales

### ✅ Funcionalidades Disponibles

- ✉️ **Chat en tiempo real** con mensajes persistentes
- 👥 **Menciones de usuarios** con notificaciones
- 📌 **Menciones de prioridades** con previsualizaciones
- 😄 **Reacciones con emojis** (👍 ❤️ 😄 🎉)
- 🧵 **Threads/hilos** para conversaciones organizadas
- 📍 **Mensajes anclados** (máximo 5)
- 🔍 **Búsqueda avanzada** por contenido y usuario
- ⚡ **30+ Slash commands** para acciones rápidas
- ✏️ **Edición y eliminación** de mensajes propios
- 🔔 **Notificaciones** por email y en aplicación
- 👻 **Soporte para usuarios eliminados**

---

## Mensajería

### Enviar Mensajes

- Escribe en el campo de texto y presiona **Enter** para enviar
- **Shift + Enter** para agregar una nueva línea sin enviar
- Los mensajes se muestran en orden cronológico (más recientes abajo)
- Auto-scroll al recibir nuevos mensajes

### Editar Mensajes

1. Pasa el mouse sobre tu mensaje
2. Haz clic en el ícono de **Editar** (✏️)
3. Modifica el contenido
4. Presiona el botón de confirmar (✓)

**Nota:** Solo puedes editar tus propios mensajes. Los mensajes editados muestran la etiqueta _(editado)_.

### Eliminar Mensajes

1. Pasa el mouse sobre el mensaje
2. Haz clic en el ícono de **Eliminar** (🗑️)
3. Confirma la eliminación

**Permisos:**
- Usuarios pueden eliminar sus propios mensajes
- Administradores pueden eliminar cualquier mensaje

---

## Menciones

### Menciones de Usuarios (@usuario)

Menciona a miembros del equipo para llamar su atención:

```
@Juan Pérez ¿puedes revisar esto?
@María podemos agendar una reunión
```

**Características:**
- **Autocompletado**: Escribe `@` y aparece una lista de usuarios disponibles
- **Notificaciones**: El usuario mencionado recibe notificación por email y en la app
- **Búsqueda**: Filtra usuarios escribiendo después del `@`
- **Compatible con slash commands**: Puedes usar menciones en comandos como `/question @usuario "pregunta"`

### Menciones de Prioridades (#prioridad)

Vincula prioridades del proyecto en tus mensajes:

**Formato 1: Por ID**
```
#P-507f1f77bcf86cd799439011
```

**Formato 2: Por título**
```
#implementar-api-rest
#corregir-bug-login
```

**Características:**
- Detecta automáticamente prioridades del proyecto
- Muestra información de la prioridad (título, estado, progreso)
- Búsqueda inteligente por título (ignora mayúsculas/minúsculas)
- Reemplaza espacios con guiones en el título

---

## Reacciones

### Agregar Reacciones

Cada mensaje muestra 4 emojis de acceso rápido:
- 👍 Pulgar arriba
- ❤️ Corazón
- 😄 Cara feliz
- 🎉 Celebración

**Uso:**
1. Haz clic en el emoji debajo del mensaje
2. La reacción se agrega o se quita si ya reaccionaste

### Ver Quién Reaccionó

Pasa el mouse sobre una reacción para ver:
- Lista de usuarios que reaccionaron
- Cantidad total de reacciones

**Características:**
- Un usuario puede reaccionar múltiples veces con diferentes emojis
- Las reacciones se agrupan por tipo
- Se resaltan las reacciones que tú has dado

---

## Threads (Hilos)

Los **threads** permiten crear conversaciones organizadas sin saturar el canal principal.

### Crear un Thread

1. Pasa el mouse sobre cualquier mensaje
2. Haz clic en el ícono **💬 Responder en hilo**
3. Se abre un modal con el mensaje original
4. Escribe tu respuesta

### Características

- **Indicador visual**: Mensajes con respuestas muestran un borde azul
- **Contador de respuestas**: Badge que muestra cuántas respuestas hay
- **Vista modal**: Thread completo en ventana separada
- **Reacciones en threads**: Puedes reaccionar a mensajes dentro del thread
- **Edición/eliminación**: Mismas reglas que mensajes principales
- **Notificaciones**: El autor del mensaje original recibe notificación de respuestas

### Abrir un Thread Existente

Haz clic en el badge de respuestas:
```
💬 3 respuestas
```

### Cerrar un Thread

- Haz clic en la **X** en la esquina superior derecha del modal
- Los mensajes se recargan automáticamente para actualizar contadores

---

## Mensajes Anclados

Ancla mensajes importantes para que siempre estén visibles en la parte superior del canal.

### Anclar un Mensaje

1. Pasa el mouse sobre el mensaje
2. Haz clic en el ícono **📍 Anclar**
3. El mensaje aparece en la sección de mensajes anclados

### Desanclar un Mensaje

1. En la sección de mensajes anclados, haz clic en **📍 Desanclar**
2. El mensaje regresa al flujo normal del chat

### Límites y Características

- **Máximo:** 5 mensajes anclados por canal
- **Sección dedicada**: Área amarilla en la parte superior del chat
- **Información**: Muestra quién ancló el mensaje y cuándo
- **Scroll independiente**: Si hay muchos mensajes anclados

**Permisos:**
- Cualquier usuario puede anclar mensajes
- Solo quien ancló o un admin puede desanclar

---

## Búsqueda

### Búsqueda en Tiempo Real

La barra de búsqueda en la parte superior del chat permite buscar:

**Por contenido:**
```
reunión
API REST
bug crítico
```

**Por usuario:**
```
Juan
maria@empresa.com
```

### Características

- **Debounce**: Espera 500ms después de dejar de escribir
- **Búsqueda difusa**: Ignora mayúsculas/minúsculas
- **Contador de resultados**: Muestra cuántos mensajes encontrados
- **Resaltado**: Los resultados se muestran en el chat principal
- **Limpiar búsqueda**: Botón X para borrar y volver a todos los mensajes

---

## Slash Commands

Los **slash commands** son comandos especiales que empiezan con `/` para ejecutar acciones rápidas.

### Cómo Usar

1. Escribe `/` en el campo de mensaje
2. Aparece lista de comandos disponibles con autocompletado
3. Selecciona un comando o continúa escribiendo
4. Presiona Enter para ejecutar

### Categorías de Comandos

#### 📊 Estado y Análisis (Status)

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/status` | Estado actual del proyecto con métricas visuales | `/status` |
| `/progress` | Progreso detallado con timeline y roadmap | `/progress` |
| `/schedule` | Calendario de hitos y deadlines | `/schedule [week\|month]` |

#### 📈 Análisis Avanzado (Analysis)

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/summary` | Resumen de actividad del proyecto | `/summary [24h\|week\|month]` |
| `/team-load` | Distribución de carga por usuario | `/team-load` |
| `/burndown` | Gráfico burndown de la semana | `/burndown` |
| `/blockers` | Lista de prioridades bloqueadas | `/blockers` |
| `/risks` | Prioridades en riesgo | `/risks` |
| `/search` | Búsqueda avanzada de datos | `/search [tipo] [término]` |
| `/recent` | Actividad reciente de un usuario | `/recent @usuario [días]` |
| `/my-stats` | Tus estadísticas personales | `/my-stats` |
| `/mention-stats` | Análisis de menciones y colaboración | `/mention-stats` |
| `/ai-summary` | Resumen inteligente del chat con IA | `/ai-summary [N mensajes]` |
| `/export` | Exportar datos del proyecto | `/export [excel\|pdf\|csv]` |

#### 🤝 Colaboración (Collaboration)

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/celebrate` | Celebra logros del equipo | `/celebrate @usuario "logro"` |
| `/poll` | Crea una encuesta | `/poll "¿Pregunta?" "Op1" "Op2"` |
| `/standup` | Daily standup virtual | `/standup` |
| `/question` | Pregunta a un stakeholder | `/question @usuario "¿pregunta?"` |

#### ⚙️ Gestión (Management)

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/quick-priority` | Crea prioridad rápida | `/quick-priority "Título"` |
| `/priorities` | Lista prioridades filtradas | `/priorities [filtros]` |
| `/decision` | Registra decisión importante | `/decision "descripción"` |

#### ℹ️ Ayuda (Help)

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/help` | Muestra lista de comandos | `/help` |

### Ejemplos de Uso

**Crear una prioridad rápida:**
```
/quick-priority "Implementar autenticación OAuth"
```

**Hacer una pregunta:**
```
/question @JuanPérez "¿Cuál es el deadline del proyecto?"
```

**Crear una encuesta:**
```
/poll "¿Qué día para la retrospectiva?" "Lunes" "Martes" "Miércoles"
```

**Celebrar un logro:**
```
/celebrate @María "¡Completó el módulo de pagos!"
```

**Exportar datos:**
```
/export excel
/export pdf
/export csv
```

---

## Comando /export - Exportación de Datos

### Descripción

El comando `/export` permite descargar datos del proyecto en diferentes formatos (Excel, PDF, CSV) con filtros avanzados.

### Uso Básico

```
/export              # Abre el formulario (Excel por defecto)
/export excel        # Formato Excel
/export pdf          # Formato PDF
/export csv          # Formato CSV
```

### Formulario de Exportación

Al ejecutar el comando, aparece una interfaz visual con las siguientes opciones:

#### 1. Formato de Exportación

- **Excel (.xlsx)**: Archivos con hojas múltiples, ideal para análisis
- **PDF (.pdf)**: Documento formateado con tablas
- **CSV (.csv)**: Texto plano compatible con cualquier software

#### 2. Tipo de Datos

- **Prioridades**: Exporta información de prioridades del proyecto
  - Título, estado, progreso, usuario asignado, iniciativas, fechas
- **Mensajes**: Exporta historial de mensajes del canal
  - Usuario, contenido, tipo, reacciones, respuestas, fecha
- **Todo**: Ambos tipos en secciones/hojas separadas

#### 3. Filtros Avanzados

**Rango de Fechas:**
- Fecha desde (por defecto: hace 30 días)
- Fecha hasta (por defecto: hoy)

**Filtrar por Usuarios:**
- Selección múltiple con checkboxes
- Muestra avatar y email de cada usuario
- Opcional: dejar vacío para incluir todos

### Características del Export

#### Para Excel:
- **Múltiples hojas**: Si exportas "Todo", crea una hoja para prioridades y otra para mensajes
- **Encabezados claros**: Primera fila con nombres de columnas
- **Formato XLSX**: Compatible con Microsoft Excel, Google Sheets, LibreOffice

#### Para PDF:
- **Diseño profesional**: Encabezado con nombre del proyecto y fecha
- **Tablas formateadas**: Usa autoTable para tablas limpias y legibles
- **Secciones separadas**: Si exportas "Todo", incluye ambas secciones

#### Para CSV:
- **Formato estándar**: Separado por comas, compatible universalmente
- **Codificación UTF-8**: Soporta caracteres especiales
- **Secciones marcadas**: Si exportas "Todo", incluye encabezados de sección

### Descarga Automática

Una vez procesada la exportación:
1. El archivo se genera en el servidor
2. Se descarga automáticamente al navegador
3. Nombre del archivo: `export_[nombre-proyecto]_[fecha].{extensión}`
4. Mensaje de éxito con confirmación visual

### Casos de Uso

**Reportes semanales:**
```
/export excel
- Tipo: Prioridades
- Desde: hace 7 días
- Hasta: hoy
```

**Backup completo:**
```
/export excel
- Tipo: Todo
- Desde: inicio del proyecto
- Hasta: hoy
```

**Análisis de conversaciones:**
```
/export csv
- Tipo: Mensajes
- Usuarios: [seleccionar miembros específicos]
- Rango: último mes
```

---

## Notificaciones

### Tipos de Notificaciones

#### 1. Menciones (@usuario)

Cuando alguien te menciona:
- **Email**: Recibes correo con el mensaje completo
- **In-app**: Notificación en el ícono de campana
- **Contenido**: Nombre de quien mencionó, mensaje, proyecto

#### 2. Respuestas en Threads

Cuando responden a tu mensaje:
- **Email**: Notificación de nueva respuesta
- **In-app**: Badge en notificaciones
- **Contenido**: Nombre del respondedor, respuesta, enlace al thread

#### 3. Preguntas (/question)

Cuando alguien te hace una pregunta:
- **Email**: Correo con la pregunta completa
- **In-app**: Notificación destacada
- **Acción**: Botón para responder directamente

### Configuración de Notificaciones

Los usuarios pueden configurar:
- Frecuencia de emails (inmediato, resumen diario, desactivado)
- Tipos de notificaciones a recibir
- Horarios de no molestar

**Ubicación:** Perfil de usuario → Preferencias de notificaciones

---

## Gestión de Usuarios Eliminados

### Problema

Cuando un usuario es eliminado del sistema, sus mensajes históricos podrían causar errores o dejar pantallas en blanco.

### Solución Implementada

El sistema maneja elegantemente los usuarios eliminados:

#### Identificación Visual

- **Avatar gris**: En lugar de colores vibrantes (azul/morado)
- **Nombre en cursiva y gris**: "Usuario Eliminado"
- **ID especial**: `_id: 'deleted'`

#### Funcionalidad

- ✅ Los mensajes históricos permanecen visibles
- ✅ El contexto de conversaciones se mantiene
- ✅ No se pueden editar/eliminar mensajes de usuarios eliminados
- ✅ Las reacciones de usuarios eliminados se muestran correctamente
- ✅ Los threads con usuarios eliminados funcionan normalmente

#### Ubicaciones Manejadas

1. **Mensajes principales** en el chat
2. **Mensajes anclados** en la sección superior
3. **Respuestas en threads** en el modal
4. **Reacciones** de mensajes
5. **Campo pinnedBy** en mensajes anclados

### Datos del Usuario Eliminado

```javascript
{
  _id: 'deleted',
  name: 'Usuario Eliminado',
  email: 'deleted@system.local'
}
```

---

## Mejores Prácticas

### Para Usuarios

1. **Usa menciones** para asegurar que las personas vean mensajes importantes
2. **Crea threads** para conversaciones largas - mantiene el canal limpio
3. **Ancla mensajes clave** como decisiones, links importantes, o instrucciones
4. **Usa slash commands** para acciones rápidas en lugar de salir del canal
5. **Reacciona a mensajes** para confirmar que los leíste sin saturar con "ok"

### Para Administradores

1. **Modera mensajes anclados** - máximo 5, solo lo más importante
2. **Revisa analytics** con `/team-load` y `/mention-stats` regularmente
3. **Usa `/export`** para backups semanales o mensuales
4. **Configura notificaciones** del equipo para evitar fatiga de notificaciones
5. **Documenta decisiones** usando `/decision` para trazabilidad

---

## Integración con el Sistema

### Relación con Prioridades

- Menciones de prioridades crean vínculos bidireccionales
- Los slash commands acceden a datos de prioridades en tiempo real
- Las exportaciones incluyen información completa de prioridades

### Relación con Proyectos

- Cada proyecto tiene su propio canal independiente
- Los mensajes están aislados por proyecto
- Las notificaciones incluyen contexto del proyecto

### Relación con Usuarios

- Sistema de permisos integrado con roles del sistema
- Las menciones respetan usuarios activos
- Los usuarios eliminados se manejan automáticamente

---

## Limitaciones y Consideraciones

### Límites Técnicos

- **Mensajes anclados:** Máximo 5 por canal
- **Búsqueda:** Últimos 50 mensajes por defecto (configurable)
- **Reacciones:** Sin límite, pero solo 4 emojis de acceso rápido
- **Exportación:** Limitada por memoria del servidor (miles de registros OK)

### Rendimiento

- **Carga inicial:** Últimos 50 mensajes
- **Scroll infinito:** No implementado (puede agregarse)
- **Tiempo real:** No hay WebSockets, requiere recargar manualmente
- **Cache:** No hay cache del lado del cliente

### Seguridad

- **Autenticación:** Requerida para acceder al canal
- **Autorización:** Solo miembros del proyecto pueden ver mensajes
- **Edición/Eliminación:** Solo propietarios o admins
- **Inyección:** Prevención automática de XSS en contenido

---

## Roadmap Futuro

### Features Planeadas

- [ ] WebSockets para mensajes en tiempo real
- [ ] Adjuntar archivos a mensajes
- [ ] Markdown y formato de texto enriquecido
- [ ] Grabaciones de voz
- [ ] Videollamadas integradas
- [ ] Integración con Slack/Teams
- [ ] Mensajes programados
- [ ] Traducción automática
- [ ] Transcripciones de reuniones
- [ ] Búsqueda semántica con IA

### Mejoras Planeadas

- [ ] Scroll infinito para mensajes antiguos
- [ ] Indicadores de "escribiendo..."
- [ ] Estado en línea/fuera de línea
- [ ] Mención de equipos/grupos
- [ ] Hilos anidados (threads de threads)
- [ ] Reacciones personalizadas
- [ ] Temas y personalización

---

## Soporte y Ayuda

### Documentación Adicional

- [API de Canales](./API_CANALES.md)
- [Arquitectura Técnica](./ARQUITECTURA.md)
- [Guía de Slash Commands](./SLASH_COMMANDS.md)

### Contacto

Para problemas o sugerencias:
- **Issues:** [GitHub Issues](https://github.com/tu-repo/issues)
- **Email:** soporte@tuempresa.com
- **Slack:** #canal-soporte

---

## Créditos

**Desarrollado por:** Tu Empresa
**Versión:** 1.0
**Última actualización:** Noviembre 2025
**Licencia:** Propietaria

---

## Changelog

### v1.0 (Noviembre 2025)
- ✅ Sistema de mensajería básico
- ✅ Menciones de usuarios y prioridades
- ✅ Reacciones con emojis
- ✅ Threads/hilos de conversación
- ✅ Mensajes anclados (máx 5)
- ✅ Búsqueda en tiempo real
- ✅ 30+ Slash commands
- ✅ Sistema de notificaciones
- ✅ Exportación en Excel/PDF/CSV
- ✅ Manejo de usuarios eliminados
- ✅ Edición y eliminación de mensajes

---

**¡Feliz colaboración en tus canales! 🎉**
