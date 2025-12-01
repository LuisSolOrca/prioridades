/**
 * MongoDB Atlas Search - Índices de Búsqueda Global
 *
 * Este script genera las definiciones de índices para MongoDB Atlas Search.
 * Los índices deben crearse manualmente en MongoDB Atlas Dashboard o usando Atlas CLI.
 *
 * INSTRUCCIONES:
 *
 * Opción 1: MongoDB Atlas Dashboard (UI)
 * 1. Ir a MongoDB Atlas: https://cloud.mongodb.com
 * 2. Seleccionar tu cluster
 * 3. Ir a "Database" > "Search" tab
 * 4. Click "Create Search Index"
 * 5. Seleccionar "JSON Editor"
 * 6. Seleccionar la colección
 * 7. Pegar la definición del índice correspondiente
 * 8. Nombrar el índice como "global_search"
 * 9. Click "Create Search Index"
 *
 * Opción 2: Atlas CLI
 * atlas clusters search indexes create --clusterName <cluster> --file index-definition.json
 *
 * Opción 3: Atlas Admin API
 * POST https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/fts/indexes
 *
 * Ejecutar este script para generar los archivos JSON:
 * npx tsx scripts/create-search-indexes.ts
 */

import fs from 'fs';
import path from 'path';
import { SEARCHABLE_ENTITIES, SearchableEntityConfig } from '../lib/atlasSearch';

// Directorio para los archivos de índices
const OUTPUT_DIR = path.join(__dirname, '../docs/atlas-search-indexes');

// Crear directorio si no existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Genera la definición del índice para una colección
 */
function generateIndexDefinition(
  collection: string,
  config: SearchableEntityConfig
): any {
  const fields: Record<string, any> = {};

  for (const field of config.searchFields) {
    if (field === 'email') {
      // Email usa keyword analyzer para búsquedas exactas
      fields[field] = { type: 'string', analyzer: 'lucene.keyword' };
    } else if (field.includes('.')) {
      // Campos anidados (ej: voiceMessage.transcription)
      const [parent, child] = field.split('.');
      if (!fields[parent]) {
        fields[parent] = { type: 'document', fields: {} };
      }
      fields[parent].fields[child] = [
        { type: 'string', analyzer: 'lucene.spanish' },
        { type: 'autocomplete', analyzer: 'lucene.standard' },
      ];
    } else {
      // Campos de texto con analyzer español y autocomplete
      fields[field] = [
        { type: 'string', analyzer: 'lucene.spanish' },
        { type: 'autocomplete', analyzer: 'lucene.standard' },
      ];
    }
  }

  return {
    name: 'global_search',
    definition: {
      mappings: {
        dynamic: false,
        fields,
      },
    },
  };
}

/**
 * Genera todos los archivos de definición de índices
 */
function generateAllIndexes(): void {
  console.log('Generando definiciones de índices de Atlas Search...\n');

  const allIndexes: Record<string, any> = {};

  for (const [type, config] of Object.entries(SEARCHABLE_ENTITIES)) {
    const indexDef = generateIndexDefinition(config.collection, config);
    allIndexes[config.collection] = indexDef;

    // Escribir archivo individual
    const filePath = path.join(OUTPUT_DIR, `${config.collection}.json`);
    fs.writeFileSync(filePath, JSON.stringify(indexDef, null, 2));
    console.log(`✓ ${config.collection}.json - ${config.searchFields.join(', ')}`);
  }

  // Escribir archivo consolidado
  const consolidatedPath = path.join(OUTPUT_DIR, '_all-indexes.json');
  fs.writeFileSync(consolidatedPath, JSON.stringify(allIndexes, null, 2));
  console.log(`\n✓ _all-indexes.json (consolidado)`);

  // Generar instrucciones
  generateInstructions();

  console.log(`\n📁 Archivos generados en: ${OUTPUT_DIR}`);
  console.log('\n📋 Ver instrucciones en: docs/atlas-search-indexes/INSTRUCTIONS.md');
}

/**
 * Genera archivo de instrucciones
 */
function generateInstructions(): void {
  const instructions = `# MongoDB Atlas Search - Instrucciones de Configuración

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

${Object.entries(SEARCHABLE_ENTITIES).map(([type, config]) =>
  `- **${config.collection}**: ${config.searchFields.join(', ')}`
).join('\n')}

## Opción 1: Crear índices desde Atlas Dashboard (Recomendado)

1. Ir a [MongoDB Atlas](https://cloud.mongodb.com)
2. Seleccionar tu cluster
3. Click en **"Database"** en el menú lateral
4. Ir a la pestaña **"Search"**
5. Click en **"Create Search Index"**
6. Seleccionar **"JSON Editor"** (opción avanzada)
7. Seleccionar la base de datos y colección
8. Pegar el contenido del archivo JSON correspondiente
9. El nombre del índice debe ser: \`global_search\`
10. Click **"Create Search Index"**
11. Repetir para cada colección

## Opción 2: Usar Atlas CLI

\`\`\`bash
# Instalar Atlas CLI si no lo tienes
brew install mongodb-atlas-cli

# Autenticarse
atlas auth login

# Crear índice para cada colección
atlas clusters search indexes create \\
  --clusterName <TU_CLUSTER> \\
  --projectId <TU_PROJECT_ID> \\
  --file docs/atlas-search-indexes/priorities.json
\`\`\`

## Opción 3: Usar Atlas Admin API

\`\`\`bash
curl -X POST \\
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/fts/indexes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer {API_KEY}" \\
  -d @docs/atlas-search-indexes/priorities.json
\`\`\`

## Verificar Funcionamiento

Una vez creados los índices, la búsqueda global estará disponible en:
- **URL**: \`/busquedaglobal\`
- **API**: \`GET /api/global-search?q=término\`

### Fallback a Regex

Si los índices de Atlas Search no están configurados, la búsqueda automáticamente
usa \`$regex\` como fallback. Esto funciona pero es menos eficiente y no tiene
fuzzy matching ni highlighting.

## Tiempo de Indexación

- Los índices de Atlas Search tardan unos minutos en construirse
- El estado se puede monitorear en el dashboard de Atlas
- Estado "Active" significa que el índice está listo

## Troubleshooting

### Error: "index not found"
- Verificar que el índice se llame exactamente \`global_search\`
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
`;

  const instructionsPath = path.join(OUTPUT_DIR, 'INSTRUCTIONS.md');
  fs.writeFileSync(instructionsPath, instructions);
}

// Ejecutar
generateAllIndexes();
