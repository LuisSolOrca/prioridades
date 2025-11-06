import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function updateUserToTechAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Conectado a MongoDB');

    const userEmail = 'lgarcia@orcagrc.com';

    // Buscar tu usuario
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      console.log(`❌ Usuario ${userEmail} no encontrado`);
      return;
    }

    console.log('\n=== USUARIO ACTUAL ===');
    console.log(`Nombre: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Área: ${user.area || 'NO DEFINIDA'}`);
    console.log(`Role: ${user.role}`);

    // Actualizar a área Tecnología
    user.area = 'Tecnología';
    await user.save();

    console.log('\n✅ Usuario actualizado correctamente');
    console.log(`Nombre: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Área: ${user.area}`);
    console.log(`Role: ${user.role}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateUserToTechAdmin();
