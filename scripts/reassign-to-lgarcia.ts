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

    // Luis García (lgarcia@orcagrc.com) ID: 69056de76f4dfcedda7a387e
    config.userId = new mongoose.Types.ObjectId('69056de76f4dfcedda7a387e');
    await config.save();

    console.log(`✅ Config actualizada a Luis García (lgarcia@orcagrc.com)`);
    console.log(`   Usuario ID: ${config.userId}`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

reassign();
