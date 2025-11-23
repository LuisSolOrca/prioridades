import mongoose, { Schema, Model } from 'mongoose';

export interface IUserGroup {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  tag: string; // El tag usado para menciones (ej: "developers", "managers")
  members: mongoose.Types.ObjectId[]; // Array de IDs de usuarios
  color?: string; // Color para el tag en menciones
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

type UserGroupModel = Model<IUserGroup>;

const UserGroupSchema = new Schema<IUserGroup, UserGroupModel>({
  name: {
    type: String,
    required: [true, 'El nombre del grupo es requerido'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  tag: {
    type: String,
    required: [true, 'El tag es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'El tag solo puede contener letras minúsculas, números y guiones'],
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  color: {
    type: String,
    default: '#3b82f6',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Index para búsqueda rápida
UserGroupSchema.index({ tag: 1 });
UserGroupSchema.index({ isActive: 1 });

const UserGroup = (mongoose.models.UserGroup as UserGroupModel) ||
  mongoose.model<IUserGroup, UserGroupModel>('UserGroup', UserGroupSchema);

export default UserGroup;
