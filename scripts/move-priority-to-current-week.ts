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

async function movePriorityToCurrentWeek() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ MongoDB conectado\n');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Priority = mongoose.models.Priority || mongoose.model('Priority', PrioritySchema);

    const priorityTitle = 'Definición de privilegios y acciones para los endpoints de backoffice y customer';

    // Buscar la prioridad
    console.log(`Buscando prioridad: "${priorityTitle}"`);
    const priority = await Priority.findOne({ title: priorityTitle }).populate('userId', 'name email');

    if (!priority) {
      console.log('❌ No se encontró la prioridad');
      await mongoose.connection.close();
      return;
    }

    console.log('\n📋 Prioridad encontrada:');
    console.log('ID:', priority._id);
    console.log('Título:', priority.title);
    console.log('Usuario:', priority.userId?.name || 'N/A', `(${priority.userId?.email || 'N/A'})`);
    console.log('Estado:', priority.status);
    console.log('Tipo:', priority.type);
    console.log('Semana Actual:', {
      inicio: priority.weekStart.toISOString().split('T')[0],
      fin: priority.weekEnd.toISOString().split('T')[0]
    });

    // Calcular la semana actual
    const currentMonday = getCurrentWeekMonday();
    const currentFriday = getCurrentWeekFriday();

    console.log('\n📅 Nueva semana (actual):');
    console.log('Inicio:', currentMonday.toISOString().split('T')[0]);
    console.log('Fin:', currentFriday.toISOString().split('T')[0]);

    // Actualizar la prioridad
    console.log('\n🔄 Actualizando prioridad...');
    priority.weekStart = currentMonday;
    priority.weekEnd = currentFriday;
    await priority.save();

    console.log('\n✅ Prioridad movida exitosamente a la semana actual');
    console.log('Nueva semana:', {
      inicio: priority.weekStart.toISOString().split('T')[0],
      fin: priority.weekEnd.toISOString().split('T')[0]
    });

    await mongoose.connection.close();
    console.log('\n✅ Proceso completado');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

movePriorityToCurrentWeek();
