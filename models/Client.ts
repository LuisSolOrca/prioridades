import mongoose, { Schema, Model } from 'mongoose';

// Estado del cliente en el ciclo de vida
export type ClientStatus = 'prospect' | 'active' | 'at_risk' | 'churned' | 'inactive';

export interface IClient {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  // Campos CRM
  industry?: string;
  website?: string;
  phone?: string;
  address?: string;
  logo?: string;
  annualRevenue?: number;
  employeeCount?: number;
  source?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  crmNotes?: string;

  // Campos financieros y de ciclo de vida
  status?: ClientStatus;          // Estado del cliente
  firstDealDate?: Date;           // Fecha del primer deal ganado
  lastDealDate?: Date;            // Fecha del último deal ganado
  acquisitionCost?: number;       // Costo de adquisición del cliente (CAC)
  churnedAt?: Date;               // Fecha en que se perdió el cliente
  churnReason?: string;           // Razón de pérdida
  lifetimeValue?: number;         // CLTV calculado
  totalRevenue?: number;          // Ingresos totales históricos
  dealCount?: number;             // Número de deals ganados
  avgDealValue?: number;          // Valor promedio de deal
  monthlyRecurringRevenue?: number; // MRR actual del cliente

  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>({
  name: {
    type: String,
    required: [true, 'El nombre del cliente es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
    unique: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Campos CRM
  industry: {
    type: String,
    trim: true,
    maxlength: [100, 'La industria no puede exceder 100 caracteres'],
  },
  website: {
    type: String,
    trim: true,
    maxlength: [500, 'El sitio web no puede exceder 500 caracteres'],
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [50, 'El teléfono no puede exceder 50 caracteres'],
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'La dirección no puede exceder 500 caracteres'],
  },
  logo: {
    type: String,
    trim: true,
  },
  annualRevenue: {
    type: Number,
    min: 0,
  },
  employeeCount: {
    type: Number,
    min: 0,
  },
  source: {
    type: String,
    trim: true,
    maxlength: [100, 'La fuente no puede exceder 100 caracteres'],
  },
  tags: {
    type: [String],
    default: [],
  },
  customFields: {
    type: Schema.Types.Mixed,
    default: {},
  },
  crmNotes: {
    type: String,
    trim: true,
  },

  // Campos financieros y de ciclo de vida
  status: {
    type: String,
    enum: ['prospect', 'active', 'at_risk', 'churned', 'inactive'],
    default: 'prospect',
  },
  firstDealDate: {
    type: Date,
  },
  lastDealDate: {
    type: Date,
  },
  acquisitionCost: {
    type: Number,
    min: 0,
  },
  churnedAt: {
    type: Date,
  },
  churnReason: {
    type: String,
    trim: true,
    maxlength: [500, 'La razón de pérdida no puede exceder 500 caracteres'],
  },
  lifetimeValue: {
    type: Number,
    min: 0,
  },
  totalRevenue: {
    type: Number,
    min: 0,
    default: 0,
  },
  dealCount: {
    type: Number,
    min: 0,
    default: 0,
  },
  avgDealValue: {
    type: Number,
    min: 0,
  },
  monthlyRecurringRevenue: {
    type: Number,
    min: 0,
    default: 0,
  },
}, {
  timestamps: true,
});

// Índice para mejorar el rendimiento en búsquedas
ClientSchema.index({ name: 1 });
ClientSchema.index({ isActive: 1 });

const Client: Model<IClient> =
  mongoose.models.Client ||
  mongoose.model<IClient>('Client', ClientSchema);

export default Client;
