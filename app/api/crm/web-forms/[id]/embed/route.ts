import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import WebForm from '@/models/WebForm';
import mongoose from 'mongoose';

/**
 * GET /api/crm/web-forms/[id]/embed
 * Genera el código de embed para el formulario
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const form = await WebForm.findById(params.id).lean();

    if (!form) {
      return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 });
    }

    // Base URL del servidor
    const baseUrl = process.env.NEXTAUTH_URL || 'https://tu-dominio.com';

    // Código de embed - iframe
    const iframeEmbed = `<!-- Formulario Web: ${form.name} -->
<iframe
  src="${baseUrl}/embed/forms/${form.formKey}"
  width="100%"
  height="500"
  frameborder="0"
  style="border: none; max-width: 600px;"
  title="${form.name}"
></iframe>`;

    // Código de embed - JavaScript (widget)
    const jsEmbed = `<!-- Formulario Web: ${form.name} -->
<div id="orca-form-${form.formKey}"></div>
<script>
(function() {
  var script = document.createElement('script');
  script.src = '${baseUrl}/embed/forms/${form.formKey}/widget.js';
  script.async = true;
  script.setAttribute('data-form-key', '${form.formKey}');
  document.head.appendChild(script);
})();
</script>`;

    // Código de embed - Popup/Modal
    const popupEmbed = `<!-- Formulario Web (Popup): ${form.name} -->
<script>
(function() {
  var btn = document.createElement('button');
  btn.textContent = 'Contáctanos';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;background:${form.style?.primaryColor || '#3B82F6'};color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:bold;z-index:9999;';
  btn.onclick = function() {
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
    modal.innerHTML = '<div style="background:white;border-radius:12px;max-width:600px;width:90%;max-height:90vh;overflow:auto;position:relative;"><button onclick="this.parentElement.parentElement.remove()" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:24px;cursor:pointer;">&times;</button><iframe src="${baseUrl}/embed/forms/${form.formKey}" style="width:100%;height:500px;border:none;"></iframe></div>';
    document.body.appendChild(modal);
    modal.onclick = function(e) { if(e.target === modal) modal.remove(); };
  };
  document.body.appendChild(btn);
})();
</script>`;

    // URL directa del formulario
    const directUrl = `${baseUrl}/forms/${form.formKey}`;

    // API endpoint para submissions
    const apiEndpoint = `${baseUrl}/api/public/forms/${form.formKey}/submit`;

    return NextResponse.json({
      formKey: form.formKey,
      name: form.name,
      isPublished: form.isPublished,
      embedCodes: {
        iframe: iframeEmbed,
        javascript: jsEmbed,
        popup: popupEmbed,
      },
      urls: {
        direct: directUrl,
        api: apiEndpoint,
      },
      instructions: {
        iframe: 'Pega este código donde quieras mostrar el formulario. Ajusta el alto según necesites.',
        javascript: 'Este código carga el formulario como un widget. Se adapta automáticamente al contenedor.',
        popup: 'Este código agrega un botón flotante que abre el formulario en un modal.',
        api: 'Usa este endpoint para enviar submissions desde tu propio frontend (POST con JSON).',
      },
    });
  } catch (error: any) {
    console.error('Error generating embed code:', error);
    return NextResponse.json(
      { error: error.message || 'Error generando código de embed' },
      { status: 500 }
    );
  }
}
