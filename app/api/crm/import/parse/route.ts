import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

// Configuración de campos esperados para cada tipo
const FIELD_CONFIGS = {
  clients: {
    required: ['name'],
    optional: ['description', 'industry', 'website', 'phone', 'address', 'annualRevenue', 'employeeCount', 'source', 'tags'],
    labels: {
      name: 'Nombre',
      description: 'Descripción',
      industry: 'Industria',
      website: 'Sitio Web',
      phone: 'Teléfono',
      address: 'Dirección',
      annualRevenue: 'Ingresos Anuales',
      employeeCount: 'Número de Empleados',
      source: 'Fuente',
      tags: 'Etiquetas',
    },
  },
  contacts: {
    required: ['firstName', 'lastName', 'clientName'],
    optional: ['email', 'phone', 'position', 'department', 'linkedInUrl', 'tags'],
    labels: {
      firstName: 'Nombre',
      lastName: 'Apellido',
      clientName: 'Cliente',
      email: 'Email',
      phone: 'Teléfono',
      position: 'Cargo',
      department: 'Departamento',
      linkedInUrl: 'LinkedIn',
      tags: 'Etiquetas',
    },
  },
  deals: {
    required: ['title', 'clientName', 'value'],
    optional: ['contactName', 'stageName', 'currency', 'expectedCloseDate', 'probability', 'description', 'ownerEmail', 'tags'],
    labels: {
      title: 'Título',
      clientName: 'Cliente',
      contactName: 'Contacto',
      stageName: 'Etapa',
      value: 'Valor',
      currency: 'Moneda',
      expectedCloseDate: 'Fecha Cierre Esperado',
      probability: 'Probabilidad',
      description: 'Descripción',
      ownerEmail: 'Email Responsable',
      tags: 'Etiquetas',
    },
  },
  products: {
    required: ['name', 'price'],
    optional: ['sku', 'description', 'currency', 'category', 'unit', 'taxRate'],
    labels: {
      name: 'Nombre',
      sku: 'SKU',
      description: 'Descripción',
      price: 'Precio',
      currency: 'Moneda',
      category: 'Categoría',
      unit: 'Unidad',
      taxRate: 'Tasa IVA',
    },
  },
};

export type ImportType = keyof typeof FIELD_CONFIGS;

// POST - Parsear archivo y obtener columnas/preview
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
    const type = formData.get('type') as ImportType;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    if (!type || !FIELD_CONFIGS[type]) {
      return NextResponse.json({ error: 'Tipo de importación inválido' }, { status: 400 });
    }

    // Leer archivo
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    // Obtener primera hoja
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];

    // Convertir a JSON con encabezados
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as string[][];

    if (jsonData.length < 2) {
      return NextResponse.json(
        { error: 'El archivo debe tener al menos una fila de encabezados y una de datos' },
        { status: 400 }
      );
    }

    // Primera fila son los encabezados
    const headers = jsonData[0].map((h, i) => ({
      index: i,
      original: String(h || `Columna ${i + 1}`).trim(),
    }));

    // Filas de datos (preview de primeras 10)
    const previewRows = jsonData.slice(1, 11).map((row, rowIndex) => ({
      rowNumber: rowIndex + 2, // +2 porque excluimos header y es 1-indexed
      values: headers.map((_, i) => String(row[i] ?? '').trim()),
    }));

    // Total de filas de datos
    const totalRows = jsonData.length - 1;

    // Campos disponibles para mapeo
    const config = FIELD_CONFIGS[type];
    const labels = config.labels as Record<string, string>;
    const availableFields = [
      ...config.required.map(f => ({
        name: f,
        label: labels[f] || f,
        required: true,
      })),
      ...config.optional.map(f => ({
        name: f,
        label: labels[f] || f,
        required: false,
      })),
    ];

    // Sugerir mapeo automático basado en nombres similares
    const suggestedMapping: Record<string, number | null> = {};
    for (const field of availableFields) {
      const matchingHeader = headers.find(h => {
        const headerLower = h.original.toLowerCase();
        const fieldLower = field.name.toLowerCase();
        const labelLower = field.label.toLowerCase();
        return (
          headerLower === fieldLower ||
          headerLower === labelLower ||
          headerLower.includes(fieldLower) ||
          headerLower.includes(labelLower)
        );
      });
      suggestedMapping[field.name] = matchingHeader?.index ?? null;
    }

    return NextResponse.json({
      success: true,
      type,
      fileName: file.name,
      headers,
      previewRows,
      totalRows,
      availableFields,
      suggestedMapping,
    });
  } catch (error: any) {
    console.error('Error parsing import file:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
