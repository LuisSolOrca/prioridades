/**
 * Migration Script: Multi-Pipeline Support
 *
 * This script migrates existing data to support multiple pipelines:
 * 1. Creates a default "Principal" pipeline
 * 2. Assigns all existing stages to this pipeline
 * 3. Assigns all existing deals to this pipeline
 *
 * Run with: npx tsx scripts/migrate-multi-pipeline.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Define schemas inline to avoid import issues
const PipelineSchema = new mongoose.Schema({
  name: String,
  description: String,
  color: String,
  isDefault: Boolean,
  isActive: Boolean,
  createdBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const PipelineStageSchema = new mongoose.Schema({
  pipelineId: mongoose.Schema.Types.ObjectId,
  name: String,
  order: Number,
  color: String,
  probability: Number,
  isDefault: Boolean,
  isClosed: Boolean,
  isWon: Boolean,
  isActive: Boolean,
}, { timestamps: true });

const DealSchema = new mongoose.Schema({
  pipelineId: mongoose.Schema.Types.ObjectId,
  title: String,
  value: Number,
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  email: String,
  role: String,
});

async function migrate() {
  console.log('🚀 Starting Multi-Pipeline Migration...\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Pipeline = mongoose.models.Pipeline || mongoose.model('Pipeline', PipelineSchema);
    const PipelineStage = mongoose.models.PipelineStage || mongoose.model('PipelineStage', PipelineStageSchema);
    const Deal = mongoose.models.Deal || mongoose.model('Deal', DealSchema);
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // 1. Check if migration is needed
    const existingPipelines = await Pipeline.countDocuments();
    if (existingPipelines > 0) {
      console.log(`ℹ️  Found ${existingPipelines} existing pipeline(s).`);

      // Check if stages have pipelineId
      const stagesWithoutPipeline = await PipelineStage.countDocuments({
        pipelineId: { $exists: false }
      });

      if (stagesWithoutPipeline === 0) {
        console.log('✅ All stages already have pipelineId. Migration may have already run.');

        const dealsWithoutPipeline = await Deal.countDocuments({
          pipelineId: { $exists: false }
        });

        if (dealsWithoutPipeline === 0) {
          console.log('✅ All deals already have pipelineId. Migration complete!');
          return;
        }
      }
    }

    // 2. Get admin user for createdBy
    const adminUser = await User.findOne({ role: 'ADMIN' });
    if (!adminUser) {
      console.error('❌ No admin user found. Please create an admin user first.');
      process.exit(1);
    }
    console.log(`👤 Using admin user: ${adminUser.email}\n`);

    // 3. Create default pipeline if none exists
    let defaultPipeline = await Pipeline.findOne({ isDefault: true });

    if (!defaultPipeline) {
      console.log('📦 Creating default pipeline "Principal"...');
      defaultPipeline = await Pipeline.create({
        name: 'Principal',
        description: 'Pipeline principal de ventas',
        color: '#3B82F6',
        isDefault: true,
        isActive: true,
        createdBy: adminUser._id,
      });
      console.log(`✅ Created pipeline: ${defaultPipeline.name} (${defaultPipeline._id})\n`);
    } else {
      console.log(`✅ Default pipeline exists: ${defaultPipeline.name} (${defaultPipeline._id})\n`);
    }

    // 4. Update stages without pipelineId
    const stagesWithoutPipeline = await PipelineStage.find({
      $or: [
        { pipelineId: { $exists: false } },
        { pipelineId: null }
      ]
    });

    if (stagesWithoutPipeline.length > 0) {
      console.log(`📊 Updating ${stagesWithoutPipeline.length} stage(s) without pipelineId...`);

      const stageResult = await PipelineStage.updateMany(
        {
          $or: [
            { pipelineId: { $exists: false } },
            { pipelineId: null }
          ]
        },
        { $set: { pipelineId: defaultPipeline._id } }
      );

      console.log(`✅ Updated ${stageResult.modifiedCount} stage(s)\n`);
    } else {
      console.log('✅ All stages already have pipelineId\n');
    }

    // 5. Update deals without pipelineId
    const dealsWithoutPipeline = await Deal.find({
      $or: [
        { pipelineId: { $exists: false } },
        { pipelineId: null }
      ]
    });

    if (dealsWithoutPipeline.length > 0) {
      console.log(`💼 Updating ${dealsWithoutPipeline.length} deal(s) without pipelineId...`);

      const dealResult = await Deal.updateMany(
        {
          $or: [
            { pipelineId: { $exists: false } },
            { pipelineId: null }
          ]
        },
        { $set: { pipelineId: defaultPipeline._id } }
      );

      console.log(`✅ Updated ${dealResult.modifiedCount} deal(s)\n`);
    } else {
      console.log('✅ All deals already have pipelineId\n');
    }

    // 6. Summary
    console.log('═══════════════════════════════════════════');
    console.log('                SUMMARY                    ');
    console.log('═══════════════════════════════════════════');

    const totalPipelines = await Pipeline.countDocuments();
    const totalStages = await PipelineStage.countDocuments({ isActive: true });
    const totalDeals = await Deal.countDocuments();

    console.log(`📦 Pipelines: ${totalPipelines}`);
    console.log(`📊 Active Stages: ${totalStages}`);
    console.log(`💼 Total Deals: ${totalDeals}`);
    console.log('═══════════════════════════════════════════');
    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

migrate();
