import mongoose, { Schema, Model } from 'mongoose';

export interface ISalesQuota {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;         // Vendedor
  period: 'monthly' | 'quarterly' | 'yearly';
  year: number;
  month?: number;           // 1-12 para monthly
  quarter?: number;         // 1-4 para quarterly
  targetValue: number;      // Meta en dinero
  targetDeals?: number;     // Meta en cantidad de deals
  currency: string;
  notes?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SalesQuotaSchema = new Schema<ISalesQuota>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El vendedor es requerido'],
    index: true,
  },
  period: {
    type: String,
    required: [true, 'El período es requerido'],
    enum: ['monthly', 'quarterly', 'yearly'],
  },
  year: {
    type: Number,
    required: [true, 'El año es requerido'],
    min: [2020, 'El año debe ser mayor a 2020'],
    max: [2100, 'El año debe ser menor a 2100'],
  },
  month: {
    type: Number,
    min: 1,
    max: 12,
    validate: {
      validator: function(this: ISalesQuota, v: number | undefined) {
        // Mes requerido solo para período mensual
        if (this.period === 'monthly') {
          return v !== undefined && v >= 1 && v <= 12;
        }
        return true;
      },
      message: 'El mes es requerido para metas mensuales (1-12)',
    },
  },
  quarter: {
    type: Number,
    min: 1,
    max: 4,
    validate: {
      validator: function(this: ISalesQuota, v: number | undefined) {
        // Trimestre requerido solo para período trimestral
        if (this.period === 'quarterly') {
          return v !== undefined && v >= 1 && v <= 4;
        }
        return true;
      },
      message: 'El trimestre es requerido para metas trimestrales (1-4)',
    },
  },
  targetValue: {
    type: Number,
    required: [true, 'El valor meta es requerido'],
    min: [0, 'El valor meta no puede ser negativo'],
  },
  targetDeals: {
    type: Number,
    min: [0, 'La cantidad de deals no puede ser negativa'],
  },
  currency: {
    type: String,
    required: true,
    default: 'MXN',
    enum: ['MXN', 'USD', 'EUR'],
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Las notas no pueden exceder 500 caracteres'],
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

// Índices compuestos para búsquedas comunes
SalesQuotaSchema.index({ userId: 1, year: 1, period: 1 });
SalesQuotaSchema.index({ year: 1, month: 1 });
SalesQuotaSchema.index({ year: 1, quarter: 1 });
SalesQuotaSchema.index({ isActive: 1 });

// Índice único para evitar duplicados
SalesQuotaSchema.index(
  { userId: 1, period: 1, year: 1, month: 1, quarter: 1 },
  { unique: true, sparse: true }
);

// Método estático para obtener el período actual
SalesQuotaSchema.statics.getCurrentPeriod = function() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    quarter: Math.ceil((now.getMonth() + 1) / 3),
  };
};

// Método estático para obtener fechas de inicio y fin de un período
SalesQuotaSchema.statics.getPeriodDates = function(
  period: 'monthly' | 'quarterly' | 'yearly',
  year: number,
  month?: number,
  quarter?: number
): { startDate: Date; endDate: Date } {
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case 'monthly':
      if (!month) throw new Error('Mes requerido para período mensual');
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
      break;
    case 'quarterly':
      if (!quarter) throw new Error('Trimestre requerido para período trimestral');
      const startMonth = (quarter - 1) * 3;
      startDate = new Date(year, startMonth, 1);
      endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
      break;
    case 'yearly':
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      break;
  }

  return { startDate, endDate };
};

// Virtual para nombre del período
SalesQuotaSchema.virtual('periodLabel').get(function() {
  const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const quarterNames = ['', 'Q1 (Ene-Mar)', 'Q2 (Abr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dic)'];

  switch (this.period) {
    case 'monthly':
      return `${monthNames[this.month || 0]} ${this.year}`;
    case 'quarterly':
      return `${quarterNames[this.quarter || 0]} ${this.year}`;
    case 'yearly':
      return `Año ${this.year}`;
    default:
      return '';
  }
});

// Asegurar que los virtuals se incluyan en JSON
SalesQuotaSchema.set('toJSON', { virtuals: true });
SalesQuotaSchema.set('toObject', { virtuals: true });

const SalesQuota: Model<ISalesQuota> =
  mongoose.models.SalesQuota ||
  mongoose.model<ISalesQuota>('SalesQuota', SalesQuotaSchema);

export default SalesQuota;

// Constantes útiles
export const PERIOD_LABELS = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

export const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

export const QUARTERS = [
  { value: 1, label: 'Q1 (Enero - Marzo)' },
  { value: 2, label: 'Q2 (Abril - Junio)' },
  { value: 3, label: 'Q3 (Julio - Septiembre)' },
  { value: 4, label: 'Q4 (Octubre - Diciembre)' },
];
