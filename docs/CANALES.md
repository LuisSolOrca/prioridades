# Sistema de Canales - Documentación Completa

## Índice
1. [Introducción](#introducción)
2. [Características Principales](#características-principales)
3. [Mensajería](#mensajería)
4. [Tiempo Real y Presencia](#tiempo-real-y-presencia)
5. [Canales y Subcanales](#canales-y-subcanales)
6. [Formato Markdown](#formato-markdown)
7. [Link Previews](#link-previews)
8. [Menciones](#menciones)
9. [Reacciones](#reacciones)
10. [Threads (Hilos)](#threads-hilos)
11. [Mensajes Anclados](#mensajes-anclados)
12. [Búsqueda](#búsqueda)
13. [Slash Commands](#slash-commands)
14. [Notificaciones](#notificaciones)
15. [Gestión de Usuarios Eliminados](#gestión-de-usuarios-eliminados)
16. [Limitaciones y Consideraciones](#limitaciones-y-consideraciones)
17. [Roadmap Futuro](#roadmap-futuro)

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
- 📜 **Scroll infinito** con lazy loading de mensajes antiguos
- 👥 **Menciones de usuarios** con notificaciones
- 📌 **Menciones de prioridades** con previsualizaciones
- 😄 **Reacciones con emojis** - 43 emojis organizados en categorías
- 📝 **Formato Markdown** - negrita, cursiva, código, listas, y más
- 🔗 **Link Previews** - previews automáticas de URLs con metadata
- 🎨 **Syntax highlighting** - código con colores por lenguaje
- 🧵 **Threads/hilos** para conversaciones organizadas
- 📍 **Mensajes anclados** (máximo 5)
- 🔍 **Búsqueda avanzada** por contenido y usuario
- ⚡ **30+ Slash commands** para acciones rápidas
- ✏️ **Edición y eliminación** de mensajes propios
- 🔔 **Notificaciones** por email y en aplicación
- 👻 **Soporte para usuarios eliminados**
- 🗂️ **Sistema de canales y subcanales** jerárquico (máx 2 niveles)

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
- [ ] Adjuntar archivos a mensajes
- [ ] Grabaciones de voz
- [ ] Videollamadas integradas
- [ ] Integración con Slack/Teams
- [ ] Mensajes programados
- [ ] Traducción automática
- [ ] Transcripciones de reuniones
- [ ] Búsqueda semántica con IA

### Mejoras Planeadas

- [x] ✅ Scroll infinito para mensajes antiguos
- [x] ✅ Indicadores de "escribiendo..."
- [x] ✅ Estado en línea/fuera de línea
- [ ] Mención de equipos/grupos
- [ ] Hilos anidados (threads de threads)
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
**Versión:** 1.2
**Última actualización:** Noviembre 2025
**Licencia:** Propietaria

---

## Changelog

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
