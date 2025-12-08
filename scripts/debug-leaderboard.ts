import 'dotenv/config';
import mongoose from 'mongoose';
import SystemSettings from '../models/SystemSettings';
import User from '../models/User';
import Priority from '../models/Priority';
import { calculateCurrentMonthPoints } from '../lib/gamification';

async function debug() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Conectado a MongoDB');

  // 1. Verificar SystemSettings
  const settings = await SystemSettings.findOne();
  console.log('\n=== SystemSettings ===');
  console.log('lastLeaderboardReset:', settings?.lastLeaderboardReset);

  const now = new Date();
  console.log('\nFecha actual:', now.toISOString());

  if (settings?.lastLeaderboardReset) {
    const lastReset = new Date(settings.lastLeaderboardReset);
    console.log('lastLeaderboardReset ISO:', lastReset.toISOString());
    console.log('Es futuro?:', lastReset > now);
  }

  // 2. Verificar usuarios activos
  const users = await User.find({ isActive: true }).select('name _id').limit(5);
  console.log('\n=== Usuarios activos ===');
  users.forEach(u => console.log('-', u.name, u._id.toString()));

  // 3. Verificar prioridades de un usuario
  if (users.length > 0) {
    for (const user of users.slice(0, 3)) {
      const userId = user._id;
      console.log('\n=== Prioridades de', user.name, '===');

      const priorities = await Priority.find({ userId }).sort({ weekStart: -1 }).limit(15);
      console.log('Total prioridades encontradas:', priorities.length);

      // Mostrar prioridades
      priorities.slice(0, 5).forEach(p => {
        console.log('- weekStart:', p.weekStart?.toISOString().split('T')[0], '| status:', p.status, '| title:', p.title?.substring(0, 30));
      });

      // 4. Calcular puntos con la función actual
      const calculatedPoints = await calculateCurrentMonthPoints(userId.toString());
      console.log('\nPuntos calculados por calculateCurrentMonthPoints:', calculatedPoints);

      // 5. Cálculo manual para comparar
      const completadas = priorities.filter(p => p.status === 'COMPLETADO').length;
      const enRiesgo = priorities.filter(p => ['EN_RIESGO', 'BLOQUEADO', 'REPROGRAMADO'].includes(p.status)).length;

      console.log('--- Cálculo manual (todas las prioridades) ---');
      console.log('Completadas:', completadas, '(+', completadas * 4, 'pts)');
      console.log('En riesgo/bloqueado/reprogramado:', enRiesgo, '(-', enRiesgo * 6, 'pts)');
      console.log('Total manual:', completadas * 4 - enRiesgo * 6);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

debug().catch(e => { console.error(e); process.exit(1); });
