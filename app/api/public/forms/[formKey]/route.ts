import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WebForm, { IWebForm } from '@/models/WebForm';

/**
 * GET /api/public/forms/[formKey]
 * Obtiene la configuración pública del formulario (sin autenticación)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { formKey: string } }
) {
  try {
    await connectDB();

    const form = await WebForm.findOne({
      formKey: params.formKey,
      isActive: true,
      isPublished: true,
    }).lean() as IWebForm | null;

    if (!form) {
      return NextResponse.json(
        { error: 'Formulario no encontrado o no publicado' },
        { status: 404 }
      );
    }

    // Verificar dominio permitido si hay restricciones
    const origin = request.headers.get('origin') || request.headers.get('referer');
    if (form.allowedDomains && form.allowedDomains.length > 0 && origin) {
      const originHost = new URL(origin).hostname;
      const isAllowed = form.allowedDomains.some((domain: string) => {
        if (domain.startsWith('*.')) {
          return originHost.endsWith(domain.slice(1));
        }
        return originHost === domain;
      });

      if (!isAllowed) {
        return NextResponse.json(
          { error: 'Dominio no permitido' },
          { status: 403 }
        );
      }
    }

    // Devolver solo los campos necesarios para renderizar el formulario
    const publicForm = {
      formKey: form.formKey,
      name: form.name,
      description: form.description,
      fields: form.fields.map((field: any) => ({
        id: field.id,
        name: field.name,
        label: field.label,
        type: field.type,
        required: field.required,
        placeholder: field.placeholder,
        options: field.options,
        order: field.order,
        width: field.width,
        validation: field.validation,
      })),
      style: form.style,
      logoUrl: form.logoUrl,
      submitButtonText: form.submitButtonText,
      showPoweredBy: form.showPoweredBy,
      captchaEnabled: form.captchaEnabled,
    };

    // Headers CORS
    const response = NextResponse.json(publicForm);
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;
  } catch (error: any) {
    console.error('Error fetching public form:', error);
    return NextResponse.json(
      { error: 'Error obteniendo formulario' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/public/forms/[formKey]
 * CORS preflight
 */
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}
