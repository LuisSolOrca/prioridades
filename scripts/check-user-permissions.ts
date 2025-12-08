import 'dotenv/config';
import mongoose from 'mongoose';

async function checkUserPermissions() {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  const user = await mongoose.connection.db.collection('users').findOne({ email: 'lgarcia@orcagrc.com' });
  
  if (!user) {
    console.log('Usuario no encontrado');
    process.exit(1);
  }
  
  console.log('=== Usuario encontrado ===');
  console.log('Nombre:', user.name);
  console.log('Email:', user.email);
  console.log('Role:', user.role);
  console.log('');
  console.log('=== Permisos guardados en DB ===');
  console.log(JSON.stringify(user.permissions, null, 2));
  
  await mongoose.disconnect();
  process.exit(0);
}

checkUserPermissions().catch(console.error);
