import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import Contact from '@/models/Contact';
import Product from '@/models/Product';
import PipelineStage from '@/models/PipelineStage';
import User from '@/models/User';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

// Tipos de validación
interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: string;
}

interface ValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ValidationError[];
  warnings: string[];
  previewData: Record<string, any>[];
}

// POST - Validar datos mapeados
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasPermission(session, 'canManagePipelineStages')) {
      return NextResponse.json({ error: 'Sin permiso para importar datos' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const mappingJson = formData.get('mapping') as string;

    if (!file || !type || !mappingJson) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const mapping: Record<string, number | null> = JSON.parse(mappingJson);

    // Leer archivo
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as string[][];

    const dataRows = jsonData.slice(1); // Excluir header

    await connectDB();

    // Cargar datos de referencia según el tipo
    let existingClients: Map<string, string> = new Map();
    let existingProducts: Map<string, string> = new Map();
    let existingStages: Map<string, string> = new Map();
    let existingUsers: Map<string, string> = new Map();

    if (type === 'contacts' || type === 'deals') {
      const clients = await Client.find({ isActive: true }).select('name _id').lean();
      clients.forEach(c => existingClients.set(c.name.toLowerCase(), c._id.toString()));
    }

    if (type === 'deals') {
      const stages = await PipelineStage.find({ isActive: true }).select('name _id').lean();
      stages.forEach(s => existingStages.set(s.name.toLowerCase(), s._id.toString()));

      const users = await User.find({ isActive: true }).select('email _id').lean();
      users.forEach(u => existingUsers.set(u.email.toLowerCase(), u._id.toString()));
    }

    if (type === 'products') {
      const products = await Product.find({}).select('sku _id').lean();
      products.forEach(p => {
        if (p.sku) existingProducts.set(p.sku.toLowerCase(), p._id.toString());
      });
    }

    if (type === 'clients') {
      const clients = await Client.find({}).select('name _id').lean();
      clients.forEach(c => existingClients.set(c.name.toLowerCase(), c._id.toString()));
    }

    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const previewData: Record<string, any>[] = [];

    // Validar cada fila
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // +2 por header y 1-indexed
      const rowData: Record<string, any> = {};

      // Extraer valores según mapeo
      for (const [field, colIndex] of Object.entries(mapping)) {
        if (colIndex !== null && colIndex !== undefined) {
          rowData[field] = String(row[colIndex] ?? '').trim();
        }
      }

      // Validaciones específicas por tipo
      switch (type) {
        case 'clients':
          validateClient(rowData, rowNumber, errors, existingClients, warnings);
          break;
        case 'contacts':
          validateContact(rowData, rowNumber, errors, existingClients);
          break;
        case 'deals':
          validateDeal(rowData, rowNumber, errors, existingClients, existingStages, existingUsers);
          break;
        case 'products':
          validateProduct(rowData, rowNumber, errors, existingProducts, warnings);
          break;
      }

      // Solo añadir a preview si no hay errores críticos en esta fila
      const rowErrors = errors.filter(e => e.row === rowNumber);
      if (rowErrors.length === 0) {
        previewData.push({ _rowNumber: rowNumber, ...rowData });
      }
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      totalRows: dataRows.length,
      validRows: previewData.length,
      invalidRows: dataRows.length - previewData.length,
      errors: errors.slice(0, 100), // Limitar errores mostrados
      warnings,
      previewData: previewData.slice(0, 20), // Preview de primeras 20 filas válidas
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error validating import:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Funciones de validación por tipo
function validateClient(
  data: Record<string, any>,
  row: number,
  errors: ValidationError[],
  existingClients: Map<string, string>,
  warnings: string[]
) {
  // Campo requerido: name
  if (!data.name) {
    errors.push({ row, field: 'name', message: 'El nombre es requerido', value: '' });
  } else if (existingClients.has(data.name.toLowerCase())) {
    warnings.push(`Fila ${row}: El cliente "${data.name}" ya existe y será actualizado`);
  }

  // Validar campos numéricos
  if (data.annualRevenue && isNaN(Number(data.annualRevenue))) {
    errors.push({ row, field: 'annualRevenue', message: 'Debe ser un número', value: data.annualRevenue });
  }
  if (data.employeeCount && isNaN(Number(data.employeeCount))) {
    errors.push({ row, field: 'employeeCount', message: 'Debe ser un número', value: data.employeeCount });
  }

  // Validar URL
  if (data.website && !isValidUrl(data.website)) {
    errors.push({ row, field: 'website', message: 'URL inválida', value: data.website });
  }
}

function validateContact(
  data: Record<string, any>,
  row: number,
  errors: ValidationError[],
  existingClients: Map<string, string>
) {
  // Campos requeridos
  if (!data.firstName) {
    errors.push({ row, field: 'firstName', message: 'El nombre es requerido', value: '' });
  }
  if (!data.lastName) {
    errors.push({ row, field: 'lastName', message: 'El apellido es requerido', value: '' });
  }
  if (!data.clientName) {
    errors.push({ row, field: 'clientName', message: 'El cliente es requerido', value: '' });
  } else if (!existingClients.has(data.clientName.toLowerCase())) {
    errors.push({ row, field: 'clientName', message: 'El cliente no existe', value: data.clientName });
  }

  // Validar email
  if (data.email && !isValidEmail(data.email)) {
    errors.push({ row, field: 'email', message: 'Email inválido', value: data.email });
  }

  // Validar LinkedIn URL
  if (data.linkedInUrl && !data.linkedInUrl.includes('linkedin.com')) {
    errors.push({ row, field: 'linkedInUrl', message: 'URL de LinkedIn inválida', value: data.linkedInUrl });
  }
}

function validateDeal(
  data: Record<string, any>,
  row: number,
  errors: ValidationError[],
  existingClients: Map<string, string>,
  existingStages: Map<string, string>,
  existingUsers: Map<string, string>
) {
  // Campos requeridos
  if (!data.title) {
    errors.push({ row, field: 'title', message: 'El título es requerido', value: '' });
  }
  if (!data.clientName) {
    errors.push({ row, field: 'clientName', message: 'El cliente es requerido', value: '' });
  } else if (!existingClients.has(data.clientName.toLowerCase())) {
    errors.push({ row, field: 'clientName', message: 'El cliente no existe', value: data.clientName });
  }
  if (!data.value) {
    errors.push({ row, field: 'value', message: 'El valor es requerido', value: '' });
  } else if (isNaN(Number(data.value)) || Number(data.value) < 0) {
    errors.push({ row, field: 'value', message: 'El valor debe ser un número positivo', value: data.value });
  }

  // Validar etapa si se proporciona
  if (data.stageName && !existingStages.has(data.stageName.toLowerCase())) {
    errors.push({ row, field: 'stageName', message: 'La etapa no existe', value: data.stageName });
  }

  // Validar responsable si se proporciona
  if (data.ownerEmail && !existingUsers.has(data.ownerEmail.toLowerCase())) {
    errors.push({ row, field: 'ownerEmail', message: 'El usuario responsable no existe', value: data.ownerEmail });
  }

  // Validar moneda
  if (data.currency && !['MXN', 'USD', 'EUR'].includes(data.currency.toUpperCase())) {
    errors.push({ row, field: 'currency', message: 'Moneda inválida (MXN, USD, EUR)', value: data.currency });
  }

  // Validar probabilidad
  if (data.probability) {
    const prob = Number(data.probability);
    if (isNaN(prob) || prob < 0 || prob > 100) {
      errors.push({ row, field: 'probability', message: 'Probabilidad debe ser 0-100', value: data.probability });
    }
  }

  // Validar fecha
  if (data.expectedCloseDate && !isValidDate(data.expectedCloseDate)) {
    errors.push({ row, field: 'expectedCloseDate', message: 'Fecha inválida', value: data.expectedCloseDate });
  }
}

function validateProduct(
  data: Record<string, any>,
  row: number,
  errors: ValidationError[],
  existingProducts: Map<string, string>,
  warnings: string[]
) {
  // Campos requeridos
  if (!data.name) {
    errors.push({ row, field: 'name', message: 'El nombre es requerido', value: '' });
  }
  if (!data.price) {
    errors.push({ row, field: 'price', message: 'El precio es requerido', value: '' });
  } else if (isNaN(Number(data.price)) || Number(data.price) < 0) {
    errors.push({ row, field: 'price', message: 'El precio debe ser un número positivo', value: data.price });
  }

  // SKU duplicado
  if (data.sku && existingProducts.has(data.sku.toLowerCase())) {
    warnings.push(`Fila ${row}: El SKU "${data.sku}" ya existe y el producto será actualizado`);
  }

  // Validar moneda
  if (data.currency && !['MXN', 'USD', 'EUR'].includes(data.currency.toUpperCase())) {
    errors.push({ row, field: 'currency', message: 'Moneda inválida (MXN, USD, EUR)', value: data.currency });
  }

  // Validar tasa de impuesto
  if (data.taxRate) {
    const tax = Number(data.taxRate);
    if (isNaN(tax) || tax < 0 || tax > 100) {
      errors.push({ row, field: 'taxRate', message: 'Tasa IVA debe ser 0-100', value: data.taxRate });
    }
  }
}

// Utilidades
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return true;
  } catch {
    return false;
  }
}

function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}
