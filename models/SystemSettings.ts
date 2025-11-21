import mongoose, { Schema, Model } from 'mongoose';

export type ReportFrequency = 'SEMANAL' | 'MENSUAL' | 'AMBOS' | 'NINGUNO';

export interface ISystemSettings {
  _id: mongoose.Types.ObjectId;
  reportFrequency: ReportFrequency;
  weeklyReportDay: number; // 0-6 (0 = Domingo, 1 = Lunes, etc.)
  weeklyReportHour: number; // 0-23
  monthlyReportDay: number; // 1-28 (día del mes)
  monthlyReportHour: number; // 0-23
  emailSubjectPrefix: string;
  isActive: boolean;
  lastWeeklyReportSent?: Date;
  lastMonthlyReportSent?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>({
  reportFrequency: {
    type: String,
    enum: ['SEMANAL', 'MENSUAL', 'AMBOS', 'NINGUNO'],
    default: 'NINGUNO',
    required: true,
  },
  weeklyReportDay: {
    type: Number,
    min: 0,
    max: 6,
    default: 1, // Lunes por defecto
    required: true,
  },
  weeklyReportHour: {
    type: Number,
    min: 0,
    max: 23,
    default: 9, // 9 AM por defecto
    required: true,
  },
  monthlyReportDay: {
    type: Number,
    min: 1,
    max: 28,
    default: 1, // Primer día del mes por defecto
    required: true,
  },
  monthlyReportHour: {
    type: Number,
    min: 0,
    max: 23,
    default: 9, // 9 AM por defecto
    required: true,
  },
  emailSubjectPrefix: {
    type: String,
    default: '📊 Reporte de Rendimiento',
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastWeeklyReportSent: {
    type: Date,
  },
  lastMonthlyReportSent: {
    type: Date,
  },
}, {
  timestamps: true,
});

const SystemSettings: Model<ISystemSettings> =
  mongoose.models.SystemSettings ||
  mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);

export default SystemSettings;
