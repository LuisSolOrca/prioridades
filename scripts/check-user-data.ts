import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import '../models/User';

const User = mongoose.models.User || mongoose.model('User');

async function checkData() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('✅ Conectado a MongoDB\n');

  const user = await User.findOne({ email: 'lgarcia@orcagrc.com' }).lean();
  console.log('Usuario Luis:');
  console.log(JSON.stringify(user?.gamification, null, 2));

  const allUsers = await User.find({ isActive: true }).select('name email gamification').lean();
  console.log('\n\nTodos los usuarios:');
  allUsers.forEach(u => {
    console.log(`\n${u.name} (${u.email}):`);
    console.log(JSON.stringify(u.gamification, null, 2));
  });

  await mongoose.connection.close();
}

checkData();
