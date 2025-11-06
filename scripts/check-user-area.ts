import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

async function checkUserArea() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado\n');

    const user = await User.findOne({ email: 'lgarcia@orcagrc.com' });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      await mongoose.disconnect();
      return;
    }

    console.log('📋 Usuario: Luis García');
    console.log(`   Email: ${user.email}`);
    console.log(`   Área: ${user.area || '(sin área asignada)'}`);
    console.log(`   Rol: ${user.role}`);
    console.log();

    if (user.area === 'Tecnología') {
      console.log('✅ Usuario ya está en el área Tecnología');
      console.log('   Tiene acceso a Azure DevOps');
    } else {
      console.log('⚠️ Usuario NO está en el área Tecnología');
      console.log(`   Área actual: ${user.area || 'Sin asignar'}`);
      console.log();
      console.log('💡 Para darle acceso, actualizar el área a "Tecnología"');
    }

    await mongoose.disconnect();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkUserArea();
