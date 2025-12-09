import 'dotenv/config';
import mongoose from 'mongoose';
import MarketingCampaign from '../models/MarketingCampaign';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  const campaignId = '6932ea8967bc98a255533ada';

  console.log('ID válido?:', mongoose.Types.ObjectId.isValid(campaignId));

  // Buscar directamente
  const campaign = await MarketingCampaign.findById(campaignId);

  if (campaign) {
    console.log('Campaña encontrada:', campaign.name);
  } else {
    console.log('Campaña NO encontrada');
  }

  // Buscar con populate
  const campaignWithPopulate = await MarketingCampaign.findById(campaignId)
    .populate('createdBy', 'name email')
    .populate('ownerId', 'name email')
    .populate('linkedDealIds', 'title value')
    .populate('linkedClientIds', 'companyName')
    .populate('linkedContactIds', 'firstName lastName email');

  if (campaignWithPopulate) {
    console.log('Campaña con populate encontrada:', campaignWithPopulate.name);
    console.log('createdBy:', campaignWithPopulate.createdBy);
    console.log('ownerId:', campaignWithPopulate.ownerId);
  } else {
    console.log('Campaña con populate NO encontrada');
  }

  await mongoose.disconnect();
}
test().catch(console.error);
