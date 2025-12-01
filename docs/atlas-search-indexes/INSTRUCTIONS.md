# MongoDB Atlas Search - Instrucciones de Configuración

## Descripción

Este directorio contiene las definiciones de índices para MongoDB Atlas Search,
que habilita la búsqueda global en la aplicación con capacidades similares a Elasticsearch:

- **Búsqueda full-text** con analyzer español
- **Fuzzy matching** para tolerancia a errores tipográficos
- **Highlighting** para resaltar coincidencias
- **Autocomplete** para sugerencias en tiempo real
- **Score boosting** para priorizar resultados relevantes

## Requisitos

- MongoDB Atlas M10 o superior (Atlas Search no está disponible en M0/M2/M5)
- Acceso al Atlas Dashboard o Atlas CLI

## Colecciones a Indexar

- **priorities**: title, description
- **contacts**: firstName, lastName, email, phone, position
- **deals**: title, description
- **clients**: name, description, industry, crmNotes
- **projects**: name, description, purpose
- **users**: name, email, area
- **channelmessages**: content, voiceMessage.transcription
- **comments**: text
- **kpis**: name, description, strategicObjective
- **products**: name, description, sku, category
- **emailtemplates**: name, description, subject, body
- **channels**: name, description
- **activities**: title, description, outcome
- **quotes**: title
- **milestones**: title, description
- **webforms**: name, title, description
- **workflows**: name, description
- **crmworkflows**: name, description
- **strategicinitiatives**: name, description
- **pipelines**: name, description
- **pipelinestages**: name
- **competitors**: name, description, website
- **emailsequences**: name, description
- **badges**: name, description
- **customfields**: name, label

## Opción 1: Crear índices desde Atlas Dashboard (Recomendado)

1. Ir a [MongoDB Atlas](https://cloud.mongodb.com)
2. Seleccionar tu cluster
3. Click en **"Database"** en el menú lateral
4. Ir a la pestaña **"Search"**
5. Click en **"Create Search Index"**
6. Seleccionar **"JSON Editor"** (opción avanzada)
7. Seleccionar la base de datos y colección
8. Pegar el contenido del archivo JSON correspondiente
9. El nombre del índice debe ser: `global_search`
10. Click **"Create Search Index"**
11. Repetir para cada colección

## Opción 2: Usar Atlas CLI

```bash
# Instalar Atlas CLI si no lo tienes
brew install mongodb-atlas-cli

# Autenticarse
atlas auth login

# Crear índice para cada colección
atlas clusters search indexes create \
  --clusterName <TU_CLUSTER> \
  --projectId <TU_PROJECT_ID> \
  --file docs/atlas-search-indexes/priorities.json
```

## Opción 3: Usar Atlas Admin API

```bash
curl -X POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/fts/indexes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {API_KEY}" \
  -d @docs/atlas-search-indexes/priorities.json
```

## Verificar Funcionamiento

Una vez creados los índices, la búsqueda global estará disponible en:
- **URL**: `/busquedaglobal`
- **API**: `GET /api/global-search?q=término`

### Fallback a Regex

Si los índices de Atlas Search no están configurados, la búsqueda automáticamente
usa `$regex` como fallback. Esto funciona pero es menos eficiente y no tiene
fuzzy matching ni highlighting.

## Tiempo de Indexación

- Los índices de Atlas Search tardan unos minutos en construirse
- El estado se puede monitorear en el dashboard de Atlas
- Estado "Active" significa que el índice está listo

## Troubleshooting

### Error: "index not found"
- Verificar que el índice se llame exactamente `global_search`
- Verificar que el índice esté en estado "Active"
- La API automáticamente hace fallback a regex si el índice no existe

### Error: "$search is not allowed"
- Verificar que el cluster sea M10 o superior
- Atlas Search no está disponible en clusters gratuitos (M0)

### Resultados vacíos
- Verificar que los campos indexados tengan datos
- Probar con términos que existan en la base de datos
- Revisar los logs de la API para más detalles

## Colecciones Excluidas

Las siguientes colecciones NO tienen índice de búsqueda (logs, configs, etc.):
- workflowexecutions, crmworkflowexecutions
- notifications
- systemsettings, slackintegrations, leadscoringconfigs
- webformsubmissions, emailtrackings, crmwebhooklogs
- dealproducts, dealcompetitors, sequenceenrollments
- attachments, channellinks, channelreadmarkers
- userstatuses, pushsubscriptions, usergroups
- kpivalues, standups, whiteboards
- azuredevopsconfigs, azuredevopsworkitems, aipromptconfigs
- crmwebhooks, webhooks

## Soporte

Para más información sobre MongoDB Atlas Search:
- [Documentación oficial](https://www.mongodb.com/docs/atlas/atlas-search/)
- [$search aggregation](https://www.mongodb.com/docs/atlas/atlas-search/aggregation-stages/search/)
