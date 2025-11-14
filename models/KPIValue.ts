import mongoose, { Schema, Model } from 'mongoose';

export type ValueStatus = 'PRELIMINAR' | 'CONFIRMADO' | 'REVISADO' | 'APROBADO';

export interface IKPIValue {
  _id: mongoose.Types.ObjectId;

  // Relación con KPI
  kpiId: mongoose.Types.ObjectId;
  kpiVersion: number; // Versión del KPI al momento del registro

  // Valor registrado
  value: number;
  calculatedValue?: number; // Si aplica fórmula

  // Variables de la fórmula (si las hay)
  // Puede contener números, arrays, fechas, etc.
  variables?: { [key: string]: any };

  // Período del valor
  periodStart: Date;
  periodEnd: Date;

  // Estado y validación
  status: ValueStatus;

  // Metadata
  registeredBy: mongoose.Types.ObjectId;
  registeredAt: Date;
  notes?: string; // Notas o comentarios sobre el valor

  // Aprobación
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const KPIValueSchema = new Schema<IKPIValue>({
  kpiId: {
    type: Schema.Types.ObjectId,
    ref: 'KPI',
    required: [true, 'El KPI es requerido'],
  },
  kpiVersion: {
    type: Number,
    required: true,
  },
  value: {
    type: Number,
    required: [true, 'El valor es requerido'],
  },
  calculatedValue: {
    type: Number,
  },
  variables: {
    type: Map,
    of: Schema.Types.Mixed, // Soporta cualquier tipo: number, array, date, etc.
  },
  periodStart: {
    type: Date,
    required: [true, 'La fecha de inicio del período es requerida'],
  },
  periodEnd: {
    type: Date,
    required: [true, 'La fecha de fin del período es requerida'],
  },
  status: {
    type: String,
    enum: ['PRELIMINAR', 'CONFIRMADO', 'REVISADO', 'APROBADO'],
    default: 'PRELIMINAR',
  },
  registeredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  registeredAt: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
    maxlength: [500, 'Las notas no pueden exceder 500 caracteres'],
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
}, {
  timestamps: true,
});

// Índices para optimizar consultas
KPIValueSchema.index({ kpiId: 1, periodStart: -1 });
KPIValueSchema.index({ registeredBy: 1 });
KPIValueSchema.index({ status: 1 });
KPIValueSchema.index({ periodStart: 1, periodEnd: 1 });

// Validación: no permitir valores duplicados para el mismo KPI y período
KPIValueSchema.index(
  { kpiId: 1, periodStart: 1, periodEnd: 1 },
  { unique: true }
);

const KPIValue: Model<IKPIValue> =
  mongoose.models.KPIValue ||
  mongoose.model<IKPIValue>('KPIValue', KPIValueSchema);

export default KPIValue;
