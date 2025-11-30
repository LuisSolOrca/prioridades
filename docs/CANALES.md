# Sistema de Canales - Documentación Completa

## Índice
1. [Introducción](#introducción)
2. [Características Principales](#características-principales)
3. [Mensajería](#mensajería)
   - [Crear Prioridad desde Mensaje](#crear-prioridad-desde-mensaje)
   - [Marcadores de Lectura](#marcadores-de-lectura)
4. [Tiempo Real y Presencia](#tiempo-real-y-presencia)
   - [Estados de Usuario](#estados-de-usuario)
5. [Canales y Subcanales](#canales-y-subcanales)
   - [Canales Privados](#canales-privados)
6. [Formato Markdown](#formato-markdown)
7. [Link Previews](#link-previews)
8. [Menciones](#menciones)
9. [Hashtags (#tags)](#hashtags-tags)
10. [Reacciones](#reacciones)
11. [Threads (Hilos)](#threads-hilos)
    - [Hilos Anidados](#hilos-anidados-threads-of-threads-)
12. [Mensajes Anclados](#mensajes-anclados)
13. [Búsqueda](#búsqueda)
    - [Búsqueda Semántica con IA](#búsqueda-semántica-con-ia)
    - [Ponme al Día](#ponme-al-día)
14. [Slash Commands](#slash-commands)
15. [Webhooks](#webhooks)
16. [Archivos Adjuntos](#archivos-adjuntos)
17. [Mensajes de Voz](#mensajes-de-voz)
18. [Pestaña de Dinámicas](#pestaña-de-dinámicas)
19. [Pizarra Colaborativa](#pizarra-colaborativa)
20. [Integración con Microsoft Teams](#integración-con-microsoft-teams)
21. [Notificaciones](#notificaciones)
22. [Gestión de Usuarios Eliminados](#gestión-de-usuarios-eliminados)
23. [Limitaciones y Consideraciones](#limitaciones-y-consideraciones)
24. [Roadmap Futuro](#roadmap-futuro)

---

## Introducción

El sistema de **Canales** es una plataforma de comunicación **en tiempo real con WebSockets** integrada en cada proyecto, diseñada para facilitar la colaboración del equipo mediante chat instantáneo, canales organizados jerárquicamente, comandos especializados y funcionalidades avanzadas de gestión de conversaciones.

**Ubicación:** `/projects/[id]/canales`

**Tecnología:**
- **WebSockets con Pusher** para mensajes instantáneos
- **Cursor-based pagination** para scroll infinito eficiente
- **Presence channels** para tracking de usuarios en línea
- **Client events** para typing indicators en tiempo real

---

## Características Principales

### ✅ Funcionalidades Disponibles

- ✉️ **Chat en tiempo real** con WebSockets (Pusher)
- 🚀 **Mensajes instantáneos** sin recargar la página
- ⌨️ **Typing indicators** - ve quién está escribiendo
- 🟢 **Presencia de usuarios** - ve quién está en línea
- 🎭 **Estados de usuario** - Online, Ausente, No molestar, Invisible con estado personalizado
- 📜 **Scroll infinito** con lazy loading de mensajes antiguos
- 👥 **Menciones de usuarios** con notificaciones
- 📌 **Menciones de prioridades** con previsualizaciones
- 🏷️ **Hashtags (#tags)** para categorizar mensajes con filtrado rápido
- 😄 **Reacciones con emojis** - 43 emojis organizados en categorías
- 📝 **Formato Markdown** - negrita, cursiva, código, listas, y más
- 🔗 **Link Previews** - previews automáticas de URLs con metadata
- 🎨 **Syntax highlighting** - código con colores por lenguaje
- 🧵 **Threads/hilos** para conversaciones organizadas (soporta hilos anidados)
- 📍 **Mensajes anclados** (máximo 5)
- 🔍 **Búsqueda avanzada** por contenido y usuario
- ⚡ **30+ Slash commands** para acciones rápidas
- ✏️ **Edición y eliminación** de mensajes propios
- 🔔 **Notificaciones** por email, in-app y **push del navegador**
- 👻 **Soporte para usuarios eliminados**
- 🗂️ **Sistema de canales y subcanales** jerárquico (máx 2 niveles)
- 🔒 **Canales privados** con control de acceso por miembros
- 📖 **Marcadores de lectura** - línea "Mensajes nuevos" para equipos asíncronos
- 🧠 **Búsqueda semántica con IA** - busca por concepto usando Groq (LLaMA 3.3)
- ✨ **Ponme al día** - resumen ejecutivo instantáneo con IA del chat y dinámicas
- 🔌 **Webhooks entrantes y salientes** para integración con sistemas externos
- 👥 **Grupos de usuarios** para menciones masivas
- 🔗 **Integración con Microsoft Teams** mediante bridge endpoint
- 📎 **Archivos adjuntos** con Cloudflare R2 - subir/descargar archivos en mensajes y pestaña dedicada
- 🎤 **Mensajes de voz** - graba y envía mensajes de audio con visualización de waveform y transcripción con IA
- 🎯 **Pestaña de Dinámicas** - visualiza todas las dinámicas colaborativas del canal (encuestas, retrospectivas, etc.)
- 📄 **Generación de documentos con IA** - crea documentos DOCX profesionales a partir de dinámicas seleccionadas
- 🎨 **60+ Widgets colaborativos** - votaciones, retrospectivas, análisis, ideación, frameworks ágiles
- 🎨 **Pizarra colaborativa** - canvas interactivo estilo Miro/Mural con Excalidraw y sincronización en tiempo real
- 🎯 **Crear prioridad desde mensaje** - convierte cualquier mensaje en una prioridad con un clic

---

## Mensajería

### Enviar Mensajes

- Escribe en el campo de texto y presiona **Enter** para enviar
- **Shift + Enter** para agregar una nueva línea sin enviar
- Los mensajes se muestran en orden cronológico (más recientes abajo)
- **Tiempo real**: Los mensajes aparecen instantáneamente para todos los usuarios
- **Typing indicator**: Otros usuarios ven cuando estás escribiendo
- Auto-scroll al recibir nuevos mensajes

### Scroll Infinito y Lazy Loading

El chat implementa **scroll infinito con cursor-based pagination** para carga eficiente de mensajes antiguos:

**Cómo funciona:**
- **Carga inicial**: Se cargan los 50 mensajes más recientes
- **Scroll hacia arriba**: Al acercarte al inicio, automáticamente carga los siguientes 50 mensajes más antiguos
- **Indicador visual**: Spinner animado que muestra "Cargando mensajes antiguos..."
- **Preservación de posición**: El scroll se mantiene en el mismo lugar después de cargar

**Ventajas técnicas:**
- ✅ **Cursor-based pagination**: Usa el `_id` del mensaje como cursor
- ✅ **Sin duplicados**: Compatible con mensajes en tiempo real
- ✅ **Performance óptima**: Usa índices de MongoDB eficientemente
- ✅ **Consistencia garantizada**: No se saltan ni duplican mensajes

**Experiencia del usuario:**
- Carga instantánea del chat
- No hay paginación manual (botones "cargar más")
- Scrollea naturalmente hacia arriba para ver historial
- Funciona perfectamente con búsqueda y filtros

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

### Crear Prioridad desde Mensaje

Convierte cualquier mensaje del chat en una **prioridad** del proyecto con un solo clic. Ideal para capturar tareas, compromisos o ideas que surgen en las conversaciones.

**Cómo usar:**
1. Pasa el mouse sobre cualquier mensaje
2. Haz clic en el ícono de **Target** (🎯)
3. Se abre el modal completo de creación de prioridad
4. Completa los campos requeridos (iniciativa, cliente)
5. Guarda la prioridad

**Pre-llenado automático:**

| Campo | Contenido |
|-------|-----------|
| **Título** | Primera línea del mensaje (hasta 100 caracteres) |
| **Descripción** | Contenido completo del mensaje con referencia al autor |
| **Semana** | Siguiente semana laboral (lunes a viernes) |
| **Estado** | EN_TIEMPO |
| **Tipo** | ESTRATEGICA |

**Características del modal:**
- ✅ Mismo formulario completo de `/priorities`
- 📋 Selector múltiple de iniciativas estratégicas
- 👥 Selector de cliente (requerido)
- 📁 Selector de proyecto (opcional)
- ☑️ Gestión de checklist con horas estimadas
- 🔗 Links de evidencia
- 🤖 Mejora de título/descripción con IA

**Ejemplo de descripción generada:**
```markdown
**Origen:** Mensaje de Juan Pérez en canal de chat

Necesitamos implementar la nueva API de pagos antes del viernes.
El cliente está esperando esta funcionalidad para el lanzamiento.
#urgente #api
```

**Beneficios:**
- 🚀 Captura tareas sin salir del chat
- 📝 No pierdes el contexto original
- 🔗 Trazabilidad del origen de la prioridad
- ⏱️ Ahorra tiempo vs crear manualmente

### Marcadores de Lectura

El sistema implementa **marcadores de lectura** (read markers) para ayudar a los equipos asíncronos a identificar rápidamente los mensajes nuevos desde su última visita.

**Cómo funciona:**
- 📖 **Línea visual "Mensajes nuevos"**: Una línea roja divide los mensajes leídos de los nuevos
- 🔢 **Contador de no leídos**: Muestra cuántos mensajes nuevos hay (ej: "3 mensajes nuevos")
- ⚡ **Actualización automática**: Al hacer scroll hasta el final, se marca todo como leído
- 💾 **Persistencia por usuario**: Cada usuario tiene su propio marcador por canal

**Experiencia de usuario:**
1. Al entrar a un canal, se carga el marcador de lectura guardado
2. Los mensajes posteriores a tu última lectura aparecen debajo de la línea roja
3. Al llegar al fondo del chat, automáticamente se actualiza el marcador
4. La próxima vez que entres, solo verás como "nuevos" los mensajes recibidos después

**Modelo de datos:**
```typescript
interface ChannelReadMarker {
  channelId: ObjectId;    // Canal
  userId: ObjectId;       // Usuario
  lastReadMessageId: ObjectId;  // Último mensaje leído
  lastReadAt: Date;       // Timestamp del mensaje
}
```

**API Endpoints:**
- `GET /api/projects/[id]/channels/[channelId]/read-marker` - Obtiene marcador actual
- `PUT /api/projects/[id]/channels/[channelId]/read-marker` - Actualiza con mensaje específico
- `POST /api/projects/[id]/channels/[channelId]/read-marker` - Marca todo como leído

---

## Tiempo Real y Presencia

### WebSockets con Pusher

El sistema utiliza **Pusher** para comunicación en tiempo real mediante WebSockets:

**Tecnología:**
- **Pusher Channels**: Servicio de WebSocket gestionado
- **Presence Channels**: Canales especiales para tracking de usuarios en línea
- **Client Events**: Eventos directos entre usuarios para typing indicators

**Configuración:**
- **Free tier**: 100 conexiones concurrentes, 200K mensajes/día
- **Cluster**: us2 (configurable)
- **Auth endpoint**: `/api/pusher/auth` para autenticación segura

### Mensajes Instantáneos

**Funcionamiento:**
1. Usuario escribe y envía mensaje
2. Mensaje se guarda en MongoDB
3. Servidor dispara evento Pusher a `presence-channel-{channelId}`
4. Todos los usuarios conectados reciben el mensaje instantáneamente
5. UI se actualiza sin recargar la página

**Características:**
- ✅ Latencia < 100ms en la mayoría de casos
- ✅ Prevención automática de duplicados
- ✅ Compatible con scroll infinito
- ✅ Funciona con threads y reacciones

### Typing Indicators (Indicador de Escritura)

Ve en tiempo real cuando otros usuarios están escribiendo:

**Comportamiento:**
- Aparece al empezar a escribir: `Juan está escribiendo...`
- Se actualiza con múltiples usuarios: `Juan y María están escribiendo...`
- Desaparece automáticamente después de 3 segundos sin escribir
- Se limpia al enviar el mensaje

**Implementación:**
- Eventos `client-typing` y `client-stop-typing`
- Animación de puntos rebotando
- Muestra hasta 3 nombres, luego "y X más"

**Ejemplo visual:**
```
🔵🔵🔵 Juan Pérez está escribiendo...
```

### Presencia de Usuarios (Quién Está En Línea)

El sistema muestra quiénes están conectados al canal en tiempo real:

**Indicador visual:**
- 🟢 Punto verde pulsante
- Contador: "3 en línea"
- Tooltip al pasar mouse: Lista de nombres

**Eventos de presencia:**
- `pusher:subscription_succeeded`: Obtiene lista inicial
- `pusher:member_added`: Usuario se conecta
- `pusher:member_removed`: Usuario se desconecta

**Información incluida:**
```javascript
{
  user_id: "507f1f77bcf86cd799439011",
  user_info: {
    name: "Juan Pérez",
    email: "juan@empresa.com"
  }
}
```

**Casos de uso:**
- Saber si un compañero está disponible antes de mencionar
- Coordinar respuestas en tiempo real
- Ver actividad del canal

### Estados de Usuario

El sistema incluye un **sistema completo de estados de usuario** similar a Slack/Discord, permitiendo a los usuarios indicar su disponibilidad y estado actual.

#### Tipos de Estado de Presencia

| Estado | Icono | Descripción |
|--------|-------|-------------|
| **En línea** | 🟢 | Disponible y activo |
| **Ausente** | 🟡 | Temporalmente no disponible |
| **No molestar** | 🔴 | Sin notificaciones |
| **Invisible** | ⚫ | Aparece como desconectado para otros |

#### Panel de Usuarios En Línea

El header del chat muestra un panel expandible con todos los usuarios conectados:

**Características:**
- 🔘 Click en el indicador "X en línea" expande el panel
- 👤 Lista de usuarios con su avatar, nombre y estado
- 🎭 Indicador visual del estado de cada usuario
- ⌨️ Sección separada mostrando usuarios escribiendo
- 📅 "Visto por última vez" para usuarios offline

**Información mostrada por usuario:**
```
┌─────────────────────────────────────┐
│ 🟢 Juan Pérez                       │
│    ☕ Tomando café                  │
├─────────────────────────────────────┤
│ 🟡 María García                     │
│    Visto hace 5 min                 │
├─────────────────────────────────────┤
│ 🔴 Carlos López                     │
│    🎧 En reunión                    │
└─────────────────────────────────────┘
```

#### Estado Personalizado

Los usuarios pueden establecer un **estado personalizado** con emoji y texto:

**Presets disponibles:**
- 📅 En reunión
- 🏠 Trabajando desde casa
- 🎧 Enfocado
- ☕ Tomando un descanso
- 🏖️ De vacaciones
- 🤒 Enfermo

**Estado personalizado:**
1. Click en tu avatar en la barra de navegación
2. Selecciona un estado de presencia (En línea, Ausente, etc.)
3. Opcionalmente agrega un estado personalizado:
   - Selecciona un emoji
   - Escribe un texto descriptivo (máx. 100 caracteres)
4. El estado se sincroniza en tiempo real con todos los canales

#### Last Seen (Última Conexión)

Para usuarios que no están en línea, el sistema muestra cuándo fue su última actividad:

**Formato:**
- "Visto ahora" - hace menos de 1 minuto
- "Visto hace X min" - hace menos de 1 hora
- "Visto hace Xh" - hace menos de 24 horas
- "Visto hace Xd" - hace menos de 7 días
- "Visto DD/MM/YYYY" - hace más de 7 días

#### Heartbeat y Detección de Presencia

El sistema utiliza un mecanismo de **heartbeat** para detectar la presencia real:

**Funcionamiento:**
1. Al conectarse: Se envía evento `connect`
2. Cada 30 segundos: Se envía `heartbeat` al servidor
3. Al cambiar de pestaña: Se detecta y puede marcar como ausente
4. Al desconectarse: Se envía evento `disconnect`

**API Endpoints:**
- `GET /api/user/status` - Obtener estado actual
- `PUT /api/user/status` - Actualizar estado
- `POST /api/user/status/heartbeat` - Enviar heartbeat
- `POST /api/user/status/bulk` - Obtener estados de múltiples usuarios

#### Sincronización en Tiempo Real

Los cambios de estado se propagan instantáneamente via Pusher:

**Canal:** `presence-global`
**Evento:** `user-status-changed`

```javascript
{
  userId: "507f1f77bcf86cd799439011",
  status: "away",
  customStatus: "En reunión",
  customStatusEmoji: "📅"
}
```

### Reconexión Automática

Pusher maneja automáticamente:
- ✅ Reconexión al perder internet
- ✅ Reautenticación después de reconectar
- ✅ Resincronización de estado de presencia
- ✅ Logs en desarrollo para debugging

---

## Canales y Subcanales

### Estructura Jerárquica

El sistema soporta **canales organizados en jerarquía** similar a Discord:

**Niveles:**
- **Nivel 1**: Canales principales (ej: "General", "Backend", "Frontend")
- **Nivel 2**: Subcanales (ej: "Backend → API", "Backend → Database")
- **Máximo**: 2 niveles de profundidad

### Gestión de Canales

**Crear canal principal:**
1. Ve a la pestaña "Canales" en el proyecto
2. Haz clic en "➕ Nuevo Canal"
3. Ingresa nombre, descripción y selecciona ícono
4. Guarda

**Crear subcanal:**
1. En un canal existente, haz clic en "➕ Agregar Subcanal"
2. Completa la información
3. Se crea automáticamente bajo el canal padre

**Características:**
- 🔒 **Canal General**: Se crea automáticamente, no se puede eliminar
- 🎨 **Íconos personalizados**: Usa cualquier ícono de Lucide React
- 📊 **Ordenamiento**: Arrastra y suelta para reordenar
- 🗑️ **Eliminación segura**: Los mensajes se mueven a "General"

### Selector de Canales

El selector en el header del chat permite:
- Ver jerarquía completa de canales
- Cambiar entre canales con un clic
- Breadcrumbs para subcanales: `Backend → API`
- Auto-selección del canal "General" al cargar

**Migración automática:**
- Los mensajes existentes se asignan a "General"
- Script de migración: `scripts/migrate-channels.ts`

### Canales Privados

El sistema soporta **canales privados** donde solo los miembros seleccionados pueden ver y participar.

**Crear canal privado:**
1. Ve a la pestaña "Canales" en el proyecto
2. Haz clic en "➕ Nuevo Canal"
3. Activa el toggle "Canal Privado" (cambia a color ámbar)
4. Busca y selecciona los miembros que tendrán acceso
5. El creador se agrega automáticamente como miembro
6. Guarda

**Características:**
- 🔒 **Visibilidad restringida**: Solo los miembros pueden ver el canal en la lista
- 👥 **Gestión de miembros**: Búsqueda y selección de usuarios al crear
- 🔐 **Icono de candado**: Los canales privados muestran un candado y badge "Privado"
- 👤 **Creador automático**: El creador siempre es miembro del canal
- 👑 **Acceso admin**: Los administradores pueden ver todos los canales privados
- 📊 **Contador de miembros**: Muestra cuántos miembros tiene el canal

**Control de acceso:**
- **Canales públicos**: Visibles para todos los usuarios del proyecto
- **Canales privados**: Solo visibles para:
  - Miembros del canal
  - El creador del canal
  - Administradores del sistema

**Modelo de datos:**
```typescript
interface Channel {
  // ... campos existentes
  isPrivate: boolean;       // true = canal privado
  members: ObjectId[];      // Lista de usuarios con acceso
}
```

**API:**
- `GET /api/projects/[id]/channels` - Filtra automáticamente según permisos
- `POST /api/projects/[id]/channels` - Acepta `isPrivate` y `members[]`

**Casos de uso:**
- Canales de liderazgo o gerencia
- Discusiones confidenciales de proyecto
- Grupos de trabajo específicos
- Canales de recursos humanos

---

## Formato Markdown

El sistema soporta **Markdown completo** para formatear mensajes con texto enriquecido, código, listas y más.

### Sintaxis Soportada

#### Formato de Texto

| Sintaxis | Resultado | Descripción |
|----------|-----------|-------------|
| `**negrita**` | **negrita** | Texto en negrita |
| `*cursiva*` | *cursiva* | Texto en cursiva |
| `~~tachado~~` | ~~tachado~~ | Texto tachado (strikethrough) |
| `` `código` `` | `código` | Código inline |

#### Bloques de Código

**Código sin lenguaje:**
````
```
function ejemplo() {
  return "Hola mundo";
}
```
````

**Código con syntax highlighting:**
````
```javascript
function ejemplo() {
  return "Hola mundo";
}
```
````

**Lenguajes soportados:**
- JavaScript, TypeScript, Python, Java, C++, Go, Rust, PHP
- HTML, CSS, SQL, JSON, YAML, Markdown
- Bash, PowerShell, y muchos más

El sistema usa **highlight.js** con el tema `github-dark` para colorear automáticamente el código según el lenguaje.

#### Listas

**Lista desordenada:**
```
- Item 1
- Item 2
  - Sub-item 2.1
  - Sub-item 2.2
- Item 3
```

**Lista ordenada:**
```
1. Primer paso
2. Segundo paso
3. Tercer paso
```

#### Enlaces

```
[Texto del enlace](https://ejemplo.com)
```

Los enlaces automáticamente:
- Se abren en nueva pestaña
- Generan previews automáticas (ver siguiente sección)
- Detectan URLs sin formato y las convierten en links

#### Citas

```
> Esto es una cita
> Puede tener múltiples líneas
```

Resultado:
> Esto es una cita
> Puede tener múltiples líneas

#### Encabezados

```
# Encabezado 1
## Encabezado 2
### Encabezado 3
#### Encabezado 4
```

#### Tablas

```
| Columna 1 | Columna 2 | Columna 3 |
|-----------|-----------|-----------|
| Dato 1    | Dato 2    | Dato 3    |
| Dato 4    | Dato 5    | Dato 6    |
```

### Ayuda de Markdown

Haz clic en el botón **?** (azul) junto al campo de mensaje para ver:
- Guía rápida de sintaxis
- Ejemplos visuales
- Categorías organizadas (Formato, Código, Listas, Enlaces, etc.)
- Consejos de uso

### Características Especiales

#### Compatibilidad con Menciones

El Markdown **coexiste** con las menciones de usuarios y prioridades:

```
**@Juan Pérez** ¿puedes revisar #implementar-api-rest?
```

Las menciones funcionan dentro del Markdown sin conflictos.

#### Formato Mixto

Puedes combinar múltiples formatos:

```
**Importante:** La función `getUserData()` está *deprecated*.
Ver más en [docs](https://ejemplo.com)
```

#### Whitespace Preservation

Los saltos de línea y espacios se preservan correctamente:
- Usa **Enter** para nueva línea dentro del mensaje
- Usa **Shift + Enter** para salto de línea sin enviar

### Ejemplos de Uso

**Reportar un bug:**
```
🐛 **Bug encontrado en login**

**Pasos para reproducir:**
1. Ir a `/login`
2. Ingresar credenciales inválidas
3. El error no se muestra

**Código del error:**
```javascript
if (!user) {
  // Falta return aquí
  console.error('User not found');
}
```

**Asignado a:** @María López
```

**Compartir código:**
````
💡 Solución para el problema de cache:

```typescript
const cache = new Map<string, CachedData>();

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < TTL) {
    return cached.data;
  }
  return null;
}
```

¿Les parece bien este approach?
````

**Crear checklist:**
```
📋 **TODO para el sprint:**

- [x] Implementar autenticación
- [x] Crear dashboard
- [ ] Agregar tests
- [ ] Deploy a producción
```

---

## Link Previews

El sistema genera automáticamente **previews enriquecidas** de URLs compartidas en el chat, similar a Slack, Discord o WhatsApp.

### Funcionamiento Automático

Cuando compartes un link en el chat:

```
Miren esta documentación: https://nextjs.org/docs
```

El sistema automáticamente:
1. ✅ Detecta la URL en el mensaje
2. ✅ Hace fetch del HTML de la página
3. ✅ Extrae metadata (Open Graph, Twitter Cards)
4. ✅ Muestra una preview card debajo del mensaje

### Información Extraída

La preview card incluye:

- **🖼️ Imagen destacada**: Imagen principal de la página (Open Graph image)
- **📄 Título**: Título de la página o artículo
- **📝 Descripción**: Resumen corto del contenido
- **🌐 Favicon**: Ícono del sitio web
- **🔗 Nombre del sitio**: Ej: "GitHub", "Medium", "YouTube"
- **🔗 Ícono de enlace externo**: Indica que abre en nueva pestaña

### Ejemplo Visual

Para el link `https://github.com/vercel/next.js`:

```
┌──────────────────────────────────────────────┐
│  Next.js by Vercel                           │
│  The React Framework for the Web             │
│                                    [Image]   │
│  🌐 GitHub ↗                                 │
└──────────────────────────────────────────────┘
```

### Características Técnicas

#### Caché Inteligente

- ✅ **Duración**: 24 horas por URL
- ✅ **Almacenamiento**: En memoria del servidor
- ✅ **Auto-limpieza**: Elimina URLs antiguas automáticamente
- ✅ **Performance**: La segunda carga es instantánea

#### Timeout Protection

- ⏱️ **Timeout**: 10 segundos máximo por fetch
- ⏱️ **No bloquea**: Si el sitio es lento, el mensaje se muestra de inmediato
- ⏱️ **Fallback**: Si falla, solo muestra el link sin preview

#### Soporte de Estándares

El sistema extrae metadata de:
- **Open Graph** (Facebook): `og:title`, `og:image`, `og:description`
- **Twitter Cards**: `twitter:title`, `twitter:image`, `twitter:description`
- **HTML estándar**: `<title>`, `<meta name="description">`, `<link rel="icon">`

#### URLs Relativas

Resuelve automáticamente:
- Imágenes relativas: `/images/hero.png` → `https://sitio.com/images/hero.png`
- Favicons: `/favicon.ico` → `https://sitio.com/favicon.ico`

### Loading States

Mientras carga la preview:
- 📊 **Skeleton screen**: Animación de carga con "pulse"
- ⏳ **No bloquea el chat**: Puedes seguir enviando mensajes
- ✅ **Progressive enhancement**: El link funciona incluso sin preview

### Múltiples Links

Si compartes múltiples URLs en un mensaje:

```
Recursos útiles:
- https://react.dev
- https://nextjs.org
- https://tailwindcss.com
```

El sistema genera **una preview por cada URL**, apiladas verticalmente.

### Sitios Soportados

Funciona con **cualquier sitio web** que incluya metadata, pero especialmente bien con:
- 📰 Medium, Dev.to, blogs
- 🎥 YouTube, Vimeo
- 💻 GitHub, GitLab
- 📚 Documentación (Next.js, React, etc.)
- 🐦 Twitter/X (si público)
- 🔗 Notion, Google Docs (si público)

### Seguridad

- 🔒 Solo protocolos **HTTP** y **HTTPS**
- 🔒 Validación de URL antes de hacer fetch
- 🔒 User-Agent identificado: `LinkPreviewBot/1.0`
- 🔒 No ejecuta JavaScript del sitio externo
- 🔒 Protección contra inyección XSS

### Casos de Error

Si el sitio no está disponible o no tiene metadata:
- ❌ **Timeout**: Preview no aparece, link funciona normalmente
- ❌ **404/500**: Preview no aparece, link funciona normalmente
- ❌ **Sin metadata**: Preview no aparece, link funciona normalmente
- ❌ **Error de red**: Preview no aparece, link funciona normalmente

**La regla general:** Si algo falla, el mensaje y link siguen funcionando perfectamente, simplemente sin la preview visual.

### Desactivar Previews

Actualmente no hay opción para deshabilitar previews individualmente. Si necesitas compartir un link sin preview, considera:
- Usar código inline: `` `https://ejemplo.com` ``
- Agregar espacios: `https:// ejemplo.com` (rompe el link)

### API Endpoint

Las previews se generan mediante:
```
GET /api/link-preview?url=https://ejemplo.com
```

Respuesta JSON:
```json
{
  "url": "https://ejemplo.com",
  "title": "Título de la Página",
  "description": "Descripción del contenido",
  "image": "https://ejemplo.com/image.jpg",
  "siteName": "Nombre del Sitio",
  "favicon": "https://ejemplo.com/favicon.ico"
}
```

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

## Hashtags (#tags)

Los **hashtags** permiten categorizar y etiquetar mensajes para facilitar su búsqueda y organización posterior.

### Cómo Usar Hashtags

Simplemente escribe `#` seguido de una palabra o frase (sin espacios):

```
#urgente Necesitamos resolver esto hoy
#decision Se acordó usar PostgreSQL para el nuevo servicio
#idea Podríamos automatizar el proceso de deploy
#blocker El servidor de staging está caído
#q4 Esto es parte de los objetivos del Q4
```

### Características

- ✅ **Extracción automática**: Los hashtags se detectan y guardan automáticamente al enviar el mensaje
- 🎨 **Renderizado visual**: Se muestran como badges púrpura clickeables
- 🔍 **Filtrado por click**: Haz clic en cualquier hashtag para filtrar mensajes con ese tag
- 🏷️ **Múltiples tags**: Un mensaje puede tener varios hashtags
- 🔤 **Case insensitive**: `#Urgente` y `#urgente` se tratan igual
- 🌍 **Soporte Unicode**: Funciona con caracteres especiales (`#decisión`, `#año2024`)

### Filtrado por Hashtag

**Desde un mensaje:**
1. Haz clic en cualquier hashtag (badge púrpura) en un mensaje
2. El chat se filtra automáticamente mostrando solo mensajes con ese tag
3. Aparece un indicador "Filtrando por: #tag" con botón para limpiar

**Desde la búsqueda:**
- El filtro de hashtag es compatible con la búsqueda por texto
- Puedes combinar filtro de tag + búsqueda de texto

### Hashtags Recomendados

| Tag | Uso sugerido |
|-----|--------------|
| `#urgente` | Temas que requieren atención inmediata |
| `#decision` | Decisiones tomadas por el equipo |
| `#idea` | Propuestas y sugerencias |
| `#blocker` | Impedimentos que bloquean el trabajo |
| `#pregunta` | Preguntas pendientes de respuesta |
| `#followup` | Temas que requieren seguimiento |
| `#q1` `#q2` etc. | Categorización por quarter |
| `#sprint1` `#sprint2` | Categorización por sprint |

### Análisis Semántico de Tags

Los hashtags se incluyen en el análisis de **"Ponme al día"** (AI Summary):
- La IA agrupa información por temas/tags
- Muestra los tags más utilizados en el período
- Identifica patrones y temas recurrentes

### API

**Crear mensaje con tags:**
```javascript
POST /api/projects/[id]/messages
Body: { content: "Mensaje con #tag1 y #tag2", channelId: "..." }
// Los tags se extraen automáticamente del contenido
```

**Filtrar por tag:**
```
GET /api/projects/[id]/messages?channelId=xxx&tag=urgente
```

---

## Reacciones

### Agregar Reacciones

Cada mensaje muestra **4 emojis de acceso rápido** y un **selector con 43 emojis** organizados en categorías:

**Emojis de acceso rápido:**
- 👍 Pulgar arriba
- ❤️ Corazón
- 😄 Cara feliz
- 🎉 Celebración

**Selector de emojis** (botón **😄+**):
- **Frecuentes**: 👍 ❤️ 😄 🎉 👏 🔥 💯 ✅
- **Emociones**: 😀 😃 😊 😍 🥰 😘 😂 🤣 😭 😢 😡 😱 😨 🤔 🙄 😴
- **Gestos**: 👋 👌 ✌️ 🤝 🙏 💪 👊 ✊
- **Símbolos**: ✨ ⭐ 🌟 💫 🚀 🎯 ⚡ 🔔 🎁 🎊 🎈

**Uso:**
1. Haz clic en uno de los 4 emojis rápidos debajo del mensaje
2. O haz clic en **😄+** para abrir el selector con más opciones
3. La reacción se agrega o se quita si ya reaccionaste

### Ver Quién Reaccionó

Pasa el mouse sobre una reacción para ver:
- Lista de usuarios que reaccionaron
- Cantidad total de reacciones

**Características:**
- ✅ **43 emojis disponibles** organizados en 4 categorías
- ✅ **Navegación por tabs** entre categorías
- ✅ **Hover effect** con escala 1.25x para mejor UX
- ✅ **Click fuera para cerrar** el selector automáticamente
- ✅ Un usuario puede reaccionar múltiples veces con diferentes emojis
- ✅ Las reacciones se agrupan por tipo
- ✅ Se resaltan las reacciones que tú has dado

---

## Threads (Hilos)

Los **threads** permiten crear conversaciones organizadas sin saturar el canal principal. Soportan **hilos anidados (threads of threads)** para discusiones complejas donde un subtema requiere su propia conversación.

### Crear un Thread

1. Pasa el mouse sobre cualquier mensaje
2. Haz clic en el ícono **💬 Responder en hilo**
3. Se abre un modal con el mensaje original
4. Escribe tu respuesta

### Hilos Anidados (Threads of Threads) 🧵

A partir de v1.9.0, los hilos soportan **anidamiento profundo**, permitiendo responder a respuestas:

**Cómo funciona:**
1. Abre cualquier hilo existente
2. Pasa el mouse sobre cualquier mensaje en el hilo
3. Haz clic en el ícono **↩️ Responder** que aparece
4. Tu respuesta se anida debajo del mensaje seleccionado

**Características de hilos anidados:**
- **Indentación visual**: Cada nivel de anidamiento se indenta con líneas de color diferente
- **Máximo visual**: 4 niveles de indentación visual (los hilos pueden ser más profundos pero la indentación se mantiene en 4)
- **Colores por nivel**: Azul → Verde → Púrpura → Naranja → Rosa (ciclo)
- **Indicador de nivel**: Badge "Nivel N" en mensajes anidados
- **Colapsar/Expandir**: Botón ▼/▶ para colapsar ramas del hilo
- **Badge "Hilo anidado"**: El header muestra cuando hay mensajes con profundidad > 1
- **Contador de respuestas colapsadas**: Al colapsar, muestra "N respuestas"

**Indicador de respuesta:**
- Al hacer clic en responder, aparece una barra azul indicando:
  - "Respondiendo a [Nombre]"
  - Preview del mensaje al que respondes
  - Botón X para cancelar

**Arquitectura técnica:**
- `threadDepth`: Nivel de anidamiento (0 = mensaje principal, 1 = respuesta directa, 2+ = respuesta anidada)
- `rootMessageId`: ID del mensaje raíz del hilo (para agrupar todo el árbol)
- `parentMessageId`: ID del mensaje padre directo

### Características

- **Indicador visual**: Mensajes con respuestas muestran un borde azul
- **Contador de respuestas**: Badge que muestra cuántas respuestas hay
- **Vista modal**: Thread completo en ventana separada (max-w-4xl para hilos anidados)
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
- **Filtrado por hashtag**: Combina búsqueda de texto con filtro de tag activo

### Búsqueda Semántica con IA

La búsqueda semántica utiliza **Groq AI** (LLaMA 3.3 70B) para encontrar contenido por **significado y concepto**, no solo por palabras clave.

**Cómo usar:**
1. Escribe tu consulta en la barra de búsqueda (mínimo 3 caracteres)
2. Haz clic en el botón **"IA"** (icono de cerebro) o presiona **Enter**
3. La IA analiza todo el contenido y devuelve los resultados más relevantes

**Ejemplos de consultas:**
```
"ideas para reducir latencia en Q4"
→ Encuentra brainstorms, five-whys y action-items relacionados con rendimiento

"decisiones sobre la arquitectura del backend"
→ Busca matrices de decisión, RICE scores y discusiones técnicas

"problemas del equipo de desarrollo"
→ Localiza retrospectivas, fishbones y team-health checks
```

**Características:**
- 🧠 **Búsqueda por concepto**: Entiende sinónimos y conceptos relacionados
- 📊 **Analiza dinámicas**: Busca en brainstorms, retros, matrices, RICE, five-whys, etc.
- 💬 **Incluye mensajes**: También busca en mensajes regulares del chat
- 🎯 **Ranking de relevancia**: Ordena resultados por relevancia semántica
- ⚡ **Tiempo real**: Resultados en 2-3 segundos

**Tipos de contenido indexado:**
- Brainstorms y sus ideas
- Five-Whys con causas raíz
- Matrices de decisión (opciones y criterios)
- RICE scoring (items y puntuaciones)
- Retrospectivas (todas las secciones)
- SWOT, SOAR, Six Hats
- Risk Matrix con riesgos
- Customer Journey con touchpoints
- Lean Canvas con bloques
- Standups con entradas
- Action Items con asignaciones
- Y 50+ tipos más de dinámicas

**API Endpoint:**
```
POST /api/projects/[id]/messages/semantic-search
Body: { query: "tu búsqueda", channelId?: "id", limit?: 10 }
```

**Requisitos:**
- Variable de entorno `GROQ_API_KEY` configurada
- Mínimo 3 caracteres en la búsqueda

### Ponme al Día

El botón **"Ponme al día"** ofrece un resumen ejecutivo instantáneo del chat usando IA, ideal para equipos asíncronos o para ponerse al corriente después de una ausencia.

**Ubicación:** Botón verde junto a la barra de búsqueda

**Cómo usar:**
1. Haz clic en el botón verde **"✨ Ponme al día"**
2. La IA analiza los últimos 100 mensajes y dinámicas
3. Se muestra un resumen estructurado en un panel

**El resumen incluye:**

| Sección | Contenido |
|---------|-----------|
| 📊 **Resumen de Actividad** | Número de mensajes, dinámicas y período analizado |
| 🎯 **Decisiones y Resultados** | Votaciones, decisiones registradas, conclusiones de análisis |
| 💡 **Ideas y Propuestas** | Top ideas de brainstorms, propuestas más votadas |
| 🔄 **Estado del Equipo** | Retrospectivas, health checks, mood del equipo |
| ⚠️ **Puntos de Atención** | Blockers activos, riesgos, preguntas pendientes |
| 👥 **Participación** | Usuarios más activos, tareas asignadas |
| 🏷️ **Temas Principales** | Hashtags más usados y temas recurrentes |

**Dinámicas analizadas:**
- Votaciones y encuestas (resultados, ganadores)
- Brainstorms (top ideas)
- Retrospectivas (qué funciona, qué no)
- Matrices de decisión (mejor opción)
- SWOT, Five Whys, Risk Matrix
- Team Health, Mood checks
- Action Items (pendientes)
- Y 60+ tipos más de dinámicas

**Análisis de Hashtags:**
- Muestra los tags más frecuentes del período
- Agrupa información por tema cuando es relevante
- Identifica patrones y categorías dominantes

**API Endpoint:**
```
POST /api/ai/chat-summary
Body: { messages: [...], maxMessages?: 100 }

Response: {
  summary: "...",
  messagesAnalyzed: 100,
  dynamicsAnalyzed: 15,
  tagsFound: 8,
  topTags: ["#urgente (5)", "#decision (3)", ...],
  generatedAt: "2024-01-15T10:30:00Z"
}
```

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
| `/velocity` | Velocidad del equipo con tendencias y predicciones | `/velocity` |
| `/blockers` | Lista de prioridades bloqueadas | `/blockers` |
| `/risks` | Prioridades en riesgo | `/risks` |
| `/search` | Búsqueda avanzada de datos | `/search [tipo] [término]` |
| `/recent` | Actividad reciente de un usuario | `/recent @usuario [días]` |
| `/my-stats` | Tus estadísticas personales | `/my-stats` |
| `/mention-stats` | Análisis de menciones y colaboración | `/mention-stats` |
| `/ai-summary` | Resumen inteligente del chat con IA | `/ai-summary [N mensajes]` |
| `/export` | Exportar datos del proyecto | `/export [excel\|pdf\|csv]` |

#### 🤝 Colaboración (Collaboration)

##### 📊 Votaciones y Encuestas

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/poll` | Crea una encuesta básica | `/poll "¿Pregunta?" "Op1" "Op2"` |
| `/dot-voting` | Votación con N puntos para distribuir | `/dot-voting "¿Pregunta?" 5 "Op1" "Op2"` |
| `/blind-vote` | Votos ocultos hasta que todos voten | `/blind-vote "¿Pregunta?" "Op1" "Op2"` |
| `/nps` | Net Promoter Score rápido (0-10) | `/nps "¿Recomendarías X?"` |
| `/confidence-vote` | ¿Qué tan seguros estamos? (1-5) | `/confidence-vote "¿Pregunta?"` |
| `/fist-of-five` | Votación rápida con 5 niveles | `/fist-of-five "¿Pregunta?"` |
| `/roman-voting` | Votación romana (👍/👎/✊) | `/roman-voting "¿Propuesta?"` |
| `/ranking` | Ranking colaborativo drag & drop | `/ranking "¿Pregunta?" "Op1" "Op2"` |
| `/wheel` | Ruleta de decisión aleatoria | `/wheel "Título" "Op1" "Op2" "Op3"` |

##### 🔄 Retrospectivas

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/retrospective` | Retrospectiva ágil con 3 columnas | `/retrospective "Sprint N"` |
| `/rose-bud-thorn` | 🌹 Positivo, 🌱 Potencial, 🌵 Problemas | `/rose-bud-thorn "Sprint N"` |
| `/sailboat` | ⛵ Viento, ancla, rocas, isla | `/sailboat "Retrospectiva Q4"` |
| `/start-stop-continue` | Qué empezar, parar, continuar | `/start-stop-continue "Sprint N"` |
| `/4ls` | Liked, Learned, Lacked, Longed For | `/4ls "Sprint N"` |
| `/starfish` | Más, Menos, Mantener, Empezar, Dejar | `/starfish "Sprint N"` |
| `/mad-sad-glad` | Emociones del equipo (😠😢😊) | `/mad-sad-glad "Sprint N"` |
| `/hot-air-balloon` | 🎈 Fuego, arena, tormenta, sol | `/hot-air-balloon "Sprint N"` |
| `/kalm` | Keep, Add, Less, More | `/kalm "Sprint N"` |
| `/pre-mortem` | Análisis preventivo de riesgos | `/pre-mortem "Proyecto X"` |

##### 💡 Ideación y Creatividad

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/brainstorm` | Sesión de brainstorming colaborativa | `/brainstorm "¿Tema o pregunta?"` |
| `/mind-map` | Mapa mental colaborativo gráfico | `/mind-map "Tema central"` |
| `/crazy-8s` | 8 ideas en 8 minutos (Design Sprint) | `/crazy-8s "Problema o reto"` |
| `/affinity-map` | Agrupar ideas por categorías | `/affinity-map "Sesión brainstorm"` |
| `/brainwriting` | Brainwriting 6-3-5 colaborativo | `/brainwriting "Tema"` |
| `/lotus-blossom` | Expansión de ideas en pétalos | `/lotus-blossom "Idea central"` |
| `/scamper` | Técnica SCAMPER para innovación | `/scamper "Producto/Servicio"` |
| `/starbursting` | Generar preguntas (Qué, Quién, Cuándo...) | `/starbursting "Tema"` |
| `/reverse-brainstorm` | Ideas inversas (¿cómo empeorar?) | `/reverse-brainstorm "Problema"` |
| `/worst-idea` | Comenzar con las peores ideas | `/worst-idea "Reto"` |
| `/how-might-we` | Preguntas "¿Cómo podríamos...?" | `/how-might-we "Desafío"` |

##### 📊 Análisis y Estrategia

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/swot` | Análisis SWOT colaborativo | `/swot "Producto X"` |
| `/soar` | Análisis SOAR orientado al futuro | `/soar "Plan estratégico"` |
| `/six-hats` | Análisis con los 6 sombreros de Bono | `/six-hats "Decisión"` |
| `/decision-matrix` | Matriz criterios vs opciones con puntajes | `/decision-matrix "Decisión" "Crit1" "Crit2"` |
| `/pros-cons` | Tabla de pros y contras | `/pros-cons "Título"` |
| `/five-whys` | Análisis de causa raíz (5 porqués) | `/five-whys "Problema"` |
| `/fishbone` | Diagrama Ishikawa (causa-efecto) | `/fishbone "Problema"` |
| `/impact-effort` | Matriz de impacto vs esfuerzo | `/impact-effort "Decisiones"` |
| `/risk-matrix` | Matriz de riesgos (probabilidad x impacto) | `/risk-matrix "Proyecto"` |
| `/assumption-mapping` | Mapeo de supuestos con certeza/riesgo | `/assumption-mapping "Proyecto"` |

##### 🎯 Priorización

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/rice` | RICE Scoring (Reach, Impact, Confidence, Effort) | `/rice "Backlog"` |
| `/moscow` | MoSCoW (Must, Should, Could, Won't) | `/moscow "Features"` |
| `/estimation-poker` | Planning Poker para estimación de tareas | `/estimation-poker "¿Tarea?"` |
| `/opportunity-tree` | Árbol de oportunidades con soluciones | `/opportunity-tree "Objetivo"` |

##### 👥 Equipos y Personas

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/team-health` | Health check del equipo (Spotify model) | `/team-health "Título"` |
| `/mood` | Check-in de estado del equipo | `/mood "¿Cómo están?"` |
| `/persona` | Crear persona de usuario | `/persona "Nombre"` |
| `/empathy-map` | Mapa de empatía del usuario | `/empathy-map "Usuario"` |
| `/team-canvas` | Canvas de equipo colaborativo | `/team-canvas "Equipo"` |
| `/raci` | Matriz RACI de responsabilidades | `/raci "Proyecto"` |
| `/delegation-poker` | Niveles de delegación por decisiones | `/delegation-poker "Decisiones"` |
| `/moving-motivators` | Motivadores del equipo (Management 3.0) | `/moving-motivators "Equipo"` |
| `/kudos-wall` | Muro de reconocimientos acumulados | `/kudos-wall "Título"` |
| `/icebreaker` | Pregunta aleatoria para romper el hielo | `/icebreaker` |
| `/celebrate` | Celebra logros del equipo | `/celebrate @usuario "logro"` |

##### 📋 Gestión de Reuniones

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/standup` | Daily standup virtual | `/standup` |
| `/agenda` | Agenda de reunión con tiempos por tema | `/agenda "Título de la reunión"` |
| `/lean-coffee` | Formato Lean Coffee para discusiones | `/lean-coffee "Sesión"` |
| `/parking-lot` | Temas para discutir después | `/parking-lot "Título"` |
| `/timer` | Temporizador compartido | `/timer "Título" 25` |
| `/pomodoro` | Temporizador pomodoro compartido (25/5 min) | `/pomodoro "Título"` |
| `/working-agreements` | Acuerdos de trabajo del equipo | `/working-agreements "Equipo"` |

##### 🗺️ Planificación y Frameworks

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/lean-canvas` | Lean Canvas para modelo de negocio | `/lean-canvas "Producto"` |
| `/customer-journey` | Mapa del viaje del cliente | `/customer-journey "Proceso"` |
| `/user-story-mapping` | Mapeo de historias de usuario | `/user-story-mapping "Epic"` |
| `/inception-deck` | Inception Deck (10 preguntas del proyecto) | `/inception-deck "Proyecto"` |
| `/roadmap` | Timeline visual con milestones | `/roadmap "Título"` |
| `/okr` | Definir y trackear OKRs | `/okr "Título"` |
| `/dependency-map` | Visualizar dependencias entre tareas | `/dependency-map "Título"` |
| `/capacity` | Capacidad disponible del equipo | `/capacity "Título"` |

##### ✅ Tareas y Seguimiento

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/checklist` | Lista de tareas colaborativa | `/checklist "Título" "Item1" "Item2"` |
| `/action-items` | Lista de acciones con responsable y fecha | `/action-items "Título"` |
| `/question` | Pregunta a un stakeholder | `/question @usuario "¿pregunta?"` |

##### 🎨 Visual y Canvas

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/whiteboard` | Pizarra colaborativa (Excalidraw) | `/whiteboard "Título de la pizarra"` |

#### ⚙️ Gestión (Management)

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/quick-priority` | Crea prioridad rápida | `/quick-priority "Título"` |
| `/priorities` | Lista prioridades filtradas | `/priorities [filtros]` |
| `/decision` | Registra decisión importante | `/decision "descripción"` |
| `/incident` | Gestión de incidentes con timeline | `/incident "Título" P0\|P1\|P2\|P3\|P4` |

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

**Iniciar brainstorming:**
```
/brainstorm "¿Cómo podemos mejorar la velocidad del equipo?"
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

**Ver velocidad del equipo:**
```
/velocity
```

---

## Comando /velocity - Velocidad del Equipo

### Descripción

El comando `/velocity` analiza la velocidad del equipo mostrando cuántas prioridades se completan por semana, identificando tendencias y generando predicciones basadas en datos históricos.

### Uso Básico

```
/velocity
```

### Características

#### 1. **Análisis de 6 Semanas**

Muestra un gráfico de barras con las últimas 6 semanas, indicando:
- Prioridades completadas por semana
- Semana actual destacada en color púrpura/rosa
- Barra de predicción para la próxima semana (línea punteada)

#### 2. **Métricas Principales**

**Promedio por Semana:**
- Calcula el promedio de prioridades completadas en las últimas 4 semanas
- Útil para planificación de sprints y compromisos

**Tendencia:**
- 📈 **Aumentando**: El equipo está completando más prioridades cada semana (+X%)
- 📉 **Disminuyendo**: La velocidad está bajando, puede indicar bloqueadores (-X%)
- ➖ **Estable**: Ritmo consistente y predecible

**Predicción Próxima Semana:**
- Usa regresión lineal simple basada en las últimas 4 semanas
- Proyecta cuántas prioridades se completarán la próxima semana
- Útil para planificar capacidad y compromisos

#### 3. **Análisis Inteligente**

El comando proporciona insights automáticos:

- **Tendencia al alza**: "Excelente: La velocidad del equipo está aumentando. El equipo está completando más prioridades cada semana."
- **Tendencia a la baja**: "Atención: La velocidad está disminuyendo. Considera revisar si hay bloqueadores o sobrecarga de trabajo."
- **Tendencia estable**: "Consistente: La velocidad se mantiene estable. El equipo tiene un ritmo predecible."

#### 4. **Visualización Clara**

- **Gráfico de barras**: Muestra evolución temporal de forma visual
- **Tooltips**: Al pasar el mouse sobre las barras, muestra información detallada
- **Colores distintivos**:
  - Morado/Rosa: Semana actual
  - Púrpura claro: Semanas anteriores
  - Índigo con borde punteado: Predicción

### Casos de Uso

#### Planning de Sprint

```
/velocity
```
Antes de planificar el próximo sprint, revisa la velocidad histórica y usa la predicción para comprometerte a un número realista de prioridades.

#### Retrospectivas

Usa `/velocity` en retrospectivas para:
- Identificar si el equipo está mejorando
- Detectar caídas de velocidad y analizar causas
- Celebrar mejoras consistentes

#### Reportes a Stakeholders

Muestra tendencias objetivas basadas en datos:
- "Nuestra velocidad promedio es de 8 prioridades/semana"
- "Estamos en tendencia al alza (+15%)"
- "Proyectamos completar 9 prioridades la próxima semana"

#### Detección de Problemas

Si la tendencia es decreciente:
1. Ejecuta `/blockers` para ver prioridades bloqueadas
2. Ejecuta `/team-load` para ver distribución de carga
3. Considera hacer un `/standup` para identificar impedimentos

### Cálculos Técnicos

#### Velocidad Promedio
```
Promedio = Σ(prioridades completadas en últimas 4 semanas) / 4
```

#### Tendencia
Compara últimas 2 semanas vs 2 anteriores:
- Si cambio > 10% → Aumentando
- Si cambio < -10% → Disminuyendo
- Si -10% ≤ cambio ≤ 10% → Estable

#### Predicción (Regresión Lineal Simple)
```
y = mx + b
Donde:
- x = número de semana
- y = prioridades completadas
- m = pendiente (tasa de cambio)
- b = intercepto
```

### Limitaciones

- Requiere al menos 3 semanas de datos históricos para predicciones confiables
- La predicción asume que las condiciones actuales se mantendrán
- No considera factores externos (vacaciones, cambios de equipo, etc.)
- Solo cuenta prioridades marcadas como `COMPLETADO`

---

## Comando /brainstorm - Sesión de Brainstorming Colaborativa

### Descripción

El comando `/brainstorm` crea una sesión interactiva de brainstorming donde todos los miembros del equipo pueden contribuir con ideas y votar por las mejores propuestas en tiempo real.

### Uso Básico

```
/brainstorm "¿Tema o pregunta para el brainstorming?"
```

### Características

#### 1. **Contribución Abierta**

Cualquier miembro del equipo puede:
- Agregar nuevas ideas a la sesión
- Ver todas las ideas en tiempo real
- Votar por las ideas que más le gusten (👍)
- Retirar su voto en cualquier momento

#### 2. **Sistema de Votación**

- **Votos ilimitados**: Puedes votar por todas las ideas que quieras
- **Visual feedback**: Ideas votadas se resaltan con color amarillo
- **Contador de votos**: Cada idea muestra cuántos votos tiene
- **Toggle vote**: Clic nuevamente para quitar tu voto

#### 3. **Ordenamiento Inteligente**

Dos modos de visualización:
- **🔥 Más votadas**: Ordena por número de votos (default)
- **⏰ Más recientes**: Ordena por fecha de creación

#### 4. **Métricas en Tiempo Real**

Muestra estadísticas de la sesión:
- 💡 **Total de ideas**: Número total de ideas contribuidas
- 👍 **Total de votos**: Suma de todos los votos
- 👥 **Participantes**: Número de usuarios que han contribuido

#### 5. **Identificación de Ideas Top**

- La idea con más votos recibe insignia **🏆 Top Idea**
- Resaltado visual con borde amarillo
- Útil para identificar rápidamente el consenso

#### 6. **Autoría Visible**

Cada idea muestra:
- 👤 Nombre del autor
- ⏰ Hora de creación
- Fomenta la responsabilidad y reconocimiento

#### 7. **Sesión Cerrable**

El creador de la sesión puede:
- Cerrar la sesión cuando termine el brainstorming
- Al cerrar se muestra la idea ganadora
- Ideas y votos quedan guardados para referencia

### Casos de Uso

#### Innovación y Mejora Continua

```
/brainstorm "¿Qué features podemos agregar al producto?"
```

Ideal para:
- Roadmap de producto
- Mejoras de procesos
- Nuevas iniciativas

#### Resolución de Problemas

```
/brainstorm "¿Cómo resolvemos el cuello de botella en deployment?"
```

Usa cuando:
- Hay un problema que requiere creatividad
- Necesitas perspectivas diversas
- Quieres explorar múltiples soluciones

#### Retrospectivas

```
/brainstorm "¿Qué podemos mejorar en el próximo sprint?"
```

Perfecto para:
- Identificar áreas de mejora
- Generar action items
- Priorizar cambios por votación

#### Planificación

```
/brainstorm "Ideas para el nombre del nuevo proyecto"
```

Útil cuando:
- Necesitas tomar una decisión en grupo
- Quieres opciones creativas
- El equipo debe tener voz

### Flujo de Trabajo Típico

1. **Crear sesión**: Líder ejecuta `/brainstorm "pregunta"`
2. **Fase de ideación** (5-10 min): Todos agregan ideas sin juzgar
3. **Fase de votación** (3-5 min): Equipo vota las mejores ideas
4. **Ordenar por votos**: Cambiar a vista "Más votadas"
5. **Discusión**: Hablar sobre las top 3 ideas
6. **Cerrar sesión**: Creador cierra y captura idea ganadora

### Consejos de Uso

#### Para Facilitadores

- 🎯 **Pregunta clara**: Formula preguntas específicas y accionables
- ⏱️ **Tiempo límite**: Establece un tiempo para cada fase
- 🤐 **Sin juicios**: En fase de ideación, acepta todas las ideas
- 🗣️ **Síguele**: Después del brainstorm, crea tareas con `/quick-priority`

#### Para Participantes

- 💭 **Cantidad sobre calidad**: Al inicio, genera muchas ideas
- 🔄 **Builds on ideas**: Lee ideas de otros y construye sobre ellas
- 👍 **Vota honestamente**: Vota por ideas que realmente apoyarías
- 📝 **Se específico**: Ideas claras y concisas son más fáciles de evaluar

### Ventajas sobre Brainstorming Tradicional

| Brainstorming Tradicional | /brainstorm en Canales |
|---------------------------|------------------------|
| Voces dominantes | Todos participan por igual |
| Ideas se pierden | Todo queda registrado |
| Difícil priorizar | Votación inmediata |
| Requiere reunión | Asíncrono y flexible |
| Sesgos de grupo | Ideas anónimas en tiempo de creación |

### Límites y Consideraciones

- **No hay límite** de ideas por sesión
- **Sin edición**: Las ideas no se pueden editar una vez publicadas
- **Votación persistente**: Los votos se guardan permanentemente
- **Cierre irreversible**: Una vez cerrada, la sesión no se puede reabrir
- **Requiere participación**: Funciona mejor con 3+ personas activas

### Integración con Otros Comandos

Después del brainstorming, usa:
- `/quick-priority "Top Idea"` - Convertir idea en tarea
- `/decision "Vamos con Idea X"` - Documentar la decisión
- `/poll "¿Implementamos A o B?"` - Refinar con encuesta

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

## Comando /mind-map - Mapa Mental Colaborativo Gráfico

### Descripción

El comando `/mind-map` crea un mapa mental visual e interactivo usando ReactFlow, donde el equipo puede organizar ideas jerárquicamente con nodos conectados en tiempo real.

### Uso Básico

```
/mind-map "Tema central o pregunta"
```

### Características

#### 1. **Visualización Gráfica con ReactFlow**

- **Nodos visuales**: Cada idea es un nodo rectangular con información del autor
- **Layout automático**: Los nodos se posicionan automáticamente por niveles jerárquicos
- **Nodos raíz**: Destacados en azul para identificar ideas principales
- **Edges animados**: Conexiones animadas entre nodos padre-hijo
- **Controles interactivos**: Pan, zoom, fit view integrados

#### 2. **Jerarquía Parent-Child**

- Cada nodo puede tener múltiples hijos
- Los nodos se organizan por niveles:
  - **Nivel 0**: Nodos raíz (ideas principales)
  - **Nivel 1+**: Nodos hijos (sub-ideas)
- Layout inteligente evita solapamientos

#### 3. **Acciones Rápidas**

- **Agregar Nodo Raíz**: Botón principal para crear ideas de primer nivel
- **➕ Agregar hijo**: Cada nodo tiene botón + para expandir la idea
- **➖ Eliminar nodo**: Solo el creador del nodo puede eliminarlo (elimina también todos sus hijos)

#### 4. **Lista de Acciones**

Panel lateral muestra todos los nodos con:
- Texto de la idea
- Nombre del autor
- Botones de acción rápida

#### 5. **Cierre de Sesión**

El creador puede cerrar el mapa cuando termine:
- Estado queda guardado permanentemente
- Útil para documentar sesiones de brainstorming

### Casos de Uso

#### Exploración de Ideas

```
/mind-map "¿Cómo mejorar la retención de usuarios?"
```

Ideal para:
- Analizar problemas complejos desde múltiples ángulos
- Descomponer features grandes en componentes
- Mapear dependencias entre ideas

#### Planificación de Proyectos

```
/mind-map "Plan de lanzamiento Q1"
```

Usa para:
- Desglosar entregables por fase
- Identificar tareas y subtareas
- Visualizar el scope completo

#### Brainstorming Estructurado

```
/mind-map "Ideas para reducir costos"
```

Perfecto para:
- Generar ideas categorizadas
- Construir sobre ideas de otros
- Ver relaciones entre conceptos

### Ventajas sobre Mapas Tradicionales

| Mapa Mental Tradicional | /mind-map en Canales |
|-------------------------|---------------------|
| Requiere herramienta externa | ✅ Integrado en el flujo de trabajo |
| Difícil colaborar en tiempo real | ✅ Colaboración simultánea |
| Se pierde el contexto | ✅ Guardado con la conversación |
| Estático | ✅ Interactivo y navegable |
| No muestra autoría | ✅ Cada nodo identifica al autor |

---

## Comando /decision-matrix - Matriz de Decisión Colaborativa

### Descripción

El comando `/decision-matrix` crea una matriz interactiva para evaluar opciones contra múltiples criterios, permitiendo que el equipo puntúe colaborativamente y llegue a decisiones basadas en datos.

### Uso Básico

```
/decision-matrix "¿Qué decisión tomar?" "Criterio 1" "Criterio 2" "Criterio 3"
```

Después te pedirá ingresar las opciones separadas por comas.

### Características

#### 1. **Matriz Interactiva**

- **Filas**: Opciones a evaluar
- **Columnas**: Criterios de evaluación
- **Celdas**: Cada usuario puntúa de 1 a 5
- **Total**: Suma automática por opción

#### 2. **Sistema de Puntuación**

**Escala:**
- 1 = Muy bajo
- 2 = Bajo
- 3 = Medio
- 4 = Alto
- 5 = Muy alto

**Mecánica:**
- Click en botones 1-5 para puntuar
- Una vez puntuada, no se puede cambiar (evita sesgo)
- Cada celda muestra el promedio de todos los votos

#### 3. **Identificación del Ganador**

- **🏆 Insignia de trofeo**: La opción con mayor puntaje total
- **Resaltado visual**: Borde o color especial
- **Útil para**: Tomar decisiones objetivas basadas en consenso

#### 4. **Transparencia**

- Todos ven los promedios en tiempo real
- No se muestran votaciones individuales (reduce sesgo)
- El total es visible para comparar opciones

### Casos de Uso

#### Selección de Tecnología

```
/decision-matrix "¿Qué framework usar?" "Performance" "Curva de aprendizaje" "Comunidad" "Ecosistema"

Opciones: React, Vue, Svelte, Angular
```

Evalúa tecnologías objetivamente contra criterios importantes.

#### Priorización de Features

```
/decision-matrix "Features para Q1" "Impacto en usuarios" "Esfuerzo de desarrollo" "ROI estimado"

Opciones: Feature A, Feature B, Feature C
```

Decide qué features construir primero basado en múltiples factores.

#### Selección de Proveedores

```
/decision-matrix "Proveedor de Cloud" "Costo" "Performance" "Soporte" "Escalabilidad"

Opciones: AWS, GCP, Azure, DigitalOcean
```

Compara proveedores de servicios de forma estructurada.

### Consejos de Uso

- **Criterios SMART**: Usa criterios medibles y específicos
- **Balance de criterios**: No más de 5-6 criterios (evita parálisis)
- **Opciones viables**: Solo incluye opciones realmente considerables
- **Participación diversa**: Busca input de diferentes roles (PM, Dev, Design)

---

## Comando /dot-voting - Votación con Puntos

### Descripción

El comando `/dot-voting` implementa la técnica de "dot voting" donde cada participante tiene un número limitado de puntos para distribuir entre opciones, permitiendo priorización democrática.

### Uso Básico

```
/dot-voting "¿Pregunta?" 5 "Opción 1" "Opción 2" "Opción 3"
```

Cada usuario recibirá 5 puntos para distribuir libremente.

### Características

#### 1. **Distribución Flexible**

- **Puntos totales**: Configurables (ej: 3, 5, 10 puntos)
- **Distribución libre**: Puedes poner todos los puntos en una opción
- **Múltiples votos**: O distribuirlos entre varias opciones
- **Control visual**: Muestra cuántos puntos te quedan

#### 2. **Indicadores Visuales**

- **Puntos por opción**: Círculos (dots) mostrando votos
- **Total de votos**: Número grande por opción
- **Ganador destacado**: Opción con más puntos resaltada
- **Tu voto**: Diferente color para tus propios puntos

#### 3. **Cierre y Resultados**

Al cerrar:
- Se muestra la opción ganadora
- Total de puntos por opción
- Útil para documentar decisiones

### Casos de Uso

#### Priorización de Backlog

```
/dot-voting "¿Qué trabajar en el próximo sprint?" 3 "Feature A" "Feature B" "Feature C" "Bug Fix D"
```

El equipo distribuye puntos según prioridad percibida.

#### Retrospectivas

```
/dot-voting "¿Qué tema discutir en profundidad?" 5 "Comunicación" "Procesos" "Herramientas" "Colaboración"
```

Enfoca la retro en los temas más votados.

#### Naming o Decisiones Creativas

```
/dot-voting "Nombre del proyecto" 3 "Phoenix" "Nexus" "Catalyst" "Horizon"
```

Democráticamente elige entre opciones creativas.

### Ventajas de Dot Voting

- ✅ **Rápido**: Más rápido que discutir cada opción
- ✅ **Inclusivo**: Todas las voces cuentan igual
- ✅ **Flexible**: Permite expresar intensidad de preferencia
- ✅ **Visual**: Resultados inmediatamente claros
- ✅ **Escalable**: Funciona con 3 o 30 opciones

---

## Comandos de Retrospectiva

El sistema incluye **7 formatos diferentes** de retrospectiva ágil, cada uno con un enfoque único para generar insights del equipo.

### Formatos Disponibles

#### `/rose-bud-thorn` - Feedback Estructurado

**Secciones:**
- 🌹 **Roses (Positivo)**: Qué salió bien, celebraciones
- 🌱 **Buds (Potencial)**: Oportunidades, ideas emergentes
- 🌵 **Thorns (Problemas)**: Obstáculos, frustraciones

**Cuándo usar:**
- Retrospectivas regulares de sprint
- Cuando buscas balance entre positivo y negativo
- Equipos que tienden a enfocarse solo en problemas

#### `/sailboat` - Retrospectiva Visual

**Secciones:**
- ⛵ **Viento**: Qué nos impulsa hacia adelante
- ⚓ **Ancla**: Qué nos frena o detiene
- 🪨 **Rocas**: Riesgos y obstáculos futuros
- 🏝️ **Isla**: Meta u objetivo que queremos alcanzar

**Cuándo usar:**
- Proyectos a largo plazo
- Cuando necesitas visualizar el viaje completo
- Planificación de roadmap

#### `/start-stop-continue` - Retrospectiva Simple

**Secciones:**
- ▶️ **Start (Empezar)**: Qué deberíamos comenzar a hacer
- ⏹️ **Stop (Parar)**: Qué deberíamos dejar de hacer
- ▶️ **Continue (Continuar)**: Qué está funcionando bien

**Cuándo usar:**
- Equipos nuevos en retrospectivas
- Cuando necesitas acciones claras e inmediatas
- Time-boxed (retrospectivas cortas)

#### `/swot` - Análisis Estratégico

**Secciones:**
- 💪 **Strengths (Fortalezas)**: Ventajas internas
- ⚠️ **Weaknesses (Debilidades)**: Áreas de mejora internas
- 🎯 **Opportunities (Oportunidades)**: Factores externos positivos
- 🚨 **Threats (Amenazas)**: Riesgos externos

**Cuándo usar:**
- Planificación trimestral o anual
- Análisis de producto o iniciativa
- Decisiones estratégicas

#### `/soar` - Framework Orientado al Futuro

**Secciones:**
- 💪 **Strengths (Fortalezas)**: Qué hacemos bien actualmente
- 🎯 **Opportunities (Oportunidades)**: Posibilidades de crecimiento
- ✨ **Aspirations (Aspiraciones)**: Hacia dónde queremos ir
- 🏆 **Results (Resultados)**: Qué éxito se ve como

**Cuándo usar:**
- Planificación estratégica positiva
- Cuando el equipo necesita motivación
- Alternativa a SWOT enfocada en lo positivo y el futuro
- Sesiones de visión y misión

**Diferencia con SWOT:**
SOAR se enfoca en lo positivo (fortalezas y oportunidades) y el futuro (aspiraciones y resultados), mientras que SWOT analiza tanto aspectos positivos como negativos (debilidades y amenazas). SOAR es más apropiado cuando buscas inspirar y motivar al equipo hacia el futuro.

#### `/six-hats` - Pensamiento Paralelo

**Secciones (6 sombreros de Edward de Bono):**
- 🎩 **Blanco**: Hechos y datos objetivos
- 💛 **Amarillo**: Optimismo y beneficios
- 🖤 **Negro**: Precaución y riesgos
- 🔴 **Rojo**: Emociones e intuición
- 💚 **Verde**: Creatividad e ideas nuevas
- 🔵 **Azul**: Control y proceso

**Cuándo usar:**
- Decisiones complejas que requieren múltiples perspectivas
- Equipos con pensamiento grupal
- Análisis profundo de problemas

#### `/crazy-8s` - Design Sprint

**Secciones:**
- 8 cuadrantes numerados para ideas rápidas
- Basado en metodología de Design Sprint de Google

**Cuándo usar:**
- Sesiones de ideación rápida
- Generar muchas opciones en poco tiempo
- Problemas de diseño o UX

#### `/affinity-map` - Organización de Ideas

**Secciones:**
- 📌 Categorías personalizables
- Agrupa ideas similares por tema

**Cuándo usar:**
- Después de brainstorming extenso
- Organizar feedback de usuarios
- Identificar patrones en datos cualitativos

#### `/parking-lot` - Temas Pendientes

**Funcionalidad:**
- 🅿️ Lista colaborativa de temas para discutir después
- Los miembros agregan items con su nombre automáticamente
- Solo el creador del item puede eliminarlo
- Cerrar el parking lot cuando se complete

**Cuándo usar:**
- Durante reuniones para no desviarse del tema principal
- Guardar ideas que surgen fuera de contexto
- Temas que requieren más investigación antes de discutir

**Cómo funciona:**
1. Crear con `/parking-lot "Título"`
2. Cada miembro agrega temas escribiendo en el campo de texto
3. Los temas se acumulan con el nombre del autor
4. Solo el creador o admin puede cerrar el parking lot
5. Solo el autor de un item puede eliminarlo

#### `/kudos-wall` - Reconocimientos

**Funcionalidad:**
- 💝 Muro de reconocimientos y agradecimientos
- Enviar kudos públicos a compañeros de equipo
- Especificar destinatario y mensaje de reconocimiento
- Acumular todos los kudos en un solo lugar

**Cuándo usar:**
- Al final de sprints o proyectos
- Celebrar logros individuales o de equipo
- Fomentar cultura de apreciación
- Retrospectivas positivas

**Cómo funciona:**
1. Crear con `/kudos-wall "Título"`
2. Los miembros envían kudos especificando:
   - **Para**: Nombre del compañero
   - **Mensaje**: Reconocimiento o agradecimiento
3. Todos los kudos se muestran en formato de tarjetas
4. Solo el creador puede cerrar el muro

#### `/icebreaker` - Romper el Hielo

**Funcionalidad:**
- ☕ Genera pregunta aleatoria para conocerse mejor
- 15 preguntas diferentes rotativas
- Sin necesidad de parámetros adicionales

**Cuándo usar:**
- Al inicio de reuniones con equipos nuevos
- Kickoffs de proyectos
- Después de incorporación de nuevos miembros
- Crear ambiente relajado antes de reuniones importantes

**Preguntas incluidas:**
- Temas personales ligeros (mascota, comida favorita)
- Preferencias y aspiraciones (superpoder, lugar a visitar)
- Entretenimiento (película favorita, canción actual)
- Reflexiones (mejor consejo, tradición familiar)

**Cómo funciona:**
1. Ejecutar `/icebreaker`
2. Se muestra una pregunta aleatoria
3. Tomar 1-2 minutos para que cada persona comparta
4. Responder en el chat de forma informal

#### `/action-items` - Gestión de Acciones

**Funcionalidad:**
- ✅ Lista colaborativa de acciones con seguimiento
- Cada acción tiene descripción, responsable y fecha límite
- Marcar/desmarcar como completado con un clic
- Indicadores visuales de items vencidos
- Solo el creador del item o admin puede eliminarlo

**Características:**
- Contador de completados vs total
- Alerta visual de items vencidos (borde rojo)
- Fecha de completación automática
- Progreso en porcentaje al cerrar

**Cuándo usar:**
- Al final de reuniones para capturar acciones
- Seguimiento de compromisos del equipo
- Retrospectivas para definir mejoras
- Decisiones que requieren seguimiento

**Cómo funciona:**
1. Crear con `/action-items "Título"`
2. Agregar acciones especificando:
   - **Descripción**: Qué hacer
   - **Responsable**: Nombre del encargado
   - **Fecha límite**: Formato YYYY-MM-DD
3. Cualquiera puede marcar como completado
4. Solo creador del item puede eliminarlo
5. Solo creador del widget puede cerrarlo

#### `/team-health` - Spotify Health Check

**Funcionalidad:**
- 📊 Health check del equipo basado en el modelo Spotify
- 9 áreas predefinidas del modelo oficial
- Votación con emojis del 1 al 5 (😞 Bad → 😀 Awesome)
- Promedios y distribución visual por área
- Cada usuario puede votar una vez por área (actualizable)

**Áreas evaluadas:**
1. **Delivering Value** - ¿Entregamos valor a usuarios?
2. **Fun** - ¿Es divertido trabajar aquí?
3. **Health of Codebase** - ¿Está sano nuestro código?
4. **Learning** - ¿Estamos aprendiendo cosas nuevas?
5. **Mission** - ¿Entendemos por qué estamos aquí?
6. **Pawns or Players** - ¿Tenemos control de nuestro destino?
7. **Speed** - ¿Podemos entregar rápido?
8. **Support** - ¿Tenemos el apoyo necesario?
9. **Teamwork** - ¿Trabajamos bien juntos?

**Escala de votación:**
- 😞 **Bad (1)** - No confío en absoluto
- 🙁 **Concerning (2)** - Tengo muchas dudas
- 😐 **Okay (3)** - Hay incertidumbre
- 🙂 **Good (4)** - Bastante seguro
- 😀 **Awesome (5)** - Totalmente confiado

**Cuándo usar:**
- Retrospectivas de sprint o quarterly
- Identificar áreas que necesitan atención
- Trackear mejora del equipo en el tiempo
- One-on-ones con el equipo completo

**Cómo funciona:**
1. Crear con `/team-health "Sprint N"`
2. Cada miembro vota en cada área (1-5)
3. Los votos se pueden actualizar antes de cerrar
4. Se muestra promedio y distribución por área
5. Solo el creador puede cerrar el health check

#### `/confidence-vote` - Nivel de Confianza

**Funcionalidad:**
- 📈 Votación rápida de nivel de confianza (1-5)
- Útil para PI Planning, releases, decisiones importantes
- Promedio visible con emoji representativo
- Gráfico de distribución de votos
- Lista de quién votó qué

**Escala:**
- 😰 **Muy bajo (1)** - No confío en absoluto
- 😟 **Bajo (2)** - Tengo muchas dudas
- 😐 **Moderado (3)** - Hay incertidumbre
- 🙂 **Alto (4)** - Bastante seguro
- 😄 **Muy alto (5)** - Totalmente confiado

**Cuándo usar:**
- PI Planning: ¿Confiamos en los objetivos?
- Antes de releases: ¿Estamos listos?
- Decisiones técnicas: ¿Confiamos en este approach?
- Estimaciones: ¿Qué tan seguros estamos?

**Cómo funciona:**
1. Crear con `/confidence-vote "¿Pregunta?"`
2. Cada miembro vota su nivel de confianza (1-5)
3. Los votos se pueden actualizar
4. Se calcula y muestra promedio automáticamente
5. Solo el creador puede cerrar la votación

**Interpretación de resultados:**
- **≥4.5**: Excelente confianza, adelante
- **3.5-4.4**: Buena confianza, con algunas reservas
- **2.5-3.4**: Confianza moderada, explorar preocupaciones
- **<2.5**: Baja confianza, abordar riesgos antes de proceder

#### `/pomodoro` - Temporizador Pomodoro Compartido

**Funcionalidad:**
- ⏱️ Temporizador pomodoro compartido para el equipo
- Ciclos de trabajo (25 min) y descanso (5 min)
- Control de inicio, pausa y reset
- Contador de sesiones completadas
- Sincronización en tiempo real para todos los usuarios

**Cómo funciona:**
1. Crear con `/pomodoro "Sesión de coding"`
2. Iniciar el temporizador (25 minutos de trabajo)
3. Todos ven el countdown en tiempo real
4. Al terminar, automáticamente cambia a descanso (5 min)
5. Contador de sesiones completadas
6. Solo el creador puede cerrar

**Cuándo usar:**
- Pair programming o mob programming
- Sesiones de focus time en equipo
- Timeboxing para reuniones
- Sprint planning con tiempo limitado

#### `/agenda` - Agenda de Reunión

**Funcionalidad:**
- 📋 Agenda estructurada para reuniones
- Temas con tiempo asignado y responsable
- Marcar temas como completados durante la reunión
- Cálculo automático de tiempo total
- Ayuda a mantener reuniones enfocadas

**Cómo funciona:**
1. Crear con `/agenda "Daily Standup"`
2. Agregar temas: descripción, tiempo (minutos), responsable
3. Durante la reunión, marcar temas completados
4. Ver tiempo total asignado
5. Solo el creador puede cerrar

**Cuándo usar:**
- Daily standups
- Sprint planning
- Retrospectivas
- Reuniones con stakeholders
- Workshops con múltiples temas

#### `/capacity` - Capacidad del Equipo

**Funcionalidad:**
- 👥 Tracking de capacidad disponible del equipo
- Miembros con horas disponibles por día
- Cálculo automático de totales
- Horas/día, horas/semana, días/semana
- Útil para sprint planning

**Cómo funciona:**
1. Crear con `/capacity "Sprint 24"`
2. Agregar miembros con sus horas disponibles por día
3. Ver totales calculados automáticamente
4. Solo el creador puede cerrar

**Cuándo usar:**
- Sprint planning
- Planificación de releases
- Evaluación de carga de trabajo
- Resource planning

#### `/dependency-map` - Mapa de Dependencias

**Funcionalidad:**
- 🔗 Visualización de dependencias entre tareas
- Lógica de bloqueo automática
- No se puede completar una tarea hasta que sus dependencias estén listas
- Indicadores visuales de tareas bloqueadas
- Ideal para planificación compleja

**Cómo funciona:**
1. Crear con `/dependency-map "Desarrollo Feature X"`
2. Agregar tareas con sus dependencias
3. Dependencias separadas por comas (ej: "Tarea A, Tarea B")
4. Sistema bloquea automáticamente tareas con dependencias pendientes
5. Marcar como completado cuando está listo
6. Solo el creador puede cerrar

**Indicadores:**
- 🔒 **Bloqueado** - Dependencias pendientes (rojo)
- 🟢 **Verde** - Dependencia completada
- 🟡 **Amarillo** - Dependencia pendiente

**Cuándo usar:**
- Features con múltiples tareas interdependientes
- Migraciones complejas
- Lanzamientos con prerequisites
- Proyectos con workflow secuencial

#### `/okr` - Objectives and Key Results

**Funcionalidad:**
- 🎯 Sistema completo de OKRs
- Objetivos con múltiples key results
- Progress tracking con sliders (0-100%)
- Promedio de progreso por objetivo
- Visualización clara de avance

**Estructura:**
- **Objetivo**: Meta cualitativa (ej: "Mejorar experiencia del usuario")
- **Key Results**: Métricas cuantificables (ej: "Reducir tiempo de carga a <2s")

**Cómo funciona:**
1. Crear con `/okr "Q4 2025"`
2. Agregar objetivos
3. Agregar key results a cada objetivo
4. Actualizar progreso con sliders
5. Ver promedio de progreso por objetivo
6. Solo el creador puede cerrar

**Cuándo usar:**
- Planning trimestral/anual
- Alignment de equipo con objetivos de negocio
- Tracking de metas estratégicas
- Retrospectivas de OKRs

#### `/roadmap` - Timeline de Milestones

**Funcionalidad:**
- 🗺️ Timeline visual de milestones
- Milestones con fecha y status
- Ordenamiento cronológico automático
- Visual timeline con puntos de colores
- Tracking de progreso a lo largo del tiempo

**Estados de milestone:**
- ⚪ **Pending** - No iniciado (gris)
- 🟡 **In Progress** - En desarrollo (amarillo)
- 🟢 **Completed** - Completado (verde)

**Cómo funciona:**
1. Crear con `/roadmap "Proyecto Mobile App"`
2. Agregar milestones con título y fecha
3. Actualizar status a medida que avanzan
4. Milestones se ordenan automáticamente por fecha
5. Solo el creador puede cerrar

**Cuándo usar:**
- Planificación de releases
- Proyectos de largo plazo
- Comunicación de roadmap a stakeholders
- Tracking de hitos importantes

### Flujo General de Retrospectivas

1. **Crear**: Líder ejecuta comando con título
2. **Ideación** (10-15 min): Equipo agrega items en silencio
3. **Revisión** (10 min): Lean todos los items juntos
4. **Discusión** (15-20 min): Hablen sobre los más importantes
5. **Acciones** (10 min): Usen `/quick-priority` para crear tareas
6. **Cierre**: Creador cierra la retrospectiva

---

## Webhooks

Los **webhooks** permiten integrar tus canales con sistemas externos para enviar y recibir información automáticamente.

### Tipos de Webhooks

#### 🔽 Webhooks Entrantes (Incoming)

Reciben datos de sistemas externos y los publican en el canal como mensajes.

**Casos de uso:**
- Notificaciones de CI/CD (Jenkins, GitHub Actions)
- Alertas de monitoreo (Datadog, New Relic)
- Actualizaciones de CRM (Salesforce, HubSpot)
- Eventos de sistemas personalizados

**Ejemplo visual:**

Los mensajes de webhooks se muestran con una **card morada distintiva** que incluye:
- 🔮 Header degradado púrpura/índigo
- 👤 Nombre personalizable del sistema externo
- 📊 Badge "Sistema Externo"
- 📝 Contenido del mensaje formateado
- 🔍 Metadata expandible (opcional)

#### 🔼 Webhooks Salientes (Outgoing)

Envían eventos del canal a sistemas externos cuando ocurren ciertas acciones.

**Eventos disponibles:**
- `message.created` - Nuevo mensaje enviado
- `message.updated` - Mensaje editado
- `message.deleted` - Mensaje eliminado
- `message.pinned` - Mensaje anclado
- `message.reaction` - Reacción agregada

**Casos de uso:**
- Notificar a Slack cuando hay actividad importante
- Registrar mensajes en sistemas de auditoría
- Disparar automatizaciones en Zapier/Make
- Sincronizar con bases de datos externas

### Configuración de Webhooks

#### Crear Webhook Entrante

1. Ve a tu proyecto → Pestaña **"Webhooks"**
2. Clic en **"Nuevo Webhook"**
3. Configura:
   - **Nombre**: Identifica el webhook (ej: "GitHub Notifications")
   - **Tipo**: Selecciona **"Entrante"**
   - **Canal**: Elige el canal donde aparecerán los mensajes (opcional)
   - **Descripción**: Notas sobre el webhook
4. Clic en **"Crear Webhook"**
5. **Copia la URL y el Secret Token** que se generan automáticamente

**URL generada:**
```
https://tu-app.vercel.app/api/webhooks/incoming/a1b2c3d4e5f6...
```

#### Crear Webhook Saliente

1. Ve a tu proyecto → Pestaña **"Webhooks"**
2. Clic en **"Nuevo Webhook"**
3. Configura:
   - **Nombre**: Identifica el webhook
   - **Tipo**: Selecciona **"Saliente"**
   - **URL de destino**: Donde se enviarán los eventos (ej: https://hooks.slack.com/...)
   - **Eventos**: Marca los eventos que dispararán el webhook
   - **Canal**: Específico o todos los canales (opcional)
4. Clic en **"Crear Webhook"**
5. **Guarda el Secret Token** para validar firmas HMAC

### Usar Webhooks Entrantes

**Formato del payload:**
```json
POST https://tu-app.vercel.app/api/webhooks/incoming/[SECRET]
Content-Type: application/json

{
  "content": "Mensaje que aparecerá en el canal",
  "username": "Nombre del Bot",
  "metadata": {
    "clave1": "valor1",
    "clave2": "valor2"
  }
}
```

**Ejemplo real (GitHub Actions):**
```json
{
  "content": "🚀 Build #1234 completado exitosamente\n\nRama: feature/webhooks\nDuración: 2m 34s",
  "username": "GitHub CI",
  "metadata": {
    "buildNumber": "1234",
    "branch": "feature/webhooks",
    "status": "success",
    "url": "https://github.com/repo/actions/runs/1234"
  }
}
```

**Ejemplo con curl:**
```bash
curl -X POST https://tu-app.vercel.app/api/webhooks/incoming/abc123... \
  -H "Content-Type: application/json" \
  -d '{
    "content": "⚠️ Alerta: CPU al 90% en servidor producción",
    "username": "Datadog",
    "metadata": {
      "severity": "warning",
      "server": "prod-01",
      "cpu": "90%"
    }
  }'
```

### Recibir Webhooks Salientes

Cuando configuras un webhook saliente, tu endpoint recibirá POST requests con este formato:

**Headers:**
```
Content-Type: application/json
X-Webhook-Signature: [HMAC SHA-256 signature]
X-Webhook-Timestamp: [timestamp en milisegundos]
X-Webhook-Event: message.created
X-Webhook-Id: [ID del webhook]
```

**Body:**
```json
{
  "message": {
    "_id": "...",
    "userId": {...},
    "content": "Contenido del mensaje",
    "createdAt": "2025-11-23T..."
  },
  "project": { "id": "..." },
  "channel": { "id": "..." },
  "timestamp": "2025-11-23T..."
}
```

**Validar firma HMAC:**
```javascript
const crypto = require('crypto');

function validateSignature(secret, timestamp, signature, body) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(timestamp + JSON.stringify(body))
    .digest('hex');

  return signature === expectedSignature;
}
```

### Gestión de Webhooks

**Ver webhooks activos:**
- Lista completa con tipo, estado, eventos, último uso
- Indicadores visuales (🔽 Entrante, 🔼 Saliente)
- Badges de estado (Activo/Inactivo)

**Editar webhook:**
- Cambiar nombre, descripción, URL, eventos
- **No se puede cambiar el tipo** después de creado
- El secret token permanece constante

**Activar/Desactivar:**
- Toggle rápido sin eliminar el webhook
- Útil para pausar temporalmente integraciones

**Eliminar webhook:**
- Confirmación requerida
- Elimina permanentemente el webhook y su historial

### Seguridad

**Webhooks Entrantes:**
- ✅ Secret token único de 64 caracteres (256 bits)
- ✅ URL pública pero imposible de adivinar
- ✅ Sin autenticación adicional requerida (el secret es suficiente)
- ✅ Rate limiting en servidor

**Webhooks Salientes:**
- ✅ Firma HMAC SHA-256 en cada request
- ✅ Timestamp para prevenir replay attacks
- ✅ Timeout de 10 segundos por request
- ✅ Headers identificativos (X-Webhook-*)

### Características Avanzadas

**Canal específico vs todos:**
- Configura webhook para un canal específico
- O déjalo en "Todos los canales" para recibir/enviar globalmente

**Metadata personalizada:**
- Los webhooks entrantes pueden incluir metadata arbitraria
- Se muestra en footer expandible en el mensaje
- Útil para tracking, debugging, o información adicional

**Historial de activación:**
- Campo `lastTriggered` muestra última vez que se usó
- Útil para detectar webhooks no usados

---

## Archivos Adjuntos

El sistema de **archivos adjuntos** permite compartir documentos, imágenes, videos y cualquier tipo de archivo dentro de los canales y organizar todos los archivos del proyecto en una pestaña dedicada.

### Almacenamiento con Cloudflare R2

Los archivos se almacenan en **Cloudflare R2**, un servicio de almacenamiento de objetos compatible con S3:

**Ventajas:**
- ✅ **Sin costos de egreso**: Descargas ilimitadas gratis
- ✅ **Económico**: ~$0.015/GB al mes (vs $0.023/GB + egreso en S3)
- ✅ **URLs firmadas**: Seguridad con expiración de 1 hora
- ✅ **Escalable**: Soporta archivos de hasta 50MB por defecto
- ✅ **Compatible S3**: Usa AWS SDK estándar

### Subir Archivos en el Chat

**Ubicación del botón:**
- Ícono 📎 **Paperclip** junto al campo de mensaje
- Disponible solo cuando hay un canal seleccionado

**Proceso de subida:**
1. Haz clic en el botón 📎 Paperclip
2. Se abre panel de carga de archivos
3. Selecciona archivo desde tu dispositivo
4. Validación automática:
   - Tamaño máximo: **50MB**
   - Todos los tipos de archivo permitidos
5. Barra de progreso durante la subida
6. Confirmación visual al completar
7. Panel se cierra automáticamente

**Características:**
- ✅ Nombres con caracteres especiales (acentos, ñ, etc.) se normalizan automáticamente
- ✅ Asociación automática al canal actual
- ✅ Metadata incluye: proyecto, canal, usuario que subió
- ✅ Timestamp de subida

### Ver Archivos en Mensajes

Los archivos adjuntos aparecen como **cards compactas** debajo del contenido del mensaje:

**Información mostrada:**
- 📎 **Ícono** según tipo de archivo (🖼️ imágenes, 📄 PDFs, 📊 Excel, etc.)
- 📝 **Nombre original** del archivo
- 💾 **Tamaño** en formato legible (KB, MB, GB)
- 👤 **Usuario** que subió el archivo
- 📅 **Fecha y hora** de subida

**Acciones disponibles:**
- ⬇️ **Descargar**: Genera URL firmada válida por 1 hora
- 🗑️ **Eliminar**: Solo quien subió o admin puede eliminar

### Pestaña de Archivos del Proyecto

Accede a todos los archivos del proyecto desde la pestaña dedicada **"Archivos"**:

**Funcionalidades:**

#### 1. **Subir Nuevos Archivos**
- Botón "📎 Subir Archivo" en la parte superior
- Mismo proceso que en el chat
- Se asocian al proyecto (sin canal específico si se sube desde la pestaña)

#### 2. **Búsqueda en Tiempo Real**
```
🔍 Buscar archivos...
```
- Busca por nombre de archivo
- Resultados instantáneos mientras escribes
- Ignora mayúsculas/minúsculas

#### 3. **Filtros por Tipo**
- **Todos**: Muestra todos los archivos
- **🖼️ Imágenes**: Solo imágenes (image/*)
- **📄 Documentos**: PDFs, Word, etc.
- **🎥 Videos**: Archivos de video (video/*)
- **🎵 Audio**: Archivos de audio (audio/*)

#### 4. **Vista en Cuadrícula**
- Cards grandes con vista previa visual
- Información completa del archivo
- Botones de acción visibles

#### 5. **Paginación**
- 20 archivos por página
- Navegación con botones anterior/siguiente
- Contador: "Mostrando 1-20 de 45"

### Gestión de Archivos

#### Descargar Archivos

**Proceso seguro:**
1. Usuario hace clic en "⬇️ Descargar"
2. Backend genera **URL firmada** con AWS S3 SDK
3. URL válida por **1 hora** (3600 segundos)
4. Descarga directa desde Cloudflare R2
5. URL expira automáticamente

**Ventajas de URLs firmadas:**
- 🔒 No se pueden compartir permanentemente
- 🔒 Requieren autenticación para generarlas
- 🔒 Previenen hotlinking no autorizado
- ⏱️ Expiración automática

#### Eliminar Archivos

**Permisos:**
- ✅ Usuario que subió el archivo puede eliminarlo
- ✅ Administradores pueden eliminar cualquier archivo
- ❌ Otros usuarios no pueden eliminar

**Proceso de eliminación:**
1. **Soft delete** en base de datos:
   - Campo `isDeleted: true`
   - Campos `deletedAt` y `deletedBy` se actualizan
2. **Hard delete** en R2:
   - Archivo se elimina permanentemente de R2
   - No ocupa espacio de almacenamiento

**Nota:** Si falla la eliminación en R2, el archivo se marca como eliminado en la DB de todas formas para evitar inconsistencias.

### Tipos de Archivos y Iconos

El sistema detecta automáticamente el tipo de archivo y muestra el ícono apropiado:

| Tipo | Ícono | MIME types |
|------|-------|------------|
| Imágenes | 🖼️ | image/* |
| Videos | 🎥 | video/* |
| Audio | 🎵 | audio/* |
| PDFs | 📄 | application/pdf |
| Word | 📝 | .doc, .docx, document |
| Excel | 📊 | .xls, .xlsx, spreadsheet |
| PowerPoint | 📽️ | .ppt, .pptx, presentation |
| Comprimidos | 📦 | .zip, .rar, compressed |
| Texto | 📃 | text/* |
| Otros | 📎 | Cualquier otro |

### Validaciones de Seguridad

#### Tamaño de Archivo
```javascript
Máximo: 50 MB por archivo
```

**Mensaje de error:**
```
"El archivo excede el tamaño máximo permitido (50MB)"
```

#### Sanitización de Nombres

Los nombres de archivo con caracteres especiales se normalizan:

**Ejemplos:**
- `Especificación Técnica.pdf` → `Especificacion Tecnica.pdf`
- `Año 2025.xlsx` → `Ano 2025.xlsx`
- `München Straße.doc` → `Munchen Strasse.doc`

**Proceso:**
1. Normalización NFD (descompone caracteres acentuados)
2. Eliminación de diacríticos (acentos)
3. Reemplazo de caracteres especiales (ñ→n, ü→u, etc.)
4. Solo mantiene caracteres ASCII imprimibles

**Razón:** AWS S3/R2 metadata solo acepta caracteres US-ASCII. Esto previene errores `SignatureDoesNotMatch`.

#### Generación de Keys Únicos

Cada archivo recibe un **key único** en R2:

**Formato:**
```
projects/{projectId}/{timestamp}-{random}-{sanitizedFileName}
```

**Ejemplo:**
```
projects/507f1f77bcf86cd799439011/1732435200000-x9t4j2k8p-documento.pdf
```

**Ventajas:**
- ✅ Previene colisiones de nombres
- ✅ Organizado por proyecto
- ✅ Fácil de identificar y depurar
- ✅ Timestamp permite ordenamiento

### Configuración de R2

Para usar archivos adjuntos, debes configurar Cloudflare R2:

**Variables de entorno requeridas:**
```env
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-bucket-name
```

**Documentación completa:**
Ver `docs/R2_SETUP.md` para guía paso a paso.

### Límites y Cuotas

**Límites por defecto:**
- Tamaño máximo por archivo: **50 MB**
- Sin límite de cantidad de archivos
- Sin límite de almacenamiento total

**R2 Free Tier (Cloudflare):**
- 10 GB de almacenamiento gratis al mes
- Sin costos de egreso (descargas ilimitadas gratis)
- 1 millón de Class A operations gratis
- 10 millones de Class B operations gratis

### Mejores Prácticas

**Para usuarios:**
- 📝 Usa nombres descriptivos para tus archivos
- 🗂️ Aprovecha los filtros para encontrar archivos rápidamente
- 🗑️ Elimina archivos obsoletos para liberar espacio
- 📎 Adjunta archivos relevantes al contexto de la conversación

**Para administradores:**
- 📊 Monitorea el uso de almacenamiento en Cloudflare dashboard
- 🔒 Revisa periódicamente los permisos de R2 API tokens
- 💾 Haz backup de archivos críticos fuera de R2
- ⚙️ Configura alertas en Cloudflare para cuotas

---

## Mensajes de Voz

El sistema de **mensajes de voz** permite a los usuarios grabar y enviar mensajes de audio directamente en el chat, ideal para comunicación rápida o cuando escribir no es conveniente.

### Grabar un Mensaje de Voz

1. Haz clic en el botón **🎤 (micrófono)** junto al campo de mensaje
2. Aparecerá el grabador con un indicador de grabación
3. Haz clic en el **botón rojo** para detener la grabación
4. Haz clic en el **botón verde** para enviar o **X** para cancelar

### Componente de Grabación

**Características del grabador:**
- 🔴 **Indicador de grabación** - punto rojo parpadeante mientras graba
- ⏱️ **Contador de tiempo** - muestra duración actual (formato mm:ss)
- 📊 **Visualización de waveform** - barras animadas que muestran la intensidad del audio
- ⏹️ **Botón detener** - finaliza la grabación
- ✅ **Botón enviar** - envía el mensaje de voz
- ❌ **Botón cancelar** - descarta la grabación

**Límites:**
- ⏰ **Duración máxima**: 5 minutos por mensaje
- 🎵 **Formatos**: WebM (Opus) o MP4 según el navegador
- 🔊 **Configuración de audio**: Cancelación de eco, supresión de ruido, control automático de ganancia

### Reproductor de Audio

Los mensajes de voz se muestran con un reproductor personalizado:

**Características del reproductor:**
- ▶️ **Play/Pause** - controla la reproducción
- 📊 **Waveform visual** - muestra el progreso sobre la forma de onda
- 🔊 **Control de mute** - silencia/activa el audio
- ⏱️ **Tiempo** - muestra tiempo actual y duración total
- 🖱️ **Barra clickeable** - salta a cualquier posición del audio
- ⚡ **Control de velocidad** - cambia la velocidad de reproducción (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
- 📄 **Transcripción con IA** - convierte el audio a texto

### Transcripción con IA

Los mensajes de voz pueden ser transcritos automáticamente usando **Groq Whisper**:

**Cómo transcribir:**
1. En cualquier mensaje de voz, haz clic en el botón **📄 (documento)** junto al control de volumen
2. Espera mientras se procesa (aparece un spinner)
3. La transcripción aparecerá debajo del reproductor

**Características:**
- 🤖 **Modelo**: Whisper large-v3 de Groq
- 🌎 **Idioma**: Español por defecto (detecta automáticamente)
- ⚡ **Velocidad**: Transcripción rápida gracias a Groq
- 📋 **Copiar**: Botón para copiar la transcripción al portapapeles
- 💾 **Persistencia**: La transcripción se guarda en MongoDB y se muestra automáticamente en futuras visitas

**Casos de uso:**
- 📝 Documentar decisiones discutidas en audio
- 🔍 Hacer búsquedas en el contenido de mensajes de voz
- ♿ Accesibilidad para usuarios con dificultades auditivas
- 📱 Leer mensajes cuando no puedes escuchar audio

### Permisos del Navegador

Para grabar mensajes de voz, el navegador necesita acceso al micrófono:

1. La primera vez que uses la función, el navegador pedirá permiso
2. Haz clic en **"Permitir"** para habilitar el micrófono
3. El permiso se guarda para futuras sesiones

**Si el permiso fue denegado:**
- En Chrome: Configuración → Privacidad → Configuración del sitio → Micrófono
- En Firefox: Configuración → Privacidad → Permisos → Micrófono
- En Safari: Preferencias → Sitios web → Micrófono

### Almacenamiento

Los mensajes de voz se almacenan en **Cloudflare R2**:

**Arquitectura:**
- 🗄️ **Archivos de audio**: Almacenados en Cloudflare R2 (object storage)
- 📋 **Metadatos**: Guardados en MongoDB (`r2Key`, duración, tipo MIME, waveform)
- 📝 **Transcripciones**: Guardadas en MongoDB junto con los metadatos

**Flujo de subida:**
1. Usuario graba audio → Se convierte a base64
2. Se sube a R2 via `/api/projects/{id}/voice-upload`
3. Se obtiene `r2Key` único (ej: `voice/{projectId}/{timestamp}-{uuid}.webm`)
4. Mensaje se guarda con `r2Key` en lugar de datos binarios

**Flujo de reproducción:**
1. VoicePlayer solicita URL firmada con `r2Key`
2. API genera URL temporal (válida 1 hora)
3. Audio se reproduce directamente desde R2

**Flujo de transcripción:**
1. API descarga audio desde R2
2. Envía a Groq Whisper para transcribir
3. Transcripción se guarda en MongoDB para persistencia

**Beneficios:**
- ⚡ **Mejor rendimiento**: MongoDB no almacena datos binarios grandes
- 📈 **Escalabilidad**: R2 optimizado para archivos multimedia
- 🔒 **Seguridad**: URLs firmadas con expiración automática
- 🗑️ **Limpieza automática**: Al eliminar mensaje, se borra archivo de R2

**Límites:**
- 📦 **Tamaño máximo**: 10MB por archivo de audio
- ⏰ **URLs firmadas**: Válidas por 1 hora

### Compatibilidad

**Navegadores soportados:**
- ✅ Chrome/Edge (WebM con Opus)
- ✅ Firefox (WebM)
- ✅ Safari (MP4)
- ✅ Navegadores móviles modernos

### Buenas Prácticas

- 🎙️ Usa un micrófono de buena calidad para mejor claridad
- 🔇 Graba en un ambiente silencioso
- ⏱️ Mantén los mensajes breves y concisos
- 📝 Complementa con texto para contexto si es necesario
- 🔊 Verifica el volumen antes de grabar

---

## Pestaña de Dinámicas

La **pestaña de Dinámicas** centraliza todas las actividades colaborativas (encuestas, retrospectivas, brainstormings, etc.) del canal seleccionado, facilitando el seguimiento y la generación de documentos.

### Acceder a la Pestaña

1. Ve a tu proyecto → Canales
2. Selecciona un canal
3. Haz clic en la pestaña **"Dinámicas"** (junto a "Chat" y "Archivos")

### Vista de Dinámicas

La pestaña muestra todas las dinámicas del canal con:

**Información mostrada por cada dinámica:**
- 🎯 **Tipo**: Icono y nombre del tipo de dinámica (Encuesta, Retrospectiva, etc.)
- 📝 **Título/Pregunta**: El título o pregunta principal
- 👤 **Creador**: Quién inició la dinámica
- 📅 **Fecha**: Cuándo se creó
- 🔓/🔒 **Estado**: Abierta o Cerrada

**Acciones disponibles:**
- 👁️ **Ver en chat**: Navega directamente al mensaje en el chat
- ⬇️ **Exportar individual**: Genera un documento de la dinámica seleccionada

### Tipos de Dinámicas Soportados

La pestaña reconoce y muestra correctamente más de **60 tipos de dinámicas**:

#### 📊 Votaciones
- Encuesta (`/poll`)
- Dot Voting (`/dot-voting`)
- Votación Ciega (`/blind-vote`)
- NPS (`/nps`)
- Voto de Confianza (`/confidence-vote`)
- Puño de Cinco (`/fist-of-five`)
- Votación Romana (`/roman-voting`)
- Ranking (`/ranking`)

#### 🔄 Retrospectivas
- Retrospectiva (`/retrospective`)
- Rosa-Brote-Espina (`/rose-bud-thorn`)
- Sailboat (`/sailboat`)
- Start-Stop-Continue (`/start-stop-continue`)
- 4Ls (`/4ls`)
- Starfish (`/starfish`)
- Mad Sad Glad (`/mad-sad-glad`)
- Hot Air Balloon (`/hot-air-balloon`)
- KALM (`/kalm`)
- Pre-Mortem (`/pre-mortem`)

#### 💡 Ideación
- Lluvia de Ideas (`/brainstorm`)
- Mapa Mental (`/mind-map`)
- Crazy 8s (`/crazy-8s`)
- Mapa de Afinidad (`/affinity-map`)
- Brainwriting (`/brainwriting`)
- Lotus Blossom (`/lotus-blossom`)
- SCAMPER (`/scamper`)
- Starbursting (`/starbursting`)
- Brainstorm Inverso (`/reverse-brainstorm`)
- Peor Idea (`/worst-idea`)
- How Might We (`/how-might-we`)

#### 📊 Análisis
- SWOT (`/swot`)
- SOAR (`/soar`)
- Sombreros de Bono (`/six-hats`)
- Matriz de Decisión (`/decision-matrix`)
- Pros y Contras (`/pros-cons`)
- 5 Porqués (`/five-whys`)
- Diagrama Ishikawa (`/fishbone`)
- Impacto vs Esfuerzo (`/impact-effort`)
- Matriz de Riesgos (`/risk-matrix`)
- Assumption Mapping (`/assumption-mapping`)

#### 🎯 Priorización
- RICE Scoring (`/rice`)
- MoSCoW (`/moscow`)
- Planning Poker (`/estimation-poker`)
- Opportunity Tree (`/opportunity-tree`)

#### 👥 Equipos
- Salud del Equipo (`/team-health`)
- Estado de Ánimo (`/mood`)
- Persona (`/persona`)
- Mapa de Empatía (`/empathy-map`)
- Team Canvas (`/team-canvas`)
- Matriz RACI (`/raci`)
- Delegation Poker (`/delegation-poker`)
- Moving Motivators (`/moving-motivators`)

#### 🗺️ Frameworks
- Lean Canvas (`/lean-canvas`)
- Customer Journey (`/customer-journey`)
- User Story Mapping (`/user-story-mapping`)
- Inception Deck (`/inception-deck`)
- Lean Coffee (`/lean-coffee`)
- Working Agreements (`/working-agreements`)

#### 📋 Gestión
- Acciones (`/action-items`)
- Checklist (`/checklist`)
- Agenda (`/agenda`)
- Parking Lot (`/parking-lot`)
- Standup (`/standup`)
- Muro de Kudos (`/kudos-wall`)

### Generación de Documentos con IA

Una de las funcionalidades más potentes es la **generación de documentos DOCX** a partir de las dinámicas seleccionadas.

#### Cómo Generar un Documento

1. Haz clic en el botón **"✨ Generar Documento"** en la pestaña de Dinámicas
2. Se abre un modal con las siguientes opciones:

**Configuración del documento:**
- 📝 **Título del documento** (opcional): Nombre para el documento generado
- ✅ **Selección de dinámicas**: Marca las dinámicas que quieres incluir
- 🔘 **Seleccionar todo/Deseleccionar todo**: Selección rápida
- 💬 **Contexto adicional** (opcional): Instrucciones para la IA sobre cómo generar el documento

3. Haz clic en **"Generar DOCX"**
4. La IA procesa las dinámicas seleccionadas y genera un documento Word profesional
5. El archivo se descarga automáticamente

#### Características del Documento Generado

**Estructura automática:**
- 📄 Portada con título y fecha
- 📑 Índice de contenidos
- 📊 Secciones por cada dinámica incluida
- 📈 Análisis de resultados
- 💡 Insights y conclusiones
- ✅ Acciones recomendadas

**Contenido inteligente:**
- La IA analiza los datos de cada dinámica
- Identifica patrones y tendencias
- Genera resúmenes ejecutivos
- Propone próximos pasos basados en los resultados

**Formato profesional:**
- Diseño limpio y corporativo
- Tablas formateadas
- Listas estructuradas
- Compatible con Microsoft Word y Google Docs

#### Casos de Uso

**Documentación de retrospectivas:**
```
1. Ejecuta /sailboat "Sprint 15" durante la retro
2. El equipo agrega items a cada sección
3. Al finalizar, ve a Dinámicas
4. Genera documento con contexto: "Retrospectiva del equipo Backend, sprint 15, enfocarse en acciones de mejora"
5. Obtén un reporte profesional listo para compartir
```

**Resumen de sesión de ideación:**
```
1. Ejecuta /brainstorm "Nuevas features Q1"
2. El equipo contribuye ideas y vota
3. Genera documento con las mejores ideas y plan de acción
```

**Análisis estratégico:**
```
1. Ejecuta /swot "Producto 2025" y /rice "Backlog"
2. Selecciona ambas dinámicas
3. Genera un documento con análisis SWOT + priorización RICE
```

### Mejores Prácticas

**Para facilitadores:**
- 📋 Cierra las dinámicas antes de generar documentos para resultados completos
- 📝 Usa títulos descriptivos en tus dinámicas para mejor organización
- 💬 Proporciona contexto adicional para documentos más relevantes
- 🔍 Revisa el documento generado y ajusta si es necesario

**Para el equipo:**
- 👥 Participen activamente en las dinámicas para datos más ricos
- ✅ Completen todas las secciones de retrospectivas
- 🗳️ Voten en todas las opciones para resultados representativos

---

## Integración con Microsoft Teams

Conecta Microsoft Teams con tus canales para recibir mensajes automáticamente sin servicios externos de pago.

### Arquitectura de la Integración

```
Teams → Outgoing Webhook → Tu App (Bridge Endpoint) → Webhook Interno → Canal
```

La integración usa un **endpoint bridge** que:
- ✅ Recibe mensajes de Teams Outgoing Webhook
- ✅ Valida firmas HMAC (opcional)
- ✅ Limpia menciones XML de Teams
- ✅ Reenvía al webhook interno
- ✅ Responde a Teams con confirmación

### Configuración (3 Pasos)

#### **Paso 1: Crear Webhook en tu App** (2 min)

1. Ve a tu proyecto → Pestaña **"Webhooks"**
2. **"Nuevo Webhook"** → Tipo: **Entrante**
3. Copia el **Secret Token** generado

#### **Paso 2: Configurar Variable de Entorno** (3 min)

En Vercel:
1. **Settings** → **Environment Variables**
2. Agrega:
   - **Name**: `TEAMS_TARGET_WEBHOOK_SECRET`
   - **Value**: [El Secret Token del Paso 1]
   - **Environments**: Production, Preview, Development
3. **Save** y **Redeploy**

#### **Paso 3: Configurar Outgoing Webhook en Teams** (5 min)

1. En Teams → Tu canal → **⋯** → **"Conectores"**
2. Busca **"Outgoing Webhook"** → **"Configurar"**
3. Completa:
   - **Nombre**: `PrioridadesBot`
   - **Callback URL**:
     ```
     https://tu-app.vercel.app/api/webhooks/teams-bridge
     ```
   - **Descripción**: `Bot para enviar mensajes`
4. **"Crear"** y guarda el Security Token (opcional)

### Uso Diario

Para enviar mensajes desde Teams a tu app:

```
@PrioridadesBot Tu mensaje aquí
```

**Ejemplos:**
```
@PrioridadesBot Recordatorio: Reunión a las 3pm
@PrioridadesBot Build #1234 completado exitosamente
@PrioridadesBot ⚠️ Incidente en producción
```

Todos aparecerán como **cards moradas** en el canal configurado.

### Características de la Integración

**Limpieza automática:**
- Teams envía menciones en formato XML: `<at>BotName</at> mensaje`
- El bridge las elimina automáticamente
- Solo el mensaje limpio aparece en tu app

**Metadata rica:**
- Nombre del usuario de Teams como autor
- Nombre del canal de Teams
- Timestamp original
- ID del mensaje de Teams

**Validación HMAC (opcional):**
- Configura `TEAMS_WEBHOOK_SECRET` con el Security Token de Teams
- Valida firma HMAC SHA-256 en cada request
- Mayor seguridad contra solicitudes falsas

**Respuestas a Teams:**
- Bot responde: "✅ Mensaje recibido y publicado"
- Feedback inmediato al usuario de Teams
- Manejo elegante de errores

### Debugging

**Verificar configuración:**
```
https://tu-app.vercel.app/api/webhooks/teams-bridge
```

Debe mostrar:
```json
{
  "status": "ok",
  "configured": {
    "teamsSecret": false,
    "targetSecret": true  ← Debe ser true
  }
}
```

**Logs en Vercel:**
- Deployments → Functions
- Busca errores de `teams-bridge`

**Problemas comunes:**
- ❌ **No responde el bot**: Verifica que escribiste `@PrioridadesBot` exacto
- ❌ **Error 500**: Variable `TEAMS_TARGET_WEBHOOK_SECRET` no configurada
- ❌ **No llega el mensaje**: Verifica redeploy después de agregar variable

### Ventajas vs Power Automate

| Power Automate | Solución Bridge |
|----------------|-----------------|
| Requiere licencia Premium | ✅ Gratis, sin costo |
| Límites mensuales (100-1000 ops) | ✅ Sin límites |
| Depende de servicio externo | ✅ Tu propia infraestructura |
| Puede tener latencia | ✅ Rápido (<1s) |
| Configuración visual compleja | ✅ 3 pasos simples |

### Documentación Completa

Ver: `docs/TEAMS_INTEGRATION.md` para guía paso a paso detallada.

---

## Notificaciones

### Tipos de Notificaciones

#### 1. Menciones (@usuario)

Cuando alguien te menciona:
- **Email**: Recibes correo con el mensaje completo
- **In-app**: Notificación en el ícono de campana
- **Push**: Notificación del navegador (si está activada)
- **Contenido**: Nombre de quien mencionó, mensaje, proyecto

#### 2. Respuestas en Threads

Cuando responden a tu mensaje:
- **Email**: Notificación de nueva respuesta
- **In-app**: Badge en notificaciones
- **Push**: Alerta instantánea con preview del mensaje
- **Contenido**: Nombre del respondedor, respuesta, enlace al thread

#### 3. Menciones de Grupo (@grupo)

Cuando mencionan a un grupo del que eres miembro:
- **Email**: Correo a todos los miembros
- **Push**: Notificación a todos los miembros del grupo
- **Contenido**: "X mencionó a @grupo" con preview del mensaje

#### 4. Preguntas (/question)

Cuando alguien te hace una pregunta:
- **Email**: Correo con la pregunta completa
- **In-app**: Notificación destacada
- **Acción**: Botón para responder directamente

### Push Notifications del Navegador

El sistema soporta **notificaciones push nativas del navegador** que funcionan incluso cuando la aplicación no está abierta.

#### Activar Push Notifications

1. Ve a **Mi Perfil** (`/profile`)
2. Busca la sección **"Notificaciones Push del Navegador"**
3. Activa el toggle
4. Acepta el permiso del navegador cuando lo solicite

#### Eventos que Envían Push

| Evento | Título | Ejemplo |
|--------|--------|---------|
| Mención en canal | 🔔 Juan te mencionó | "En Proyecto X: @Pedro revisa esto..." |
| Respuesta a mensaje | 💬 María respondió tu mensaje | "Sí, de acuerdo con lo que dices..." |
| Mención de grupo | 🔔 Carlos mencionó a @desarrollo | "Equipo, necesitamos revisar..." |
| Comentario en prioridad | 💬 Nuevo comentario de Ana | "En 'Implementar login': Listo..." |
| Mención en comentario | 🔔 Luis te mencionó | "En 'Bug crítico': @Admin urgente..." |

#### Características

- **Funcionan offline**: Recibes notificaciones aunque el navegador esté cerrado
- **Click para navegar**: Al hacer clic vas directo al mensaje/prioridad
- **Deduplicación**: El tag único evita notificaciones duplicadas
- **requireInteraction**: Las menciones requieren acción del usuario (no se cierran solas)

#### Compatibilidad

- ✅ Chrome (desktop y Android)
- ✅ Firefox
- ✅ Edge
- ✅ Safari (macOS Ventura+, iOS 16.4+)
- ❌ Safari iOS < 16.4

#### Troubleshooting

**"Tu navegador no soporta notificaciones push"**
- Verifica que estés usando un navegador compatible
- En iOS, necesitas Safari 16.4+ y agregar la app a la pantalla de inicio

**"Las notificaciones están bloqueadas"**
- Haz clic en el candado de la barra de direcciones
- Busca "Notificaciones" y cambia a "Permitir"
- Recarga la página

**No llegan las notificaciones**
- Verifica que el toggle esté activado en `/profile`
- Revisa que no tengas el modo "No molestar" del sistema operativo activado
- En Windows, revisa Centro de Actividades → Configuración de notificaciones

### Configuración de Notificaciones

Los usuarios pueden configurar:
- **Email**: Frecuencia de emails (inmediato, resumen diario, desactivado)
- **Push**: Activar/desactivar notificaciones del navegador
- Tipos de notificaciones a recibir
- Horarios de no molestar

**Ubicación:** Perfil de usuario → Preferencias de notificaciones (`/profile`)

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

## Pizarra Colaborativa

La **Pizarra Colaborativa** es un canvas interactivo estilo Miro/Mural que permite a los equipos dibujar, crear diagramas y colaborar visualmente en tiempo real. Utiliza **Excalidraw** como motor de dibujo.

### Acceso a la Pizarra

Hay dos formas de acceder a las pizarras:

#### 1. Slash Command en Chat

Escribe `/whiteboard "Título de la pizarra"` en el chat para crear una pizarra vinculada al mensaje:

```
/whiteboard "Arquitectura del Sistema"
/whiteboard "Diagrama de Flujo - Login"
/whiteboard "Ideas para MVP"
```

El widget mostrará:
- 🖼️ Título de la pizarra
- 👤 Creador
- 🔗 Botón para abrir en nueva pestaña

#### 2. Pestaña de Pizarras

1. Ve a tu proyecto → Canales
2. Selecciona un canal
3. Haz clic en la pestaña **"Pizarras"** (ícono de lápiz)

**Vista de la pestaña:**
- 📋 Grid de pizarras existentes
- ➕ Botón "Nueva Pizarra" para crear
- 🔍 Búsqueda por título
- 🗑️ Eliminar (solo creador/admin)

### Herramientas del Canvas

Excalidraw proporciona un conjunto completo de herramientas de dibujo:

#### Formas Básicas
- 📦 **Rectángulo** - cajas y contenedores
- ⭕ **Elipse** - círculos y óvalos
- 💎 **Diamante** - decisiones en diagramas de flujo
- ➡️ **Flecha** - conectores direccionales
- ➖ **Línea** - conexiones simples

#### Texto y Anotaciones
- 📝 **Texto** - etiquetas y descripciones
- ✏️ **Lápiz** - dibujo a mano alzada

#### Opciones de Estilo
- 🎨 **Colores** - paleta de colores para relleno y trazo
- 📏 **Grosor** - líneas finas a gruesas
- 🔲 **Relleno** - sólido, rayado, punteado
- ↔️ **Puntas de flecha** - varios estilos

#### Acciones
- ↩️ **Deshacer/Rehacer**
- 📋 **Copiar/Pegar**
- 🗑️ **Eliminar**
- 🔒 **Bloquear elementos**
- 📤 **Exportar** - PNG, SVG, archivo

### Colaboración en Tiempo Real

La pizarra soporta **colaboración en tiempo real** mediante Pusher:

**Características:**
- ⚡ **Sincronización instantánea** - los cambios aparecen para todos en < 100ms
- 👥 **Indicador de usuarios** - ve cuántas personas están editando
- 💾 **Auto-guardado** - cambios se guardan automáticamente cada 500ms
- ✅ **Indicador de estado** - "Guardando...", "Guardado", "Error"

**Control de concurrencia:**
- 🔢 **Versionado optimista** - cada cambio incrementa la versión
- 🔄 **Resolución de conflictos** - si hay conflicto, se sincroniza automáticamente
- 🚫 **Sin pérdida de datos** - las actualizaciones remotas se fusionan correctamente

### Modelo de Datos

```typescript
interface Whiteboard {
  _id: ObjectId;
  title: string;
  projectId: ObjectId;
  channelId: ObjectId;
  messageId?: ObjectId;        // Si fue creada desde chat
  elements: ExcalidrawElement[]; // Elementos del canvas
  appState: {
    viewBackgroundColor: string;
    currentItemFontFamily: number;
    zoom: { value: number };
    scrollX: number;
    scrollY: number;
  };
  files: { [key: string]: BinaryFile }; // Imágenes en base64
  version: number;             // Para control de concurrencia
  createdBy: ObjectId;
  collaborators: ObjectId[];   // Usuarios que han editado
  createdAt: Date;
  updatedAt: Date;
}
```

### API Endpoints

#### Gestión de Pizarras

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/projects/[id]/whiteboards` | Listar pizarras del proyecto |
| `POST` | `/api/projects/[id]/whiteboards` | Crear nueva pizarra |
| `GET` | `/api/projects/[id]/whiteboards/[whiteboardId]` | Obtener pizarra |
| `PUT` | `/api/projects/[id]/whiteboards/[whiteboardId]` | Actualizar metadatos |
| `DELETE` | `/api/projects/[id]/whiteboards/[whiteboardId]` | Eliminar pizarra |

#### Sincronización de Elementos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `PUT` | `/api/projects/[id]/whiteboards/[whiteboardId]/elements` | Sincronizar elementos (dispara Pusher) |

#### Acceso Directo

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/whiteboards/[id]` | Obtener pizarra sin projectId |

#### Creación desde Chat

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/projects/[id]/messages/[messageId]/whiteboard` | Crear pizarra vinculada a mensaje |

### Página Full-Screen

Cada pizarra tiene una página dedicada en `/whiteboard/[id]` con:

**Header:**
- ⬅️ Botón volver
- 📝 Título de la pizarra
- 👤 Creador
- 👥 Contador de usuarios en línea
- 💾 Indicador de guardado
- 🔗 Abrir en nueva pestaña

**Canvas:**
- 🖼️ Área completa de dibujo (100% viewport)
- 🛠️ Barra de herramientas de Excalidraw
- 🌍 Idioma en español (es-ES)

### Eventos Pusher

La pizarra usa el canal `presence-whiteboard-{whiteboardId}`:

```typescript
// Eventos
channel.bind('elements-updated', (data) => {
  // data: { elements, appState, version, updatedBy }
});

channel.bind('pusher:subscription_succeeded', (members) => {
  // Lista de miembros conectados
});

channel.bind('pusher:member_added', (member) => {
  // Nuevo usuario conectado
});

channel.bind('pusher:member_removed', (member) => {
  // Usuario desconectado
});
```

### Integración con el Sistema

#### Relación con Canales
- Cada pizarra pertenece a un canal específico
- Se lista en la pestaña "Pizarras" del canal
- Puede crearse desde el chat con `/whiteboard`

#### Relación con Mensajes
- Las pizarras creadas con slash command se vinculan al mensaje
- El widget muestra un preview en el chat
- Click en "Abrir Pizarra" navega al editor full-screen

#### Permisos
- **Crear:** Cualquier miembro del proyecto
- **Editar:** Cualquier miembro del proyecto (colaboración abierta)
- **Eliminar:** Solo el creador o administradores

---

## Limitaciones y Consideraciones

### Límites Técnicos

- **Mensajes anclados:** Máximo 5 por canal
- **Canales jerárquicos:** Máximo 2 niveles de profundidad
- **Reacciones:** Sin límite, pero solo 4 emojis de acceso rápido
- **Exportación:** Limitada por memoria del servidor (miles de registros OK)
- **Pusher free tier:** 100 conexiones concurrentes, 200K mensajes/día

### Rendimiento

- **Carga inicial:** 50 mensajes más recientes
- **Scroll infinito:** ✅ Implementado con cursor-based pagination
- **Lazy loading:** Carga automática de mensajes antiguos al scrollear
- **Tiempo real:** ✅ WebSockets con Pusher (latencia < 100ms)
- **Typing indicators:** ✅ Actualización en tiempo real
- **Presencia:** ✅ Tracking de usuarios en línea
- **Cache:** Caché de conexión Pusher en cliente

### Seguridad

- **Autenticación:** Requerida para acceder al canal
- **Autorización:** Solo miembros del proyecto pueden ver mensajes
- **Edición/Eliminación:** Solo propietarios o admins
- **Inyección:** Prevención automática de XSS en contenido

---

## Roadmap Futuro

### Features Planeadas

- [x] ✅ WebSockets para mensajes en tiempo real
- [x] ✅ Canales y subcanales jerárquicos
- [x] ✅ Markdown y formato de texto enriquecido
- [x] ✅ Link previews automáticas
- [x] ✅ Webhooks entrantes y salientes
- [x] ✅ Integración con Microsoft Teams
- [x] ✅ Archivos adjuntos con Cloudflare R2
- [x] ✅ Pizarra colaborativa con Excalidraw
- [ ] Grabaciones de voz
- [ ] Videollamadas integradas
- [ ] Integración con Slack
- [ ] Mensajes programados
- [ ] Traducción automática
- [ ] Transcripciones de reuniones
- [ ] Búsqueda semántica con IA

### Mejoras Planeadas

- [x] ✅ Scroll infinito para mensajes antiguos
- [x] ✅ Indicadores de "escribiendo..."
- [x] ✅ Estado en línea/fuera de línea
- [x] ✅ Mención de equipos/grupos de usuarios
- [x] ✅ Hilos anidados (threads de threads)
- [ ] Reacciones personalizadas
- [ ] Temas y personalización
- [ ] Notificaciones push en navegador

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
**Versión:** 2.0.0
**Última actualización:** Noviembre 2025
**Licencia:** Propietaria

---

## Changelog

### v2.0.2 (Noviembre 2025) - Control de Velocidad de Reproducción

#### Mensajes de Voz
- ✅ **Control de velocidad** - Nueva función para acelerar o ralentizar la reproducción de mensajes de voz
  - Velocidades disponibles: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
  - Botón intuitivo que muestra la velocidad actual
  - Clic para ciclar entre velocidades
  - Ideal para escuchar mensajes largos más rápido o para entender mejor mensajes complejos

### v2.0.1 (Noviembre 2025) - Almacenamiento R2 para Mensajes de Voz

#### Migración a Cloudflare R2
- ✅ **Almacenamiento en R2** - Los archivos de audio ahora se guardan en Cloudflare R2 en lugar de MongoDB
  - Mejor rendimiento al no almacenar datos binarios grandes en MongoDB
  - URLs firmadas con expiración automática (1 hora)
  - Escalabilidad mejorada para archivos multimedia

- ✅ **Nueva API de voice-upload**
  - `POST /api/projects/{id}/voice-upload` - Sube audio a R2
  - `GET /api/projects/{id}/voice-upload?r2Key=xxx` - Obtiene URL firmada

- ✅ **Transcripciones persistentes**
  - Las transcripciones se guardan en MongoDB
  - Se muestran automáticamente en futuras visitas
  - API de transcripción ahora descarga de R2

- ✅ **Limpieza automática**
  - Al eliminar un mensaje de voz, se borra el archivo de R2
  - Se limpian los metadatos de MongoDB

### v2.0.0 (Noviembre 2025) - Pizarra Colaborativa

#### Pizarra Colaborativa (Whiteboard)
- ✅ **Canvas interactivo** con Excalidraw para dibujo colaborativo estilo Miro/Mural
  - Formas básicas: rectángulo, elipse, diamante, flechas, líneas
  - Dibujo a mano alzada con lápiz
  - Texto y anotaciones
  - Paleta de colores y estilos de relleno

- ✅ **Colaboración en tiempo real**
  - Sincronización instantánea via Pusher (< 100ms)
  - Indicador de usuarios en línea
  - Control de concurrencia con versionado optimista
  - Auto-guardado cada 500ms

- ✅ **Integración completa**
  - Slash command `/whiteboard "título"` en chat
  - Pestaña "Pizarras" dedicada en canales
  - Página full-screen en `/whiteboard/[id]`
  - Widget visual en mensajes del chat

- ✅ **Gestión de pizarras**
  - Crear, editar, eliminar pizarras
  - Búsqueda por título
  - Grid de pizarras existentes
  - Exportar a PNG, SVG, archivo

### v1.8.0 (Noviembre 2025) - Búsqueda Semántica con IA

#### Búsqueda Semántica
- ✅ **Búsqueda por concepto** usando Groq AI (LLaMA 3.3 70B Versatile)
  - Busca por significado, no solo palabras clave
  - Entiende sinónimos y conceptos relacionados
  - Ejemplos: "ideas para reducir latencia" encuentra brainstorms sobre rendimiento

#### Contenido Indexado
- ✅ **60+ tipos de dinámicas** analizables semánticamente:
  - Brainstorms con ideas
  - Five-Whys con causas raíz
  - Matrices de decisión
  - RICE scoring
  - Retrospectivas (SWOT, SOAR, etc.)
  - Risk Matrix
  - Customer Journey
  - Lean Canvas
  - Y muchos más

#### UI
- ✅ **Botón de búsqueda IA** junto a la barra de búsqueda
  - Icono de cerebro con gradiente púrpura
  - Se activa con clic o Enter
  - Indicador de carga durante análisis

- ✅ **Panel de resultados semánticos**
  - Muestra hasta 10 resultados ordenados por relevancia
  - Preview del contenido con tipo y autor
  - Diseño visual distintivo (gradiente púrpura)

#### API
- ✅ **POST /api/projects/[id]/messages/semantic-search**
  - Parámetros: `query`, `channelId?`, `limit?`
  - Extrae contenido de 60+ tipos de comandos
  - Retorna resultados con score de relevancia

---

### v1.7.0 (Noviembre 2025) - Marcadores de Lectura

#### Marcadores de Lectura (Read Markers)
- ✅ **Línea visual "Mensajes nuevos"** para identificar contenido no leído
  - Línea roja con contador de mensajes nuevos
  - Se muestra antes del primer mensaje no leído
  - Diseño responsive para modo claro y oscuro

#### Actualización Automática
- ✅ **Marca como leído al scrollear** al fondo del chat
  - Detecta cuando el usuario llega al final
  - Actualiza el marcador automáticamente
  - Sin necesidad de acciones manuales

#### Modelo de Datos
- ✅ **Nuevo modelo** `ChannelReadMarker`:
  - `channelId` - Canal asociado
  - `userId` - Usuario
  - `lastReadMessageId` - Último mensaje leído
  - `lastReadAt` - Timestamp para comparación eficiente
  - Índice único compuesto (channelId + userId)

#### API
- ✅ **GET /api/projects/[id]/channels/[channelId]/read-marker** - Obtiene marcador y cuenta de no leídos
- ✅ **PUT /api/projects/[id]/channels/[channelId]/read-marker** - Actualiza con mensaje específico
- ✅ **POST /api/projects/[id]/channels/[channelId]/read-marker** - Marca todo como leído

---

### v1.6.0 (Noviembre 2025) - Canales Privados

#### Canales Privados
- ✅ **Soporte para canales privados** con control de acceso por miembros
  - Toggle para marcar canal como privado al crear
  - Búsqueda y selección de miembros con acceso
  - El creador se agrega automáticamente como miembro
  - Icono de candado y badge "Privado" para identificación visual
  - Contador de miembros en la lista de canales

#### Control de Acceso
- ✅ **Filtrado automático** de canales según permisos del usuario
  - Canales públicos visibles para todos
  - Canales privados solo para miembros, creador o admins
  - Admins pueden ver todos los canales del proyecto

#### Modelo de Datos
- ✅ **Nuevos campos** en modelo Channel:
  - `isPrivate: boolean` - indica si el canal es privado
  - `members: ObjectId[]` - lista de usuarios con acceso

#### API
- ✅ **GET /api/projects/[id]/channels** - Filtra por permisos automáticamente
- ✅ **POST /api/projects/[id]/channels** - Acepta `isPrivate` y `members[]`

---

### v1.5.0 (Noviembre 2025) - Pestaña de Dinámicas y 35+ Nuevos Widgets

#### Pestaña de Dinámicas
- ✅ **Nueva pestaña "Dinámicas"** en la vista de canales
  - Centraliza todas las actividades colaborativas del canal
  - Muestra tipo, título, creador, fecha y estado de cada dinámica
  - Acceso rápido para ver la dinámica en el chat
  - Soporte para 60+ tipos de dinámicas

#### Generación de Documentos con IA
- ✅ **Generador de documentos DOCX** desde dinámicas seleccionadas
  - Modal para seleccionar múltiples dinámicas
  - Campo para título personalizado del documento
  - Campo para contexto adicional para la IA
  - Generación automática de documento Word profesional
  - Estructura: portada, índice, secciones, análisis, conclusiones

#### 35+ Nuevos Slash Commands

**Votaciones:**
- `/fist-of-five` - Votación rápida con 5 niveles (puño a mano abierta)
- `/roman-voting` - Votación romana con 👍, 👎 o ✊

**Retrospectivas:**
- `/4ls` - Liked, Learned, Lacked, Longed For
- `/starfish` - Más, Menos, Mantener, Empezar, Dejar
- `/mad-sad-glad` - Emociones del equipo
- `/hot-air-balloon` - 🎈 Fuego (impulso), arena (lastres), tormenta (riesgos), sol (visión)
- `/kalm` - Keep, Add, Less, More
- `/pre-mortem` - Análisis preventivo de riesgos futuros

**Ideación:**
- `/brainwriting` - Brainwriting 6-3-5 colaborativo con rondas
- `/lotus-blossom` - Expansión de ideas en pétalos desde idea central
- `/scamper` - Técnica SCAMPER (Sustituir, Combinar, Adaptar, Modificar, Poner otros usos, Eliminar, Reorganizar)
- `/starbursting` - Generar preguntas sistemáticas (Qué, Quién, Cuándo, Dónde, Por qué, Cómo)
- `/reverse-brainstorm` - Ideas inversas para resolver problemas
- `/worst-idea` - Comenzar con las peores ideas para desbloquear creatividad
- `/how-might-we` - Preguntas "¿Cómo podríamos...?" para design thinking

**Análisis:**
- `/five-whys` - Análisis de causa raíz con 5 niveles de por qué
- `/fishbone` - Diagrama Ishikawa (causa-efecto) con categorías
- `/impact-effort` - Matriz 2x2 de impacto vs esfuerzo
- `/risk-matrix` - Matriz de riesgos con probabilidad x impacto
- `/assumption-mapping` - Mapeo de supuestos con certeza y riesgo

**Priorización:**
- `/rice` - RICE Scoring (Reach, Impact, Confidence, Effort)
- `/moscow` - MoSCoW (Must, Should, Could, Won't)
- `/opportunity-tree` - Árbol de oportunidades con objetivo y soluciones

**Equipos y Personas:**
- `/persona` - Crear persona de usuario completa con demografía, metas, frustraciones
- `/empathy-map` - Mapa de empatía (Dice, Piensa, Hace, Siente)
- `/team-canvas` - Canvas de equipo colaborativo
- `/raci` - Matriz RACI de responsabilidades
- `/delegation-poker` - Niveles de delegación (Management 3.0)
- `/moving-motivators` - Ranking de motivadores del equipo

**Frameworks:**
- `/lean-canvas` - Lean Canvas completo para modelo de negocio
- `/customer-journey` - Mapa del viaje del cliente por etapas
- `/user-story-mapping` - Mapeo de historias de usuario
- `/inception-deck` - 10 preguntas del Inception Deck
- `/lean-coffee` - Formato Lean Coffee con votación y tiempo
- `/working-agreements` - Acuerdos de trabajo del equipo

#### Mejoras en Widgets Existentes
- ✅ **Botón de eliminar** en todos los widgets del chat (aparece al hacer hover)
- ✅ **Props corregidas** en RomanVotingCommand, InceptionDeckCommand, DelegationPokerCommand, MovingMotivatorsCommand
- ✅ **Renderizado corregido** para 21 widgets complejos que no se mostraban

#### Documentación
- ✅ **Sección de Slash Commands reorganizada** por categorías:
  - Votaciones y Encuestas
  - Retrospectivas
  - Ideación y Creatividad
  - Análisis y Estrategia
  - Priorización
  - Equipos y Personas
  - Gestión de Reuniones
  - Planificación y Frameworks
  - Tareas y Seguimiento
- ✅ **Nueva sección "Pestaña de Dinámicas"** con documentación completa

### v1.4.4 (Noviembre 2025) - Fase 3: Comandos de Productividad Avanzada
- ✅ **6 nuevos slash commands de complejidad media-alta** - herramientas avanzadas para planificación y tracking
  - `/pomodoro` - Temporizador pomodoro compartido (25/5 min)
    - Ciclos de trabajo y descanso configurables
    - Control de inicio, pausa y reset
    - Contador de sesiones completadas
    - Sincronización en tiempo real para todos
    - Perfecto para pair/mob programming
  - `/agenda` - Agenda de reunión con tiempos por tema
    - Temas con tiempo asignado y responsable
    - Marcar completados durante la reunión
    - Cálculo automático de tiempo total
    - Mantiene reuniones enfocadas y eficientes
  - `/capacity` - Capacidad disponible del equipo
    - Miembros con horas disponibles por día
    - Cálculos automáticos: horas/día, horas/semana, días/semana
    - Ideal para sprint planning y resource planning
  - `/dependency-map` - Visualización de dependencias entre tareas
    - Tareas con dependencias entre ellas
    - Lógica de bloqueo automática
    - Indicadores visuales de tareas bloqueadas
    - No se puede completar hasta resolver dependencias
  - `/okr` - Definir y trackear OKRs
    - Objetivos con múltiples key results
    - Progress tracking con sliders (0-100%)
    - Promedio de progreso por objetivo
    - Sistema completo de OKRs
  - `/roadmap` - Timeline visual con milestones
    - Milestones con fecha y status
    - Ordenamiento cronológico automático
    - Visual timeline con puntos de colores
    - Estados: pending, in-progress, completed
- ✅ **Componentes especializados** - PomodoroCommand, AgendaCommand, CapacityCommand, DependencyMapCommand, OKRCommand, RoadmapCommand
- ✅ **API endpoints completos** - 6 nuevos routes con operaciones CRUD
- ✅ **Features avanzados** - timers client-side, blocking logic, progress tracking, date sorting
- ✅ **Integración completa** en ChannelChat.tsx con handlers y rendering

### v1.4.3 (Noviembre 2025) - Fase 2: Comandos de Alta Prioridad
- ✅ **3 nuevos slash commands de alta prioridad** - herramientas para gestión y health del equipo
  - `/action-items` - Lista de acciones con responsable y fecha límite
    - Descripción, responsable y fecha por cada acción
    - Toggle completado/pendiente con un clic
    - Indicadores de items vencidos (borde rojo)
    - Contador de completados vs total
    - Fecha de completación automática
    - Solo creador del item puede eliminarlo
  - `/team-health` - Spotify Health Check Model con 9 áreas
    - 9 áreas predefinidas del modelo oficial Spotify
    - Votación 1-5 con emojis (😞 Bad → 😀 Awesome)
    - Promedios y distribución visual por área
    - Votos actualizables antes de cerrar
    - Perfecto para retrospectivas quarterly
  - `/confidence-vote` - Votación de nivel de confianza (1-5)
    - Escala de confianza con emojis y colores
    - Promedio visible con emoji representativo
    - Gráfico de distribución de votos
    - Lista de votantes con su nivel
    - Guía de interpretación de resultados
- ✅ **Componentes especializados** - ActionItemsCommand, TeamHealthCommand, ConfidenceVoteCommand
- ✅ **API endpoints** - action-items, team-health, confidence-vote con validaciones
- ✅ **Features avanzados** - toggle completado, actualizar votos, tracking de vencimientos

### v1.4.2 (Noviembre 2025) - Fase 1: Comandos de Colaboración
- ✅ **3 nuevos slash commands de colaboración** - herramientas simples y prácticas para equipos
  - `/parking-lot` - Temas para discutir después durante reuniones
    - Lista colaborativa de temas pendientes
    - Cada item muestra el nombre del autor
    - Solo el autor puede eliminar su item
    - Ideal para no desviarse del tema principal
  - `/kudos-wall` - Muro de reconocimientos acumulados
    - Enviar kudos públicos a compañeros
    - Especificar destinatario y mensaje
    - Fomentar cultura de apreciación
    - Perfecto para retrospectivas positivas
  - `/icebreaker` - Pregunta aleatoria para romper el hielo
    - 15 preguntas rotativas diferentes
    - Temas personales ligeros y reflexiones
    - Sin parámetros necesarios
    - Para crear ambiente relajado al inicio de reuniones
- ✅ **Componentes especializados** - ParkingLotCommand, KudosWallCommand, IcebreakerCommand
- ✅ **API endpoints** - parking-lot y kudos-wall con validaciones y permisos
- ✅ **Permisos granulares** - solo creador puede cerrar, solo autor puede eliminar items

### v1.4.1 (Noviembre 2025)
- ✅ **Comando /soar** - Análisis SOAR colaborativo orientado al futuro
  - Framework positivo alternativo a SWOT
  - 4 secciones: Strengths, Opportunities, Aspirations, Results
  - Enfocado en motivación y visión futura
  - Útil para planificación estratégica positiva y sesiones de visión

### v1.4 (Noviembre 2025)
- ✅ **12 nuevos slash commands colaborativos** - herramientas avanzadas para facilitación de equipos
  - `/dot-voting` - Votación con N puntos para distribuir, priorización democrática
  - `/blind-vote` - Votos ocultos hasta que todos voten, evita sesgo de grupo
  - `/decision-matrix` - Matriz criterios vs opciones con puntajes colaborativos
  - `/nps` - Net Promoter Score rápido (escala 0-10) para medir satisfacción
  - `/rose-bud-thorn` - Retrospectiva con 🌹 Positivo, 🌱 Potencial, 🌵 Problemas
  - `/sailboat` - Retrospectiva visual con ⛵ Viento, ⚓ Ancla, 🪨 Rocas, 🏝️ Isla
  - `/start-stop-continue` - Retrospectiva simple: qué empezar, parar, continuar
  - `/swot` - Análisis SWOT colaborativo (Fortalezas, Debilidades, Oportunidades, Amenazas)
  - `/six-hats` - Análisis con los 6 sombreros del pensamiento de Edward de Bono
  - `/mind-map` - Mapa mental gráfico colaborativo con ReactFlow, nodos jerárquicos interactivos
  - `/crazy-8s` - 8 ideas en 8 minutos basado en Design Sprint de Google
  - `/affinity-map` - Agrupar y organizar ideas por categorías
- ✅ **MindMapCommand component** - visualización gráfica con ReactFlow
  - Layout automático por niveles jerárquicos
  - Nodos raíz destacados en azul
  - Edges animados conectando padres e hijos
  - Controles de pan/zoom integrados
  - Botones + y - para agregar/eliminar nodos
  - Eliminación recursiva de nodos hijos
- ✅ **DecisionMatrixCommand component** - matriz interactiva para decisiones complejas
  - Puntuación 1-5 por criterio y opción
  - Promediado automático de votos
  - Identificación de opción ganadora con 🏆
  - Entrada de opciones mediante prompt
- ✅ **RetroCommand component reutilizable** - maneja 7 formatos de retrospectiva
  - Secciones personalizables con íconos y colores
  - Grid responsivo adaptado al número de secciones
  - Sistema de agregar/eliminar items por sección
- ✅ **Componentes especializados** - DotVotingCommand, BlindVoteCommand, NPSCommand
- ✅ **API endpoints** para todos los comandos con validaciones y Pusher events
- ✅ **Área de chat ampliada** - altura aumentada de 600px a 800px
- ✅ **Widgets más anchos** - max-width de mensajes de xl (576px) a 5xl (1024px)
- ✅ **Documentación completa** - secciones detalladas en CANALES.md para comandos principales

### v1.3 (Noviembre 2025)
- ✅ **Mensajes de voz** - grabar y enviar audio directamente en el chat
  - Componente VoiceRecorder con visualización de waveform en tiempo real
  - Componente VoicePlayer con controles de reproducción y progreso
  - Límite de 5 minutos por mensaje
  - Soporte para WebM (Opus) y MP4
  - Cancelación de eco, supresión de ruido y ganancia automática
  - Almacenamiento en base64 con datos de waveform
  - **Transcripción con IA** usando Groq Whisper large-v3
  - Botón para copiar transcripción al portapapeles
- ✅ **Archivos adjuntos con Cloudflare R2** - sistema completo de gestión de archivos
  - Subir archivos desde el chat (botón 📎 Paperclip)
  - Pestaña dedicada "Archivos" por proyecto
  - Búsqueda y filtros por tipo (imágenes, documentos, videos, audio)
  - URLs firmadas con expiración de 1 hora
  - Sanitización automática de nombres con acentos
  - Soft delete en DB, hard delete en R2
  - Límite de 50MB por archivo
  - Iconos automáticos según tipo MIME
  - Paginación (20 archivos por página)
- ✅ **AttachmentCard component** - visualización compacta en mensajes
- ✅ **FilesTab component** - gestión completa de archivos del proyecto
- ✅ **Modelo Attachment** en MongoDB con índices optimizados
- ✅ **API endpoints** - upload, list, download URL, delete
- ✅ **Documentación R2** - guía paso a paso en docs/R2_SETUP.md

### v1.2 (Noviembre 2025)
- ✅ **Selector de emojis** - 43 emojis organizados en 4 categorías (Frecuentes, Emociones, Gestos, Símbolos)
- ✅ **Navegación por tabs** en el selector de emojis
- ✅ **Soporte completo de Markdown** - formateo de texto enriquecido
  - Negrita, cursiva, tachado, código inline
  - Bloques de código con syntax highlighting (highlight.js)
  - Listas ordenadas y desordenadas
  - Enlaces, citas, encabezados, tablas
  - Soporte para 40+ lenguajes de programación
- ✅ **Botón de ayuda de Markdown** - modal con guía rápida de sintaxis
- ✅ **Link Previews automáticas** - previews enriquecidas de URLs compartidas
  - Extracción de metadata (Open Graph, Twitter Cards)
  - Caché inteligente de 24 horas
  - Timeout protection (10s)
  - Skeleton loading states
  - Soporte para múltiples URLs en un mensaje
- ✅ **API endpoint** `/api/link-preview` para generación de previews
- ✅ **Compatibilidad entre features** - Markdown coexiste con menciones de usuarios y prioridades

### v1.1 (Noviembre 2025)
- ✅ **WebSockets con Pusher** para comunicación en tiempo real
- ✅ **Mensajes instantáneos** sin recargar la página
- ✅ **Typing indicators** - indicador de quién está escribiendo
- ✅ **Presencia de usuarios** - tracking de usuarios en línea
- ✅ **Scroll infinito** con lazy loading automático
- ✅ **Cursor-based pagination** para performance óptima
- ✅ **Sistema de canales y subcanales** jerárquico (máx 2 niveles)
- ✅ **Selector de canales** con breadcrumbs
- ✅ **Migración automática** de mensajes existentes a canal General
- ✅ **Íconos personalizados** para canales (Lucide React)

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
