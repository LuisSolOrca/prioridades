import mongoose, { Schema, Model } from 'mongoose';

export interface IContact {
  _id: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  isPrimary: boolean;
  linkedInUrl?: string;
  avatar?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>({
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'El cliente es requerido'],
    index: true,
  },
  firstName: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
  },
  lastName: {
    type: String,
    required: [true, 'El apellido es requerido'],
    trim: true,
    maxlength: [100, 'El apellido no puede exceder 100 caracteres'],
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [255, 'El email no puede exceder 255 caracteres'],
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [50, 'El teléfono no puede exceder 50 caracteres'],
  },
  position: {
    type: String,
    trim: true,
    maxlength: [100, 'El cargo no puede exceder 100 caracteres'],
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'El departamento no puede exceder 100 caracteres'],
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
  linkedInUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'La URL de LinkedIn no puede exceder 500 caracteres'],
  },
  avatar: {
    type: String,
    trim: true,
  },
  tags: {
    type: [String],
    default: [],
  },
  customFields: {
    type: Schema.Types.Mixed,
    default: {},
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

// Índices
ContactSchema.index({ clientId: 1, isActive: 1 });
ContactSchema.index({ email: 1 });
ContactSchema.index({ lastName: 1, firstName: 1 });

// Virtual para nombre completo
ContactSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Asegurar que solo haya un contacto principal por cliente
ContactSchema.pre('save', async function(next) {
  if (this.isPrimary && this.isModified('isPrimary')) {
    await mongoose.model('Contact').updateMany(
      { clientId: this.clientId, _id: { $ne: this._id } },
      { isPrimary: false }
    );
  }
  next();
});

const Contact: Model<IContact> =
  mongoose.models.Contact ||
  mongoose.model<IContact>('Contact', ContactSchema);

export default Contact;
