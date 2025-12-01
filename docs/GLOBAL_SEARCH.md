# Búsqueda Global

Sistema de búsqueda unificada que permite encontrar información en todo el sistema desde una única interfaz.

## Acceso

- **URL**: `/busquedaglobal`
- **Atajo de teclado**: Disponible desde el Navbar

## Modos de Búsqueda

### 1. Búsqueda por Texto (Atlas Search)

Búsqueda tradicional basada en coincidencia de palabras clave.

**Características:**
- Búsqueda automática mientras escribes (debounce de 300ms)
- Fuzzy matching para tolerar errores tipográficos
- Highlighting de coincidencias
- Requiere mínimo 2 caracteres

**Tecnología:**
- MongoDB Atlas Search con índice `global_search`
- Analyzer `lucene.spanish` para mejor tokenización en español
- Autocomplete para sugerencias

### 2. Búsqueda por Conceptos (Semántica con IA)

Búsqueda inteligente que entiende el significado y contexto de la consulta.

**Características:**
- Entiende sinónimos: "ventas" = "ingresos" = "revenue"
- Comprende contexto empresarial: "pendientes urgentes" → prioridades en riesgo
- Relaciona conceptos: "problemas de rendimiento" → KPIs bajos, prioridades bloqueadas
- Requiere mínimo 3 caracteres
- Se activa con botón "Buscar" o tecla Enter (no automático)

**Ejemplos de consultas semánticas:**
- "deals próximos a cerrar" → Encuentra deals en etapas finales
- "clientes de tecnología" → Clientes de industria tech
- "tareas atrasadas" → Prioridades vencidas o en riesgo
- "comunicación con Acme Corp" → Mensajes, actividades relacionadas

**Tecnología:**
- API de Groq con modelo `llama-3.3-70b-versatile`
- Temperatura baja (0.1) para respuestas consistentes
- Límite de 50 items de contexto para optimizar tokens

## Entidades Buscables

| Entidad | Campos Buscados | URL Resultado |
|---------|-----------------|---------------|
| Prioridades | título, descripción | `/priorities/{id}` |
| Contactos | nombre, apellido, email, teléfono, posición | `/crm/contacts/{id}` |
| Deals | título, descripción | `/crm/deals/{id}` |
| Clientes | nombre, descripción, industria, notas CRM | `/crm/clients/{id}` |
| Proyectos | nombre, descripción, propósito | `/projects/{id}` |
| Usuarios | nombre, email, área | `/admin/users/{id}` |
| Mensajes de Canal | contenido, transcripción de voz | `/channels/{channelId}` |
| Comentarios | texto | `/priorities/{priorityId}` |
| KPIs | nombre, descripción, objetivo estratégico | `/admin/kpis/{id}` |
| Productos | nombre, descripción, SKU, categoría | `/crm/products/{id}` |
| Plantillas Email | nombre, descripción, asunto, cuerpo | `/crm/email-templates/{id}/edit` |
| Canales | nombre, descripción | `/channels/{id}` |
| Actividades | título, descripción, resultado | `/crm/activities` |
| Cotizaciones | título | `/crm/quotes/{id}` |
| Hitos | título, descripción | `/milestones` |
| Formularios Web | nombre, título, descripción | `/crm/web-forms/{id}` |
| Workflows | nombre, descripción | `/admin/workflows` |
| Workflows CRM | nombre, descripción | `/crm/workflows/{id}` |
| Iniciativas | nombre, descripción | `/admin/initiatives/{id}` |
| Pipelines | nombre, descripción | `/crm/pipelines/{id}` |
| Competidores | nombre, descripción, sitio web | `/crm/competitors/{id}` |
| Secuencias Email | nombre, descripción | `/crm/sequences/{id}` |
| Insignias | nombre, descripción | `/admin/badges` |
| Campos Personalizados | nombre, etiqueta | `/crm/custom-fields` |

## Filtros

### Filtros Rápidos (Principales)
- Prioridades
- Contactos
- Deals
- Clientes
- Proyectos
- Usuarios
- Mensajes
- Productos
- KPIs

### Filtros Adicionales
Expandibles con botón "Más..." para acceder a todas las entidades.

### Opciones de Búsqueda
- **Principales**: Busca solo en entidades de alta prioridad
- **Todos**: Busca en todas las 25 entidades

## API Endpoints

### Búsqueda por Texto
```
GET /api/global-search?q={query}&types={types}&limit={limit}&fuzzy={boolean}&all={boolean}
```

