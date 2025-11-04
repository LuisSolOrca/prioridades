import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Conectar a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Función para analizar un string y mostrar detalles
const analyzeString = (text: string, label: string) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📝 ${label}`);
  console.log(`${'='.repeat(80)}`);

  console.log('\n📄 Texto original:');
  console.log(`"${text}"`);

  console.log('\n🔢 Longitud:', text.length);

  console.log('\n🔍 Primeros 50 caracteres (código de carácter):');
  const chars = text.split('').slice(0, 50);
  chars.forEach((char, index) => {
    const code = char.charCodeAt(0);
    const hex = code.toString(16).padStart(4, '0');
    const displayChar = code < 32 || code > 126 ? `\\x${hex}` : char;
    console.log(`  [${index}] '${displayChar}' = ${code} (0x${hex})`);
  });

  console.log('\n📊 Análisis de caracteres:');
  const charStats = {
    nullBytes: 0,
    controlChars: 0,
    spaces: 0,
    letters: 0,
    numbers: 0,
    punctuation: 0,
    others: 0
  };

  text.split('').forEach(char => {
    const code = char.charCodeAt(0);
    if (code === 0) charStats.nullBytes++;
    else if (code < 32 || (code >= 127 && code < 160)) charStats.controlChars++;
    else if (code === 32) charStats.spaces++;
    else if (/[a-zA-ZáéíóúñÁÉÍÓÚÑüÜ]/.test(char)) charStats.letters++;
    else if (/[0-9]/.test(char)) charStats.numbers++;
    else if (/[.,;:¿?¡!()\-]/.test(char)) charStats.punctuation++;
    else charStats.others++;
  });

  console.log('  Null bytes (\\x00):', charStats.nullBytes);
  console.log('  Caracteres de control:', charStats.controlChars);
  console.log('  Espacios:', charStats.spaces);
  console.log('  Letras:', charStats.letters);
  console.log('  Números:', charStats.numbers);
  console.log('  Puntuación:', charStats.punctuation);
  console.log('  Otros:', charStats.others);

  // Mostrar la representación hexadecimal completa si es corto
  if (text.length <= 100) {
    console.log('\n🔤 Representación hexadecimal completa:');
    const hexArray = [];
    for (let i = 0; i < text.length; i++) {
      hexArray.push(text.charCodeAt(i).toString(16).padStart(2, '0'));
    }
    console.log('  ' + hexArray.join(' '));
  }

  // Intentar diferentes limpiezas
  console.log('\n🧹 Intentos de limpieza:');

  console.log('\n  1. Eliminar null bytes:');
  const clean1 = text.replace(/\x00/g, '');
  console.log(`     "${clean1}"`);

  console.log('\n  2. Eliminar caracteres de control:');
  const clean2 = text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  console.log(`     "${clean2}"`);

  console.log('\n  3. Solo caracteres ASCII imprimibles + latinos:');
  const clean3 = text.split('').filter(c => {
    const code = c.charCodeAt(0);
    return (code >= 32 && code <= 126) || (code >= 160 && code <= 255);
  }).join('');
  console.log(`     "${clean3}"`);

  console.log('\n  4. Normalización Unicode NFC:');
  const clean4 = text.normalize('NFC');
  console.log(`     "${clean4}"`);
};

const diagnosePriorities = async () => {
  console.log('\n🔍 DIAGNÓSTICO DE ENCODING EN CHECKLISTS\n');

  // Buscar prioridades con checklist
  const priorities = await mongoose.connection.db
    .collection('priorities')
    .find({
      checklist: { $exists: true, $ne: [] }
    })
    .limit(5)
    .toArray();

  console.log(`📦 Encontradas ${priorities.length} prioridades con checklist`);

  if (priorities.length === 0) {
    console.log('\n⚠️  No hay prioridades con checklist en la base de datos');
    return;
  }

  priorities.forEach((priority, index) => {
    console.log(`\n\n${'*'.repeat(80)}`);
    console.log(`PRIORIDAD ${index + 1}`);
    console.log(`${'*'.repeat(80)}`);

    // Analizar título de la prioridad
    analyzeString(priority.title, 'TÍTULO DE LA PRIORIDAD');

    // Analizar items del checklist
    if (priority.checklist && Array.isArray(priority.checklist)) {
      priority.checklist.forEach((item: any, itemIndex: number) => {
        analyzeString(item.text, `CHECKLIST ITEM ${itemIndex + 1}`);
      });
    }
  });
};

const main = async () => {
  try {
    await connectDB();
    await diagnosePriorities();
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Desconectado de MongoDB');
  }
};

main();
