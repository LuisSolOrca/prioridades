import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI!;

// Schema simple para consulta
const PrioritySchema = new mongoose.Schema({}, { strict: false, collection: 'priorities' });
const Priority = mongoose.models.Priority || mongoose.model('Priority', PrioritySchema);

async function checkReprogrammed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Calcular fechas de semana anterior (lunes a viernes)
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const daysUntilMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

    // Semana actual
    const currentMonday = new Date(now);
    currentMonday.setDate(now.getDate() - daysUntilMonday);
    currentMonday.setHours(0, 0, 0, 0);

    const currentFriday = new Date(currentMonday);
    currentFriday.setDate(currentMonday.getDate() + 4);
    currentFriday.setHours(23, 59, 59, 999);

    // Semana anterior
    const previousMonday = new Date(currentMonday);
    previousMonday.setDate(currentMonday.getDate() - 7);

    const previousFriday = new Date(currentFriday);
    previousFriday.setDate(currentFriday.getDate() - 7);

    console.log('\n📅 Semana Anterior:', previousMonday.toLocaleDateString('es-MX'), '-', previousFriday.toLocaleDateString('es-MX'));
    console.log('📅 Semana Actual:', currentMonday.toLocaleDateString('es-MX'), '-', currentFriday.toLocaleDateString('es-MX'));

    // Buscar prioridades REPROGRAMADAS en semana anterior
    const reprogrammedPriorities = await Priority.find({
      status: 'REPROGRAMADO',
      weekStart: {
        $gte: previousMonday,
        $lte: previousFriday
      }
    }).lean();

    console.log(`\n🔄 Prioridades REPROGRAMADAS en semana anterior: ${reprogrammedPriorities.length}`);
    reprogrammedPriorities.forEach((p: any) => {
      console.log(`  - ${p.title}`);
      console.log(`    Status: ${p.status}`);
      console.log(`    User ID: ${p.userId}`);
      console.log(`    Semana: ${new Date(p.weekStart).toLocaleDateString('es-MX')} - ${new Date(p.weekEnd).toLocaleDateString('es-MX')}`);
      console.log(`    isCarriedOver: ${p.isCarriedOver}`);
      console.log('');
    });

    // Buscar prioridades con isCarriedOver en semana actual
    const carriedOverPriorities = await Priority.find({
      isCarriedOver: true,
      weekStart: {
        $gte: currentMonday,
        $lte: currentFriday
      }
    }).lean();

    console.log(`📦 Prioridades traídas (isCarriedOver) en semana actual: ${carriedOverPriorities.length}`);
    carriedOverPriorities.forEach((p: any) => {
      console.log(`  - ${p.title}`);
      console.log(`    Status: ${p.status}`);
      console.log(`    User ID: ${p.userId}`);
      console.log(`    Semana: ${new Date(p.weekStart).toLocaleDateString('es-MX')} - ${new Date(p.weekEnd).toLocaleDateString('es-MX')}`);
      console.log(`    isCarriedOver: ${p.isCarriedOver}`);
      console.log('');
    });

    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkReprogrammed();
