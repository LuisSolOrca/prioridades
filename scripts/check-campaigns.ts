import 'dotenv/config';
import mongoose from 'mongoose';
import MarketingCampaign from '../models/MarketingCampaign';

async function check() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  const campaigns = await MarketingCampaign.find().limit(5);
  console.log('Total campañas:', await MarketingCampaign.countDocuments());

  campaigns.forEach(c => {
    console.log('- ID:', c._id.toString(), '| Nombre:', c.name, '| Status:', c.status);
  });

  await mongoose.disconnect();
}
check();
