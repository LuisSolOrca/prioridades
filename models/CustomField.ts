import mongoose, { Schema, Model } from 'mongoose';

export type CustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'url' | 'email' | 'phone' | 'currency' | 'formula';
export type CustomFieldEntity = 'client' | 'contact' | 'deal' | 'product';

export interface ISelectOption {
  value: string;
  label: string;
  color?: string;
}

export interface ICustomField {
  _id: mongoose.Types.ObjectId;
  name: string;
  label: string;
  description?: string;
  fieldType: CustomFieldType;
  entityType: CustomFieldEntity;

  // Configuración según tipo
  options?: ISelectOption[]; // Para select/multiselect
  defaultValue?: any;
  placeholder?: string;

  // Validación
  required: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string; // Regex para validación

  // Formato de moneda
  currencyCode?: string; // MXN, USD, EUR

  // Configuración de fórmula (solo para fieldType: 'formula')
  formula?: string; // Fórmula usando hot-formula-parser, ej: "value * 0.05"
  referencedFields?: string[]; // Nombres de campos que usa la fórmula
  decimalPlaces?: number; // Decimales para el resultado (default: 2)
  formulaPrefix?: string; // Prefijo para mostrar, ej: "$"
  formulaSuffix?: string; // Sufijo para mostrar, ej: "%"

  // UI
  order: number;
  showInList: boolean; // Mostrar en listado
  showInCard: boolean; // Mostrar en tarjeta/detalle
  section?: string; // Agrupar campos en secciones

  // Metadata
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Fecha',
  boolean: 'Sí/No',
  select: 'Lista desplegable',
  multiselect: 'Selección múltiple',
  url: 'URL',
  email: 'Email',
  phone: 'Teléfono',
  currency: 'Moneda',
  formula: 'Fórmula calculada',
};

export const ENTITY_TYPE_LABELS: Record<CustomFieldEntity, string> = {
  client: 'Clientes',
  contact: 'Contactos',
  deal: 'Deals',
  product: 'Productos',
};

const SelectOptionSchema = new Schema<ISelectOption>({
  value: { type: String, required: true },
  label: { type: String, required: true },
  color: { type: String },
}, { _id: false });

const CustomFieldSchema = new Schema<ICustomField>({
  name: {
    type: String,
    required: true,
    trim: true,
    match: /^[a-zA-Z][a-zA-Z0-9_]*$/, // Debe empezar con letra, solo alfanumérico y underscore
  },
  label: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  fieldType: {
    type: String,
    enum: ['text', 'number', 'date', 'boolean', 'select', 'multiselect', 'url', 'email', 'phone', 'currency', 'formula'],
    required: true,
  },
  entityType: {
    type: String,
    enum: ['client', 'contact', 'deal', 'product'],
    required: true,
  },

  // Configuration
  options: {
    type: [SelectOptionSchema],
    default: undefined,
  },
  defaultValue: { type: Schema.Types.Mixed },
  placeholder: { type: String },

  // Validation
  required: { type: Boolean, default: false },
  minLength: { type: Number },
  maxLength: { type: Number },
  minValue: { type: Number },
  maxValue: { type: Number },
  pattern: { type: String },

  // Currency
  currencyCode: { type: String },

  // Formula configuration
  formula: { type: String, maxlength: 1000 },
  referencedFields: { type: [String], default: undefined },
  decimalPlaces: { type: Number, default: 2 },
  formulaPrefix: { type: String },
  formulaSuffix: { type: String },

  // UI
  order: { type: Number, default: 0 },
  showInList: { type: Boolean, default: false },
  showInCard: { type: Boolean, default: true },
  section: { type: String },

  // Metadata
  isActive: { type: Boolean, default: true },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Índices
CustomFieldSchema.index({ entityType: 1, isActive: 1, order: 1 });
CustomFieldSchema.index({ entityType: 1, name: 1 }, { unique: true }); // Nombre único por entidad

// Validar que select/multiselect tengan opciones y formula tenga fórmula
CustomFieldSchema.pre('save', function(next) {
  if (['select', 'multiselect'].includes(this.fieldType)) {
    if (!this.options || this.options.length === 0) {
      return next(new Error('Los campos de tipo lista requieren al menos una opción'));
    }
  }
  if (this.fieldType === 'formula') {
    if (!this.formula || this.formula.trim() === '') {
      return next(new Error('Los campos de tipo fórmula requieren una fórmula'));
    }
  }
  next();
});

// Método estático para obtener campos por entidad
CustomFieldSchema.statics.getFieldsForEntity = function(entityType: CustomFieldEntity) {
  return this.find({ entityType, isActive: true }).sort({ order: 1 });
};

// Método para validar un valor según el campo
CustomFieldSchema.methods.validateValue = function(value: any): { valid: boolean; error?: string } {
  // Si es requerido y está vacío
  if (this.required && (value === null || value === undefined || value === '')) {
    return { valid: false, error: `${this.label} es requerido` };
  }

  // Si no tiene valor y no es requerido, es válido
  if (value === null || value === undefined || value === '') {
    return { valid: true };
  }

  switch (this.fieldType) {
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
      if (typeof value !== 'string') {
        return { valid: false, error: `${this.label} debe ser texto` };
      }
      if (this.minLength && value.length < this.minLength) {
        return { valid: false, error: `${this.label} debe tener al menos ${this.minLength} caracteres` };
      }
      if (this.maxLength && value.length > this.maxLength) {
        return { valid: false, error: `${this.label} no puede exceder ${this.maxLength} caracteres` };
      }
      if (this.pattern && !new RegExp(this.pattern).test(value)) {
        return { valid: false, error: `${this.label} no tiene el formato correcto` };
      }
      break;

    case 'number':
    case 'currency':
      const num = Number(value);
      if (isNaN(num)) {
        return { valid: false, error: `${this.label} debe ser un número` };
      }
      if (this.minValue !== undefined && num < this.minValue) {
        return { valid: false, error: `${this.label} debe ser mayor o igual a ${this.minValue}` };
      }
      if (this.maxValue !== undefined && num > this.maxValue) {
        return { valid: false, error: `${this.label} debe ser menor o igual a ${this.maxValue}` };
      }
      break;

    case 'date':
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { valid: false, error: `${this.label} debe ser una fecha válida` };
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return { valid: false, error: `${this.label} debe ser verdadero o falso` };
      }
      break;

    case 'select':
      if (this.options) {
        const validValues = this.options.map((o: ISelectOption) => o.value);
        if (!validValues.includes(value)) {
          return { valid: false, error: `${this.label} tiene un valor no válido` };
        }
      }
      break;

    case 'multiselect':
      if (!Array.isArray(value)) {
        return { valid: false, error: `${this.label} debe ser una lista de valores` };
      }
      if (this.options) {
        const validValues = this.options.map((o: ISelectOption) => o.value);
        for (const v of value) {
          if (!validValues.includes(v)) {
            return { valid: false, error: `${this.label} contiene valores no válidos` };
          }
        }
      }
      break;

    case 'formula':
      // Los campos de fórmula son calculados automáticamente, siempre válidos
      // El valor se calcula en runtime, no se valida el input
      break;
  }

  return { valid: true };
};

const CustomField: Model<ICustomField> =
  mongoose.models.CustomField ||
  mongoose.model<ICustomField>('CustomField', CustomFieldSchema);

export default CustomField;
