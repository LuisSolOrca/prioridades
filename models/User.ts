import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  emailNotifications?: {
    enabled: boolean;
    newComments: boolean;
    priorityAssigned: boolean;
    statusChanges: boolean;
  };
  gamification?: {
    points: number;
    currentMonthPoints: number;
    totalPoints: number;
    currentStreak: number;
    longestStreak: number;
    lastCompletedWeek?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

type UserModel = Model<IUser, {}, IUserMethods>;

const UserSchema = new Schema<IUser, UserModel, IUserMethods>({
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
  },
  role: {
    type: String,
    enum: ['ADMIN', 'USER'],
    default: 'USER',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  emailNotifications: {
    type: {
      enabled: { type: Boolean, default: true },
      newComments: { type: Boolean, default: true },
      priorityAssigned: { type: Boolean, default: true },
      statusChanges: { type: Boolean, default: true },
    },
    default: {
      enabled: true,
      newComments: true,
      priorityAssigned: true,
      statusChanges: true,
    },
  },
  gamification: {
    type: {
      points: { type: Number, default: 0 },
      currentMonthPoints: { type: Number, default: 0 },
      totalPoints: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      lastCompletedWeek: { type: Date },
    },
    default: {
      points: 0,
      currentMonthPoints: 0,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
  },
}, {
  timestamps: true,
});

// Hash password antes de guardar
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = (mongoose.models.User as UserModel) || mongoose.model<IUser, UserModel>('User', UserSchema);

export default User;
