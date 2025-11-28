import mongoose, { Schema, Model } from 'mongoose';

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface IQuoteItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  productSku?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

export interface IQuote {
  _id: mongoose.Types.ObjectId;
  dealId: mongoose.Types.ObjectId;
  quoteNumber: string;
  version: number;
  status: QuoteStatus;
  validUntil: Date;
  items: IQuoteItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  currency: 'MXN' | 'USD' | 'EUR';
  terms?: string;
  notes?: string;
  internalNotes?: string;
  // Información del cliente (snapshot)
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  contactName?: string;
  contactEmail?: string;
  // Tracking
  sentAt?: Date;
  sentTo?: string;
  viewedAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  // PDF
  pdfUrl?: string;
  pdfGeneratedAt?: Date;
  // Usuario
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteItemSchema = new Schema<IQuoteItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  productSku: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  taxRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 16,
  },
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, required: true, default: 0 },
  taxAmount: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true },
}, { _id: false });

const QuoteSchema = new Schema<IQuote>({
  dealId: {
    type: Schema.Types.ObjectId,
    ref: 'Deal',
    required: [true, 'El deal es requerido'],
    index: true,
  },
  quoteNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  version: {
    type: Number,
    default: 1,
    min: 1,
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
    default: 'draft',
    index: true,
  },
  validUntil: {
    type: Date,
    required: [true, 'La fecha de validez es requerida'],
  },
  items: {
    type: [QuoteItemSchema],
    default: [],
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  discountTotal: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  taxTotal: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  currency: {
    type: String,
    required: true,
    enum: ['MXN', 'USD', 'EUR'],
    default: 'MXN',
  },
  terms: {
    type: String,
    trim: true,
    maxlength: [5000, 'Los términos no pueden exceder 5000 caracteres'],
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Las notas no pueden exceder 2000 caracteres'],
  },
  internalNotes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Las notas internas no pueden exceder 2000 caracteres'],
  },
  // Información del cliente
  clientName: {
    type: String,
    required: true,
    trim: true,
  },
  clientEmail: {
    type: String,
    trim: true,
  },
  clientPhone: {
    type: String,
    trim: true,
  },
  clientAddress: {
    type: String,
    trim: true,
  },
  contactName: {
    type: String,
    trim: true,
  },
  contactEmail: {
    type: String,
    trim: true,
  },
  // Tracking
  sentAt: Date,
  sentTo: String,
  viewedAt: Date,
  acceptedAt: Date,
  rejectedAt: Date,
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'La razón de rechazo no puede exceder 500 caracteres'],
  },
  // PDF
  pdfUrl: String,
  pdfGeneratedAt: Date,
  // Usuario
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Índices
QuoteSchema.index({ quoteNumber: 1 });
QuoteSchema.index({ dealId: 1, version: -1 });
QuoteSchema.index({ status: 1, validUntil: 1 });
QuoteSchema.index({ createdAt: -1 });

// Pre-save: calcular totales
QuoteSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    this.discountTotal = this.items.reduce((sum, item) => sum + item.discountAmount, 0);
    this.taxTotal = this.items.reduce((sum, item) => sum + item.taxAmount, 0);
    this.total = this.items.reduce((sum, item) => sum + item.total, 0);
  }
  next();
});

// Método estático para generar número de cotización
QuoteSchema.statics.generateQuoteNumber = async function(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `COT-${year}-`;

  // Buscar la última cotización del año
  const lastQuote = await this.findOne({
    quoteNumber: { $regex: `^${prefix}` },
  }).sort({ quoteNumber: -1 });

  let nextNumber = 1;
  if (lastQuote) {
    const lastNumber = parseInt(lastQuote.quoteNumber.split('-').pop() || '0', 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};

// Método estático para verificar cotizaciones expiradas
QuoteSchema.statics.markExpired = async function() {
  const now = new Date();
  return await this.updateMany(
    {
      status: { $in: ['draft', 'sent'] },
      validUntil: { $lt: now },
    },
    { status: 'expired' }
  );
};

const Quote: Model<IQuote> =
  mongoose.models.Quote ||
  mongoose.model<IQuote>('Quote', QuoteSchema);

export default Quote;

// Status labels
export const QUOTE_STATUS_LABELS: Record<QuoteStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Borrador', color: '#6b7280', bg: 'bg-gray-100 dark:bg-gray-700' },
  sent: { label: 'Enviada', color: '#3b82f6', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  accepted: { label: 'Aceptada', color: '#10b981', bg: 'bg-green-100 dark:bg-green-900/30' },
  rejected: { label: 'Rechazada', color: '#ef4444', bg: 'bg-red-100 dark:bg-red-900/30' },
  expired: { label: 'Expirada', color: '#f59e0b', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
};

// Default terms
export const DEFAULT_QUOTE_TERMS = `
1. Esta cotización tiene validez por 30 días a partir de la fecha de emisión.
2. Los precios están expresados en la moneda indicada y no incluyen impuestos a menos que se especifique lo contrario.
3. Las condiciones de pago serán acordadas al momento de la aceptación.
4. Los tiempos de entrega serán confirmados una vez aceptada la cotización.
5. Esta cotización está sujeta a disponibilidad.
`.trim();
