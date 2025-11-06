import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean,
  area: String,
  isAreaLeader: Boolean,
  emailNotifications: {
    enabled: Boolean,
    newComments: Boolean,
    priorityAssigned: Boolean,
    statusChanges: Boolean,
  },
  gamification: {
    points: Number,
    currentMonthPoints: Number,
    totalPoints: Number,
    currentStreak: Number,
    longestStreak: Number,
    badges: Array,
    featureUsage: Object,
  }
}, { timestamps: true });

async function addDevAdmin() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ MongoDB conectado');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email: 'development2@orcagrc.com' });

    if (existingUser) {
      console.log('⚠️  El usuario development@orcagrc.com ya existe');
      console.log('ID:', existingUser._id);
      console.log('Nombre:', existingUser.name);
      console.log('Rol:', existingUser.role);
      await mongoose.connection.close();
      return;
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('perripanda', salt);

    // Crear nuevo usuario admin
    const newAdmin = await User.create({
      name: 'Development Admin',
      email: 'development2@orcagrc.com',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      area: 'Desarrollo',
      isAreaLeader: false,
      emailNotifications: {
        enabled: true,
        newComments: true,
        priorityAssigned: true,
        statusChanges: true,
      },
      gamification: {
        points: 0,
        currentMonthPoints: 0,
        totalPoints: 0,
        currentStreak: 0,
        longestStreak: 0,
        badges: [],
        featureUsage: {
          aiTextImprovements: 0,
          aiOrgAnalysis: 0,
          powerpointExports: 0,
          analyticsVisits: 0,
          reportsGenerated: 0,
          excelExports: 0,
          kanbanViews: 0,
        },
      }
    });

    console.log('\n✅ Usuario administrador creado exitosamente:');
    console.log('ID:', newAdmin._id);
    console.log('Nombre:', newAdmin.name);
    console.log('Email:', newAdmin.email);
    console.log('Rol:', newAdmin.role);
    console.log('Área:', newAdmin.area);
    console.log('\n📧 Credenciales:');
    console.log('Email: development@orcagrc.com');
    console.log('Password: perripanda');

    await mongoose.connection.close();
    console.log('\n✅ Proceso completado');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addDevAdmin();
