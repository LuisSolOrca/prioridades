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
  createdAt: Date,
}, { timestamps: true });

// Función para obtener el lunes de la semana actual
function getCurrentWeekMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
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

async function moveWrongWeekPriorities() {
  try {
    console.log('🔧 Moviendo prioridades mal reprogramadas a la semana actual...\n');
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ MongoDB conectado\n');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Priority = mongoose.models.Priority || mongoose.model('Priority', PrioritySchema);

    // Calcular fechas de la semana actual
    const currentMonday = getCurrentWeekMonday();
    const currentFriday = getCurrentWeekFriday();

    // Fecha exacta de las prioridades mal ubicadas (2025-12-01)
    // Estas son las prioridades que el auto-reschedule movió incorrectamente
    const wrongWeekStart = new Date('2025-12-01T00:00:00.000Z');

    console.log('📅 Fechas:');
    console.log('Semana ACTUAL (destino):');
    console.log('  Lunes:', currentMonday.toISOString());
    console.log('  Viernes:', currentFriday.toISOString());
    console.log('\nSemana INCORRECTA (donde están las prioridades):');
    console.log('  Lunes:', wrongWeekStart.toISOString());

    // Buscar prioridades que:
    // 1. Están programadas para el 1 de diciembre (weekStart = 2025-12-01)
    // 2. Tienen isCarriedOver = true (son prioridades traídas)
    // 3. Están en estado EN_TIEMPO
    const wrongPriorities = await Priority.find({
      weekStart: wrongWeekStart,
      isCarriedOver: true,
      status: 'EN_TIEMPO'
    }).populate('userId', 'name email');

    if (wrongPriorities.length === 0) {
      console.log('\n⚠️ No se encontraron prioridades para mover');
      console.log('Puede que ya hayan sido movidas anteriormente\n');
      await mongoose.connection.close();
      return;
    }

    console.log(`\n🔍 Encontradas ${wrongPriorities.length} prioridades para mover:\n`);

    let moved = 0;
    let failed = 0;

    for (const priority of wrongPriorities) {
      try {
        console.log(`📝 ${priority.title}`);
        console.log(`   Usuario: ${priority.userId?.name || 'N/A'}`);
        console.log(`   De: ${priority.weekStart.toLocaleDateString('es-MX')} → ${priority.weekEnd.toLocaleDateString('es-MX')}`);

        // Actualizar a la semana actual
        priority.weekStart = currentMonday;
        priority.weekEnd = currentFriday;
        await priority.save();

        console.log(`   A:  ${currentMonday.toLocaleDateString('es-MX')} → ${currentFriday.toLocaleDateString('es-MX')}`);
        console.log(`   ✅ Movida exitosamente\n`);
        moved++;
      } catch (error) {
        console.error(`   ❌ Error al mover:`, error);
        failed++;
      }
    }

    console.log('='.repeat(70));
    console.log(`✅ Proceso completado`);
    console.log(`   Movidas: ${moved}`);
    console.log(`   Fallidas: ${failed}`);
    console.log('='.repeat(70));

    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

moveWrongWeekPriorities();