**Parámetros:**
- `q` (requerido): Término de búsqueda (mínimo 2 caracteres)
- `types` (opcional): Tipos separados por coma (ej: "contact,deal,client")
- `limit` (opcional): Límite total de resultados (default: 20, max: 50)
- `fuzzy` (opcional): Activar fuzzy matching (default: true)
- `all` (opcional): Buscar en todos los tipos (default: false)

**Respuesta:**
```json
{
  "results": [
    {
      "type": "contact",
      "id": "...",
      "title": "Juan Pérez",
      "subtitle": "Director de Ventas • juan@empresa.com",
      "url": "/crm/contacts/...",
      "icon": "User",
      "highlights": ["<mark>Juan</mark> Pérez"],
      "score": 95.5,
      "metadata": {
        "createdAt": "...",
        "status": "active"
      }
    }
  ],
  "counts": {
    "contact": 5,
    "deal": 3
  },
  "total": 8
}
```

### Búsqueda Semántica
```
POST /api/global-search/semantic
Content-Type: application/json

{
  "query": "deals importantes próximos a cerrar",
  "types": ["deal", "client"],  // opcional
  "limit": 15                    // opcional, default: 15
}
```

**Respuesta:**
```json
{
  "results": [...],
  "counts": {...},
  "total": 10,
  "query": "deals importantes próximos a cerrar",
  "searchedItems": 50,
  "aiModel": "llama-3.3-70b-versatile",
  "mode": "semantic"
}
```

## Índices de Atlas Search

Se requiere crear índices `global_search` en cada colección. Ejecutar:

```bash
npx tsx scripts/setup-atlas-search-indexes.ts
```

Este script crea automáticamente los 25 índices necesarios con la configuración:
- Analyzer: `lucene.spanish` para campos de texto
- Autocomplete habilitado
- Campos dinámicos deshabilitados (solo indexa campos especificados)

## Configuración

### Variables de Entorno

```env
# Para búsqueda semántica
GROQ_API_KEY=your-groq-api-key

# MongoDB (para Atlas Search)
MONGODB_URI=mongodb+srv://...
```

### Límites

| Parámetro | Búsqueda Texto | Búsqueda Semántica |
|-----------|----------------|---------------------|
| Min caracteres | 2 | 3 |
| Max resultados | 50 | 15 |
| Items por tipo | 10 | 15 |
| Total contexto | N/A | 50 items |
| Chars por item | N/A | 150 |

## Búsquedas Recientes

- Se guardan en `localStorage` bajo la clave `recentSearches`
- Máximo 10 búsquedas guardadas
- Se muestran como chips clickeables en el estado inicial
- Persisten entre sesiones del navegador

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend                              │
│  /busquedaglobal/page.tsx                               │
│  ┌─────────────┐  ┌─────────────┐                       │
│  │ Modo Texto  │  │ Modo IA     │                       │
│  │ (auto)      │  │ (manual)    │                       │
│  └──────┬──────┘  └──────┬──────┘                       │
└─────────┼────────────────┼──────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────┐  ┌─────────────────┐
│ GET             │  │ POST            │
│ /api/global-    │  │ /api/global-    │
│ search          │  │ search/semantic │
└────────┬────────┘  └────────┬────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│ MongoDB Atlas   │  │ Groq API        │
│ Search          │  │ llama-3.3-70b   │
│ ($search)       │  │                 │
└─────────────────┘  └─────────────────┘
```

## Troubleshooting

### "Error al comunicarse con la IA"
- Verificar que `GROQ_API_KEY` esté configurada
- Revisar logs del servidor para mensaje de error específico
- La API de Groq puede tener límites de rate

### Resultados vacíos en Atlas Search
- Verificar que los índices estén creados: `npx tsx scripts/setup-atlas-search-indexes.ts`
- Los índices pueden tardar unos minutos en estar activos
- Revisar que la colección tenga datos

### Búsqueda lenta
- Atlas Search tiene fallback a regex si el índice no existe
- Regex es significativamente más lento en colecciones grandes
- Verificar estado de índices en MongoDB Atlas Console

## Mejoras Futuras

- [ ] Búsqueda por voz
- [ ] Filtros por fecha
- [ ] Exportar resultados
- [ ] Búsqueda en archivos adjuntos
- [ ] Historial de búsquedas en servidor (por usuario)
- [ ] Sugerencias de autocompletado semántico
