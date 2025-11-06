import connectDB from '../lib/mongodb';
import Priority from '../models/Priority';
import User from '../models/User';

async function testWeekFilter() {
  try {
    console.log('🔍 Probando filtro de semana con Francisco Puente...\n');

    await connectDB();

    // Buscar usuario Francisco Puente
    const user = await User.findOne({ name: /Francisco Puente/i });

    if (!user) {
      console.log('❌ Usuario Francisco Puente no encontrado');
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.name} (${user._id})`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Obtener todas sus prioridades
    const allPriorities = await Priority.find({ userId: user._id })
      .sort({ weekStart: -1, createdAt: -1 });

    console.log(`📋 Total de prioridades: ${allPriorities.length}\n`);

    if (allPriorities.length === 0) {
      console.log('⚠️  No hay prioridades para probar');
      return;
    }

    // Mostrar todas las prioridades con sus fechas
    console.log('📅 Prioridades con sus fechas de creación y weekStart:\n');

    allPriorities.forEach((priority, index) => {
      const createdAt = new Date(priority.createdAt);
      const weekStart = new Date(priority.weekStart);
      const weekEnd = new Date(priority.weekEnd);
      const dayCreated = createdAt.toLocaleDateString('es-MX', { weekday: 'long' });

      console.log(`${index + 1}. "${priority.title}"`);
      console.log(`   Creada el: ${createdAt.toLocaleString('es-MX')} (${dayCreated})`);
      console.log(`   weekStart: ${weekStart.toLocaleDateString('es-MX')} (${weekStart.toLocaleDateString('en-US', { weekday: 'long' })})`);
      console.log(`   weekEnd: ${weekEnd.toLocaleDateString('es-MX')}`);
      console.log(`   Estado: ${priority.status}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Agrupar por weekStart
    const prioritiesByWeek = new Map<string, typeof allPriorities>();

    allPriorities.forEach(priority => {
      const weekStartKey = new Date(priority.weekStart).toISOString().split('T')[0];
      if (!prioritiesByWeek.has(weekStartKey)) {
        prioritiesByWeek.set(weekStartKey, []);
      }
      prioritiesByWeek.get(weekStartKey)!.push(priority);
    });

    console.log('📊 Prioridades agrupadas por semana:\n');

    for (const [weekStartKey, priorities] of prioritiesByWeek.entries()) {
      const weekStartDate = new Date(weekStartKey);
      console.log(`\n🗓️  Semana del ${weekStartDate.toLocaleDateString('es-MX')} (${priorities.length} prioridades):`);

      priorities.forEach(p => {
        const createdAt = new Date(p.createdAt);
        const dayCreated = createdAt.toLocaleDateString('es-MX', { weekday: 'short' });
        console.log(`   • ${p.title}`);
        console.log(`     Creada: ${createdAt.toLocaleDateString('es-MX')} (${dayCreated})`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Probar el filtro con cada weekStart único
    console.log('🧪 Probando filtro de API para cada semana:\n');

    for (const [weekStartKey, expectedPriorities] of prioritiesByWeek.entries()) {
      // Usar el weekStart ISO real de la primera prioridad del grupo
      const weekStartDate = new Date(expectedPriorities[0].weekStart);

      const nextDay = new Date(weekStartDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Simular la query del API
      const query: any = {
        userId: user._id,
        weekStart: {
          $gte: weekStartDate,
          $lt: nextDay
        }
      };

      const filteredPriorities = await Priority.find(query);

      const matches = filteredPriorities.length === expectedPriorities.length;
      const symbol = matches ? '✅' : '❌';

      console.log(`${symbol} Semana del ${weekStartDate.toLocaleDateString('es-MX')}:`);
      console.log(`   Query: weekStart >= ${weekStartDate.toISOString()}`);
      console.log(`          weekStart < ${nextDay.toISOString()}`);
      console.log(`   Esperadas: ${expectedPriorities.length} | Encontradas: ${filteredPriorities.length}`);

      if (!matches) {
        console.log('   ⚠️  DISCREPANCIA DETECTADA!');
        console.log('   Esperadas:');
        expectedPriorities.forEach(p => console.log(`      - ${p.title}`));
        console.log('   Encontradas:');
        filteredPriorities.forEach(p => console.log(`      - ${p.title}`));
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verificar si hay prioridades creadas en fin de semana
    const weekendPriorities = allPriorities.filter(p => {
      const createdDate = new Date(p.createdAt);
      const day = createdDate.getDay();
      return day === 0 || day === 6; // 0 = domingo, 6 = sábado
    });

    if (weekendPriorities.length > 0) {
      console.log('🎯 Prioridades creadas en fin de semana:\n');
      weekendPriorities.forEach(p => {
        const createdAt = new Date(p.createdAt);
        const weekStart = new Date(p.weekStart);
        const dayCreated = createdAt.toLocaleDateString('es-MX', { weekday: 'long' });

        console.log(`   • "${p.title}"`);
        console.log(`     Creada el: ${createdAt.toLocaleString('es-MX')} (${dayCreated})`);
        console.log(`     weekStart asignado: ${weekStart.toLocaleDateString('es-MX')} (lunes)`);
        console.log('');
      });
    } else {
      console.log('ℹ️  No hay prioridades creadas en fin de semana\n');
    }

    console.log('✅ Prueba completada exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testWeekFilter();
