import connectDB from '../lib/mongodb';
import Priority from '../models/Priority';
import User from '../models/User';

async function checkWeekStartRaw() {
  try {
    console.log('🔍 Verificando weekStart RAW en base de datos...\n');

    await connectDB();

    const user = await User.findOne({ name: /Francisco Puente/i });

    if (!user) {
      console.log('❌ Usuario Francisco Puente no encontrado');
      return;
    }

    const priorities = await Priority.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    console.log(`📋 Últimas 5 prioridades de ${user.name}:\n`);

    priorities.forEach((p, index) => {
      console.log(`${index + 1}. "${p.title}"`);
      console.log(`   weekStart (Date object): ${p.weekStart}`);
      console.log(`   weekStart (ISO): ${p.weekStart.toISOString()}`);
      console.log(`   weekStart (valueOf): ${p.weekStart.valueOf()}`);
      console.log(`   weekStart (toLocaleDateString MX): ${p.weekStart.toLocaleDateString('es-MX')}`);
      console.log(`   weekStart (toLocaleString MX): ${p.weekStart.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`);
      console.log(`   weekStart (getHours): ${p.weekStart.getHours()}h`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkWeekStartRaw();
