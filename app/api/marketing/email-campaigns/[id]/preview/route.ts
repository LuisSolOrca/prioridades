import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailCampaign from '@/models/EmailCampaign';
import mongoose from 'mongoose';

// GET - Get campaign preview with sample data
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

    const { searchParams } = new URL(request.url);
    const variant = searchParams.get('variant');

    const campaign = await EmailCampaign.findById(params.id);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaña no encontrada' },
        { status: 404 }
      );
    }

    // Get the content to preview (from variant if A/B testing)
    let subject = campaign.subject;
    let preheader = campaign.preheader;
    let content = campaign.content;
    let fromName = campaign.fromName;
    let fromEmail = campaign.fromEmail;

    if (variant && campaign.abTest?.enabled) {
      const variantData = campaign.abTest.variants.find((v) => v.id === variant);
      if (variantData) {
        subject = variantData.subject || subject;
        content = variantData.content || content;
        fromName = variantData.fromName || fromName;
        fromEmail = variantData.fromEmail || fromEmail;
      }
    }

    // Sample data for variable replacement
    const sampleData = {
      'contact.firstName': 'María',
      'contact.lastName': 'García',
      'contact.email': 'maria@ejemplo.com',
      'contact.company': 'Empresa S.A.',
      'contact.phone': '+52 55 1234 5678',
      'contact.position': 'Directora de Marketing',
      'company.name': 'Tu Empresa',
      'company.website': 'https://tuempresa.com',
      'unsubscribe_url': '#unsubscribe',
      'view_in_browser_url': '#view-in-browser',
    };

    // Replace variables in subject
    let previewSubject = subject;
    for (const [key, value] of Object.entries(sampleData)) {
      previewSubject = previewSubject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    // Replace variables in HTML
    let html = content?.html || '';
    for (const [key, value] of Object.entries(sampleData)) {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    // Generate HTML if only JSON blocks exist
    if (!html && content?.json?.blocks) {
      html = generateHtmlFromBlocks(content.json.blocks, content.json.globalStyles);
      // Replace variables
      for (const [key, value] of Object.entries(sampleData)) {
        html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
    }

    return NextResponse.json({
      subject: previewSubject,
      preheader,
      fromName,
      fromEmail,
      html,
      json: content?.json,
    });
  } catch (error: any) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar preview' },
      { status: 500 }
    );
  }
}

// Helper function to generate HTML from blocks
function generateHtmlFromBlocks(blocks: any[], globalStyles: any): string {
  const { backgroundColor = '#f5f5f5', contentWidth = 600, fontFamily = 'Arial, sans-serif' } = globalStyles || {};

  let blocksHtml = blocks.map((block) => renderBlock(block)).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: ${fontFamily}; background-color: ${backgroundColor}; }
    .container { max-width: ${contentWidth}px; margin: 0 auto; background-color: #ffffff; }
    img { max-width: 100%; height: auto; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <div class="container">
    ${blocksHtml}
  </div>
</body>
</html>
  `.trim();
}

function renderBlock(block: any): string {
  const styles = block.styles || {};
  const styleStr = Object.entries(styles)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`)
    .join('; ');

  switch (block.type) {
    case 'text':
      return `<div style="${styleStr}">${block.content || ''}</div>`;

    case 'image':
      const imgContent = block.content || {};
      return `
        <div style="${styleStr}">
          ${imgContent.url ? `
            <a href="${imgContent.link || '#'}">
              <img src="${imgContent.url}" alt="${imgContent.alt || ''}" style="max-width: 100%;">
            </a>
          ` : ''}
        </div>
      `;

    case 'button':
      const btnContent = block.content || {};
      return `
        <div style="text-align: center; ${styleStr}">
          <a href="${btnContent.url || '#'}" style="
            display: inline-block;
            padding: 12px 24px;
            background-color: ${btnContent.backgroundColor || '#0066cc'};
            color: ${btnContent.color || '#ffffff'};
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
          ">${btnContent.text || 'Click aquí'}</a>
        </div>
      `;

    case 'divider':
      return `<hr style="border: none; border-top: 1px solid #e0e0e0; ${styleStr}">`;

    case 'spacer':
      const height = styles.height || '20px';
      return `<div style="height: ${height};"></div>`;

    case 'columns':
      const children = block.children || [];
      const colWidth = Math.floor(100 / children.length);
      return `
        <table width="100%" cellpadding="0" cellspacing="0" style="${styleStr}">
          <tr>
            ${children.map((col: any) => `
              <td width="${colWidth}%" valign="top" style="padding: 10px;">
                ${col.children ? col.children.map((b: any) => renderBlock(b)).join('') : ''}
              </td>
            `).join('')}
          </tr>
        </table>
      `;

    case 'html':
      return block.content || '';

    case 'social':
      const socialLinks = block.content?.links || [];
      return `
        <div style="text-align: center; ${styleStr}">
          ${socialLinks.map((link: any) => `
            <a href="${link.url}" style="margin: 0 8px;">
              <img src="${link.icon}" alt="${link.name}" width="32" height="32">
            </a>
          `).join('')}
        </div>
      `;

    default:
      return `<div style="${styleStr}">${JSON.stringify(block.content)}</div>`;
  }
}
