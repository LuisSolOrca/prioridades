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

async function checkCarriedOverPriorities() {
  try {
    console.log('🔍 Verificando prioridades traídas (isCarriedOver)...\n');
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ MongoDB conectado\n');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Priority = mongoose.models.Priority || mongoose.model('Priority', PrioritySchema);

    // Buscar todas las prioridades con isCarriedOver = true creadas en los últimos 3 días
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    const carriedPriorities = await Priority.find({
      isCarriedOver: true,
      createdAt: { $gte: threeDaysAgo }
    }).populate('userId', 'name email').sort({ createdAt: -1 });

    if (carriedPriorities.length === 0) {
      console.log('⚠️ No se encontraron prioridades traídas en los últimos 3 días\n');
      await mongoose.connection.close();
      return;
    }

    console.log(`📋 Encontradas ${carriedPriorities.length} prioridades traídas:\n`);

    // Agrupar por semana
    const byWeek = new Map<string, typeof carriedPriorities>();

    for (const priority of carriedPriorities) {
      const weekKey = `${priority.weekStart.toLocaleDateString('es-MX')} - ${priority.weekEnd.toLocaleDateString('es-MX')}`;
      if (!byWeek.has(weekKey)) {
        byWeek.set(weekKey, []);
      }
      byWeek.get(weekKey)!.push(priority);
    }

    // Mostrar por semana
    for (const [week, priorities] of byWeek) {
      console.log(`\n📅 Semana: ${week}`);
      console.log(`   Total: ${priorities.length} prioridades`);
      console.log('   ' + '─'.repeat(80));

      for (const priority of priorities) {
        console.log(`\n   • ${priority.title}`);
        console.log(`     Usuario: ${priority.userId?.name || 'N/A'}`);
        console.log(`     Estado: ${priority.status}`);
        console.log(`     Creada: ${priority.createdAt.toLocaleString('es-MX')}`);
        console.log(`     weekStart (ISO): ${priority.weekStart.toISOString()}`);
        console.log(`     weekEnd (ISO): ${priority.weekEnd.toISOString()}`);
        console.log(`     ID: ${priority._id}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Total: ${carriedPriorities.length} prioridades traídas`);
    console.log('='.repeat(80));

    await mongoose.connection.close();
    console.log('\n✅ Conexión cerrada');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCarriedOverPriorities();
