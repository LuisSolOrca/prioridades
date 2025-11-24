/**
 * Test de la función sanitizeMetadata
 */

function sanitizeMetadata(value: string): string {
  // Normalizar y remover diacríticos (acentos)
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Reemplazar caracteres especiales comunes
  const replacements: Record<string, string> = {
    'ñ': 'n',
    'Ñ': 'N',
    'ü': 'u',
    'Ü': 'U',
    'ç': 'c',
    'Ç': 'C',
    'ß': 'ss'
  };

  let result = normalized;
  Object.entries(replacements).forEach(([char, replacement]) => {
    result = result.replace(new RegExp(char, 'g'), replacement);
  });

  // Mantener solo caracteres ASCII imprimibles (espacio a ~)
  return result.replace(/[^\x20-\x7E]/g, '_');
}

// Casos de prueba
const testCases = [
  'Especificación Técnica RESULTS ML - V2.pdf',
  'Documento con ñ y tildes áéíóú.docx',
  'archivo-normal.txt',
  'Presentación 2024.pptx',
  'Año_Nuevo_2025.jpg',
  'München_Straße.pdf'
];

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 TEST: Función sanitizeMetadata');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

testCases.forEach((test, index) => {
  const result = sanitizeMetadata(test);
  console.log(`${index + 1}. Original: "${test}"`);
  console.log(`   Sanitizado: "${result}"`);
  console.log(`   Solo ASCII: ${/^[\x20-\x7E]*$/.test(result) ? '✅' : '❌'}`);
  console.log('');
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Todas las cadenas convertidas a ASCII puro');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
