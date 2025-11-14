import mongoose, { Schema, Model } from 'mongoose';

// Tipos para el KPI
export type KPIPeriodicity = 'DIARIA' | 'SEMANAL' | 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL';
export type KPIType = 'EFICIENCIA' | 'EFICACIA' | 'CALIDAD' | 'RIESGO' | 'FINANCIERO' | 'OPERATIVO';
export type KPIStatus = 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'ACTIVO' | 'INACTIVO' | 'ARCHIVADO';
export type DataSource = 'MANUAL' | 'API' | 'ARCHIVO' | 'SISTEMA_INTERNO';

export interface IKPITolerance {
  minimum: number; // Mínimo aceptable
  warningThreshold: number; // Umbral de alerta
}

export interface IKPITag {
  category: string; // OKR, área, proceso, departamento, producto
  value: string;
}

export interface IKPIVersion {
  version: number;
  date: Date;
  modifiedBy: mongoose.Types.ObjectId; // Usuario que hizo el cambio
  changes: string; // Descripción de los cambios
  formula?: string; // Fórmula en esta versión
  target?: number; // Meta en esta versión
  tolerance?: IKPITolerance; // Tolerancia en esta versión
}

export interface IKPI {
  _id: mongoose.Types.ObjectId;

  // Información básica
  name: string;
  description?: string;
  strategicObjective: string; // Objetivo estratégico al que contribuye

  // Relación con iniciativa estratégica
  initiativeId: mongoose.Types.ObjectId;

  // Configuración del KPI
  unit: string; // Unidad de medida (%, $, cantidad, etc.)
  periodicity: KPIPeriodicity;
  responsible: mongoose.Types.ObjectId; // Owner del KPI

  // Fórmula y fuente de datos
  formula: string; // Fórmula de cálculo (parseable por hot-formula-parser)
  dataSource: DataSource;

  // Metas y tolerancias
  target: number; // Meta
  tolerance: IKPITolerance;

  // Clasificación
  kpiType: KPIType;
  tags: IKPITag[]; // Etiquetas/categorías

  // Ciclo de vida
  status: KPIStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;

  // Versionado
  currentVersion: number;
  versions: IKPIVersion[];

  // Metadatos
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KPIToleranceSchema = new Schema<IKPITolerance>({
  minimum: {
    type: Number,
    required: true,
  },
  warningThreshold: {
    type: Number,
    required: true,
  },
}, { _id: false });

const KPITagSchema = new Schema<IKPITag>({
  category: {
    type: String,
    required: true,
    trim: true,
  },
  value: {
    type: String,
    required: true,
    trim: true,
  },
}, { _id: false });

const KPIVersionSchema = new Schema<IKPIVersion>({
  version: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  modifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  changes: {
    type: String,
    required: true,
  },
  formula: String,
  target: Number,
  tolerance: KPIToleranceSchema,
}, { _id: false });

const KPISchema = new Schema<IKPI>({
  name: {
    type: String,
    required: [true, 'El nombre del KPI es requerido'],
    trim: true,
    maxlength: [200, 'El nombre no puede exceder 200 caracteres'],
  },
  description: {
    type: String,
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres'],
  },
  strategicObjective: {
    type: String,
    required: [true, 'El objetivo estratégico es requerido'],
    maxlength: [500, 'El objetivo estratégico no puede exceder 500 caracteres'],
  },
  initiativeId: {
    type: Schema.Types.ObjectId,
    ref: 'StrategicInitiative',
    required: [true, 'La iniciativa estratégica es requerida'],
  },
  unit: {
    type: String,
    required: [true, 'La unidad de medida es requerida'],
    trim: true,
    maxlength: [50, 'La unidad no puede exceder 50 caracteres'],
  },
  periodicity: {
    type: String,
    enum: ['DIARIA', 'SEMANAL', 'MENSUAL', 'TRIMESTRAL', 'ANUAL'],
    required: [true, 'La periodicidad es requerida'],
  },
  responsible: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El responsable es requerido'],
  },
  formula: {
    type: String,
    required: [true, 'La fórmula de cálculo es requerida'],
    maxlength: [1000, 'La fórmula no puede exceder 1000 caracteres'],
  },
  dataSource: {
    type: String,
    enum: ['MANUAL', 'API', 'ARCHIVO', 'SISTEMA_INTERNO'],
    default: 'MANUAL',
  },
  target: {
    type: Number,
    required: [true, 'La meta es requerida'],
  },
  tolerance: {
    type: KPIToleranceSchema,
    required: [true, 'La tolerancia es requerida'],
  },
  kpiType: {
    type: String,
    enum: ['EFICIENCIA', 'EFICACIA', 'CALIDAD', 'RIESGO', 'FINANCIERO', 'OPERATIVO'],
    required: [true, 'El tipo de KPI es requerido'],
  },
  tags: {
    type: [KPITagSchema],
    default: [],
  },
  status: {
    type: String,
    enum: ['BORRADOR', 'EN_REVISION', 'APROBADO', 'ACTIVO', 'INACTIVO', 'ARCHIVADO'],
    default: 'BORRADOR',
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: Date,
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  currentVersion: {
    type: Number,
    default: 1,
  },
  versions: {
    type: [KPIVersionSchema],
    default: [],
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Índices para optimizar consultas
KPISchema.index({ initiativeId: 1, isActive: 1 });
KPISchema.index({ responsible: 1 });
KPISchema.index({ status: 1 });
KPISchema.index({ periodicity: 1 });
KPISchema.index({ 'tags.category': 1, 'tags.value': 1 });

// Middleware para crear versión inicial
KPISchema.pre('save', function(next) {
  if (this.isNew) {
    this.versions.push({
      version: 1,
      date: new Date(),
      modifiedBy: this.createdBy,
      changes: 'Creación inicial del KPI',
      formula: this.formula,
      target: this.target,
      tolerance: this.tolerance,
    });
  }
  next();
});

const KPI: Model<IKPI> =
  mongoose.models.KPI ||
  mongoose.model<IKPI>('KPI', KPISchema);

export default KPI;
