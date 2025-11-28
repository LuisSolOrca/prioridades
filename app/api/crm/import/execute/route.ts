import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import Contact from '@/models/Contact';
import Deal from '@/models/Deal';
import Product from '@/models/Product';
import PipelineStage from '@/models/PipelineStage';
import User from '@/models/User';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

interface ImportResult {
  success: boolean;
  totalProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; error: string }[];
}

// POST - Ejecutar importación
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
    const updateExisting = formData.get('updateExisting') === 'true';

    if (!file || !type || !mappingJson) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const mapping: Record<string, number | null> = JSON.parse(mappingJson);

    // Leer archivo
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as string[][];

    const dataRows = jsonData.slice(1);

    await connectDB();

    // Cargar datos de referencia
    const clientsMap = new Map<string, string>();
    const clients = await Client.find({}).select('name _id').lean();
    clients.forEach(c => clientsMap.set(c.name.toLowerCase(), c._id.toString()));

    const stagesMap = new Map<string, string>();
    const stages = await PipelineStage.find({ isActive: true }).select('name _id').lean();
    stages.forEach(s => stagesMap.set(s.name.toLowerCase(), s._id.toString()));

    const usersMap = new Map<string, string>();
    const users = await User.find({ isActive: true }).select('email _id').lean();
    users.forEach(u => usersMap.set(u.email.toLowerCase(), u._id.toString()));

    const productsMap = new Map<string, string>();
    const products = await Product.find({}).select('sku _id').lean();
    products.forEach(p => {
      if (p.sku) productsMap.set(p.sku.toLowerCase(), p._id.toString());
    });

    // Obtener primera etapa si existe
    const firstStage = await PipelineStage.findOne({ isActive: true }).sort({ order: 1 }).lean();

    const result: ImportResult = {
      success: true,
      totalProcessed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Procesar cada fila
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2;

      try {
        // Extraer valores según mapeo
        const rowData: Record<string, any> = {};
        for (const [field, colIndex] of Object.entries(mapping)) {
          if (colIndex !== null && colIndex !== undefined) {
            rowData[field] = String(row[colIndex] ?? '').trim();
          }
        }

        // Saltar filas vacías
        const hasData = Object.values(rowData).some(v => v && v !== '');
        if (!hasData) {
          result.skipped++;
          continue;
        }

        result.totalProcessed++;

        switch (type) {
          case 'clients':
            await importClient(rowData, rowNumber, result, session.user.id, clientsMap, updateExisting);
            break;
          case 'contacts':
            await importContact(rowData, rowNumber, result, session.user.id, clientsMap, updateExisting);
            break;
          case 'deals':
            await importDeal(rowData, rowNumber, result, session.user.id, clientsMap, stagesMap, usersMap, firstStage?._id.toString(), updateExisting);
            break;
          case 'products':
            await importProduct(rowData, rowNumber, result, session.user.id, productsMap, updateExisting);
            break;
        }
      } catch (error: any) {
        result.errors.push({ row: rowNumber, error: error.message });
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error executing import:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Funciones de importación por tipo
async function importClient(
  data: Record<string, any>,
  row: number,
  result: ImportResult,
  userId: string,
  clientsMap: Map<string, string>,
  updateExisting: boolean
) {
  if (!data.name) {
    result.errors.push({ row, error: 'Nombre requerido' });
    return;
  }

  const existingId = clientsMap.get(data.name.toLowerCase());

  const clientData = {
    name: data.name,
    description: data.description || undefined,
    industry: data.industry || undefined,
    website: data.website || undefined,
    phone: data.phone || undefined,
    address: data.address || undefined,
    annualRevenue: data.annualRevenue ? Number(data.annualRevenue) : undefined,
    employeeCount: data.employeeCount ? Number(data.employeeCount) : undefined,
    source: data.source || undefined,
    tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    isActive: true,
  };

  if (existingId && updateExisting) {
    await Client.findByIdAndUpdate(existingId, clientData);
    result.updated++;
  } else if (!existingId) {
    const newClient = await Client.create(clientData);
    clientsMap.set(data.name.toLowerCase(), newClient._id.toString());
    result.created++;
  } else {
    result.skipped++;
  }
}

async function importContact(
  data: Record<string, any>,
  row: number,
  result: ImportResult,
  userId: string,
  clientsMap: Map<string, string>,
  updateExisting: boolean
) {
  if (!data.firstName || !data.lastName || !data.clientName) {
    result.errors.push({ row, error: 'Nombre, apellido y cliente son requeridos' });
    return;
  }

  const clientId = clientsMap.get(data.clientName.toLowerCase());
  if (!clientId) {
    result.errors.push({ row, error: `Cliente "${data.clientName}" no encontrado` });
    return;
  }

  // Buscar contacto existente por email o nombre completo
  let existingContact = null;
  if (data.email) {
    existingContact = await Contact.findOne({ email: data.email.toLowerCase() });
  }
  if (!existingContact) {
    existingContact = await Contact.findOne({
      clientId,
      firstName: data.firstName,
      lastName: data.lastName,
    });
  }

  const contactData = {
    clientId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email?.toLowerCase() || undefined,
    phone: data.phone || undefined,
    position: data.position || undefined,
    department: data.department || undefined,
    linkedInUrl: data.linkedInUrl || undefined,
    tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    isActive: true,
    createdBy: userId,
  };

  if (existingContact && updateExisting) {
    await Contact.findByIdAndUpdate(existingContact._id, contactData);
    result.updated++;
  } else if (!existingContact) {
    await Contact.create(contactData);
    result.created++;
  } else {
    result.skipped++;
  }
}

async function importDeal(
  data: Record<string, any>,
  row: number,
  result: ImportResult,
  userId: string,
  clientsMap: Map<string, string>,
  stagesMap: Map<string, string>,
  usersMap: Map<string, string>,
  defaultStageId: string | undefined,
  updateExisting: boolean
) {
  if (!data.title || !data.clientName || !data.value) {
    result.errors.push({ row, error: 'Título, cliente y valor son requeridos' });
    return;
  }

  const clientId = clientsMap.get(data.clientName.toLowerCase());
  if (!clientId) {
    result.errors.push({ row, error: `Cliente "${data.clientName}" no encontrado` });
    return;
  }

  // Determinar etapa
  let stageId = defaultStageId;
  if (data.stageName) {
    const foundStage = stagesMap.get(data.stageName.toLowerCase());
    if (foundStage) stageId = foundStage;
  }
  if (!stageId) {
    result.errors.push({ row, error: 'No hay etapa válida para el deal' });
    return;
  }

  // Determinar responsable
  let ownerId = userId;
  if (data.ownerEmail) {
    const foundUser = usersMap.get(data.ownerEmail.toLowerCase());
    if (foundUser) ownerId = foundUser;
  }

  // Buscar contacto si se proporciona
  let contactId = undefined;
  if (data.contactName) {
    const nameParts = data.contactName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;
    const contact = await Contact.findOne({
      clientId,
      $or: [
        { firstName: new RegExp(firstName, 'i') },
        { lastName: new RegExp(lastName, 'i') },
      ],
    });
    if (contact) contactId = contact._id.toString();
  }

  const dealData = {
    title: data.title,
    clientId,
    contactId,
    stageId,
    value: Number(data.value),
    currency: data.currency?.toUpperCase() || 'MXN',
    expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
    probability: data.probability ? Number(data.probability) : undefined,
    description: data.description || undefined,
    ownerId,
    tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    createdBy: userId,
  };

  // Buscar deal existente por título y cliente
  const existingDeal = await Deal.findOne({ title: data.title, clientId });

  if (existingDeal && updateExisting) {
    await Deal.findByIdAndUpdate(existingDeal._id, dealData);
    result.updated++;
  } else if (!existingDeal) {
    await Deal.create(dealData);
    result.created++;
  } else {
    result.skipped++;
  }
}

async function importProduct(
  data: Record<string, any>,
  row: number,
  result: ImportResult,
  userId: string,
  productsMap: Map<string, string>,
  updateExisting: boolean
) {
  if (!data.name || !data.price) {
    result.errors.push({ row, error: 'Nombre y precio son requeridos' });
    return;
  }

  // Buscar producto existente por SKU o nombre
  let existingProduct = null;
  if (data.sku) {
    const existingId = productsMap.get(data.sku.toLowerCase());
    if (existingId) {
      existingProduct = await Product.findById(existingId);
    }
  }
  if (!existingProduct) {
    existingProduct = await Product.findOne({ name: data.name });
  }

  const productData = {
    name: data.name,
    sku: data.sku || undefined,
    description: data.description || undefined,
    price: Number(data.price),
    currency: data.currency?.toUpperCase() || 'MXN',
    category: data.category || undefined,
    unit: data.unit || 'unidad',
    taxRate: data.taxRate ? Number(data.taxRate) : 16,
    isActive: true,
    createdBy: userId,
  };

  if (existingProduct && updateExisting) {
    await Product.findByIdAndUpdate(existingProduct._id, productData);
    result.updated++;
  } else if (!existingProduct) {
    const newProduct = await Product.create(productData);
    if (data.sku) {
      productsMap.set(data.sku.toLowerCase(), newProduct._id.toString());
    }
    result.created++;
  } else {
    result.skipped++;
  }
}
