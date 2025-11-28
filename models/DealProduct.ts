import mongoose, { Schema, Model } from 'mongoose';

export interface IDealProduct {
  _id: mongoose.Types.ObjectId;
  dealId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  productName: string;      // Snapshot del nombre
  productSku?: string;      // Snapshot del SKU
  quantity: number;
  unitPrice: number;        // Puede ser diferente al precio base
  discount: number;         // Porcentaje (0-100)
  taxRate: number;          // Porcentaje de impuesto
  subtotal: number;         // quantity * unitPrice
  discountAmount: number;   // subtotal * (discount/100)
  taxAmount: number;        // (subtotal - discountAmount) * (taxRate/100)
  total: number;            // subtotal - discountAmount + taxAmount
  notes?: string;
  order: number;            // Orden en la lista
  createdAt: Date;
  updatedAt: Date;
}

const DealProductSchema = new Schema<IDealProduct>({
  dealId: {
    type: Schema.Types.ObjectId,
    ref: 'Deal',
    required: [true, 'El deal es requerido'],
    index: true,
  },
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'El producto es requerido'],
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
  quantity: {
    type: Number,
    required: [true, 'La cantidad es requerida'],
    min: [0.01, 'La cantidad debe ser mayor a 0'],
    default: 1,
  },
  unitPrice: {
    type: Number,
    required: [true, 'El precio unitario es requerido'],
    min: [0, 'El precio no puede ser negativo'],
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
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  discountAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  taxAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Las notas no pueden exceder 500 caracteres'],
  },
  order: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Índices
DealProductSchema.index({ dealId: 1, order: 1 });

// Pre-save hook para calcular totales
DealProductSchema.pre('save', function(next) {
  this.subtotal = this.quantity * this.unitPrice;
  this.discountAmount = this.subtotal * (this.discount / 100);
  const afterDiscount = this.subtotal - this.discountAmount;
  this.taxAmount = afterDiscount * (this.taxRate / 100);
  this.total = afterDiscount + this.taxAmount;
  next();
});

// Método estático para calcular totales del deal
DealProductSchema.statics.calculateDealTotals = async function(dealId: mongoose.Types.ObjectId) {
  const result = await this.aggregate([
    { $match: { dealId } },
    {
      $group: {
        _id: null,
        subtotal: { $sum: '$subtotal' },
        discountAmount: { $sum: '$discountAmount' },
        taxAmount: { $sum: '$taxAmount' },
        total: { $sum: '$total' },
        itemCount: { $sum: 1 },
      },
    },
  ]);

  return result[0] || { subtotal: 0, discountAmount: 0, taxAmount: 0, total: 0, itemCount: 0 };
};

const DealProduct: Model<IDealProduct> =
  mongoose.models.DealProduct ||
  mongoose.model<IDealProduct>('DealProduct', DealProductSchema);

export default DealProduct;
