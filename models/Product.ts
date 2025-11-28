import mongoose, { Schema, Model } from 'mongoose';

export interface IPricingTier {
  minQuantity: number;
  price: number;
}

export interface IProduct {
  _id: mongoose.Types.ObjectId;
  name: string;
  sku?: string;
  description?: string;
  price: number;
  currency: 'MXN' | 'USD' | 'EUR';
  category?: string;
  unit?: string;
  taxRate?: number;
  isActive: boolean;
  pricingTiers?: IPricingTier[];
  imageUrl?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PricingTierSchema = new Schema<IPricingTier>({
  minQuantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: false });

const ProductSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: [true, 'El nombre del producto es requerido'],
    trim: true,
    maxlength: [200, 'El nombre no puede exceder 200 caracteres'],
  },
  sku: {
    type: String,
    trim: true,
    maxlength: [50, 'El SKU no puede exceder 50 caracteres'],
    sparse: true,
    unique: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'La descripción no puede exceder 2000 caracteres'],
  },
  price: {
    type: Number,
    required: [true, 'El precio es requerido'],
    min: [0, 'El precio no puede ser negativo'],
  },
  currency: {
    type: String,
    required: true,
    default: 'MXN',
    enum: ['MXN', 'USD', 'EUR'],
  },
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'La categoría no puede exceder 100 caracteres'],
  },
  unit: {
    type: String,
    trim: true,
    maxlength: [50, 'La unidad no puede exceder 50 caracteres'],
    default: 'unidad',
  },
  taxRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 16, // IVA México
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  pricingTiers: {
    type: [PricingTierSchema],
    default: [],
  },
  imageUrl: {
    type: String,
    trim: true,
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
ProductSchema.index({ name: 'text', sku: 'text', description: 'text' });
ProductSchema.index({ category: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ price: 1 });

// Método para obtener precio según cantidad
ProductSchema.methods.getPriceForQuantity = function(quantity: number): number {
  if (!this.pricingTiers || this.pricingTiers.length === 0) {
    return this.price;
  }

  // Ordenar tiers de mayor a menor cantidad mínima
  const sortedTiers = [...this.pricingTiers].sort((a, b) => b.minQuantity - a.minQuantity);

  // Encontrar el tier aplicable
  for (const tier of sortedTiers) {
    if (quantity >= tier.minQuantity) {
      return tier.price;
    }
  }

  return this.price;
};

const Product: Model<IProduct> =
  mongoose.models.Product ||
  mongoose.model<IProduct>('Product', ProductSchema);

export default Product;

// Categorías sugeridas
export const PRODUCT_CATEGORIES = [
  'Software',
  'Hardware',
  'Servicios',
  'Consultoría',
  'Capacitación',
  'Mantenimiento',
  'Licencias',
  'Suscripción',
  'Otro',
];
