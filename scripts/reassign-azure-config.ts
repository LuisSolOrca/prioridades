import mongoose from 'mongoose';
import AzureDevOpsConfig from '../models/AzureDevOpsConfig';
import dotenv from 'dotenv';

dotenv.config();

async function reassign() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado');

    const config = await AzureDevOpsConfig.findOne({ organization: 'ddominguez0427' });

    if (!config) {
      console.log('❌ Config no encontrada');
      await mongoose.disconnect();
      return;
    }

    console.log(`Usuario actual: ${config.userId}`);

    // David Dominguez ID
    config.userId = new mongoose.Types.ObjectId('690613059f3fe34ab766fe06');
    await config.save();

    console.log(`✅ Config actualizada a David Dominguez (${config.userId})`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

reassign();
