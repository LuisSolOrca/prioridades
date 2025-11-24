import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean,
  area: String,
  isAreaLeader: Boolean,
}, { timestamps: true });

const PrioritySchema = new mongoose.Schema({
  title: String,
  description: String,
  weekStart: Date,
  weekEnd: Date,
  completionPercentage: Number,
  status: String,
  type: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  initiativeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StrategicInitiative' }],
  checklist: Array,
  evidenceLinks: Array,
  comments: Array,
  isCarriedOver: Boolean,
}, { timestamps: true });

// Función para obtener el lunes de la semana actual
function getCurrentWeekMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Si es domingo (0), retroceder 6 días
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Función para obtener el viernes de la semana actual
function getCurrentWeekFriday(): Date {
  const monday = getCurrentWeekMonday();
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  return friday;
}

// Función para obtener el lunes de la próxima semana
function getNextWeekMonday(): Date {
  const currentMonday = getCurrentWeekMonday();
  const nextMonday = new Date(currentMonday);
  nextMonday.setDate(currentMonday.getDate() + 7);
  return nextMonday;
}

async function fixReschedulesToCurrentWeek() {
  try {
    console.log('🔧 Iniciando corrección de prioridades mal reprogramadas...\n');
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ MongoDB conectado\n');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Priority = mongoose.models.Priority || mongoose.model('Priority', PrioritySchema);

    // Calcular fechas
    const currentMonday = getCurrentWeekMonday();
    const currentFriday = getCurrentWeekFriday();
    const nextMonday = getNextWeekMonday();

    console.log('📅 Semanas:');
    console.log('Semana actual:');
    console.log('  - Lunes:', currentMonday.toISOString().split('T')[0]);
    console.log('  - Viernes:', currentFriday.toISOString().split('T')[0]);
    console.log('\nPróxima semana:');
    console.log('  - Lunes:', nextMonday.toISOString().split('T')[0]);

    // Buscar prioridades que están en la próxima semana con isCarriedOver = true
    // Estas son las que fueron mal reprogramadas
    const wronglyScheduled = await Priority.find({
      weekStart: { $gte: nextMonday },
      isCarriedOver: true,
      status: 'EN_TIEMPO'
    }).populate('userId', 'name email');

    if (wronglyScheduled.length === 0) {
      console.log('\n✅ No se encontraron prioridades mal reprogramadas');
      await mongoose.connection.close();
      return;
    }

    console.log(`\n🔍 Encontradas ${wronglyScheduled.length} prioridades mal reprogramadas:\n`);

    let fixed = 0;
    let failed = 0;

    for (const priority of wronglyScheduled) {
      try {
        console.log(`📝 ${priority.title}`);
        console.log(`   Usuario: ${priority.userId?.name || 'N/A'}`);
        console.log(`   Semana actual: ${priority.weekStart.toISOString().split('T')[0]} → ${priority.weekEnd.toISOString().split('T')[0]}`);

        // Actualizar a la semana actual
        priority.weekStart = currentMonday;
        priority.weekEnd = currentFriday;
        await priority.save();

        console.log(`   ✅ Movida a: ${currentMonday.toISOString().split('T')[0]} → ${currentFriday.toISOString().split('T')[0]}\n`);
        fixed++;
      } catch (error) {
        console.error(`   ❌ Error al mover prioridad:`, error);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Corrección completada`);
    console.log(`   - Corregidas: ${fixed}`);
    console.log(`   - Fallidas: ${failed}`);
    console.log('='.repeat(50) + '\n');

    await mongoose.connection.close();
    console.log('✅ Conexión cerrada');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixReschedulesToCurrentWeek();
