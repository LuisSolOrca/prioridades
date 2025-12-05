/**
 * Email Block Renderer
 * Converts block-based email templates to HTML for sending
 */

export interface IEmailBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'columns' | 'html' | 'social' | 'video' | 'menu';
  content: any;
  styles?: Record<string, any>;
  children?: IEmailBlock[];
}

export interface IGlobalStyles {
  backgroundColor?: string;
  contentWidth?: number;
  fontFamily?: string;
  textColor?: string;
  linkColor?: string;
}

/**
 * Render a single block to HTML
 */
function renderBlock(block: IEmailBlock, globalStyles: IGlobalStyles): string {
  const baseStyles = {
    fontFamily: globalStyles.fontFamily || 'Arial, sans-serif',
    color: globalStyles.textColor || '#333333',
  };

  // Combine block styles with defaults
  const blockStyles = { ...baseStyles, ...(block.styles || {}) };
  const styleString = Object.entries(blockStyles)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${kebabCase(k)}: ${v}`)
    .join('; ');

  switch (block.type) {
    case 'text': {
      const content = getTextContent(block.content);
      return `<div style="${styleString}">${content}</div>`;
    }

    case 'image': {
      const src = block.content?.src || '';
      const alt = block.content?.alt || '';
      const width = block.content?.width || '100%';
      const align = block.styles?.textAlign || 'center';
      if (!src) return '';
      return `
        <div style="text-align: ${align}; ${styleString}">
          <img src="${src}" alt="${alt}" style="max-width: 100%; width: ${width}; height: auto; display: inline-block;" />
        </div>
      `;
    }

    case 'button': {
      const text = block.content?.text || 'Click here';
      const url = block.content?.url || '#';
      const bgColor = block.content?.backgroundColor || '#10B981';
      const textColor = block.content?.color || '#ffffff';
      const borderRadius = block.content?.borderRadius || '8px';
      const align = block.styles?.textAlign || 'center';
      const padding = block.content?.padding || '12px 24px';

      return `
        <div style="text-align: ${align}; padding: 10px 0; ${styleString}">
          <a href="${url}" style="display: inline-block; padding: ${padding}; background-color: ${bgColor}; color: ${textColor}; text-decoration: none; border-radius: ${borderRadius}; font-weight: 600; font-family: ${baseStyles.fontFamily};">
            ${text}
          </a>
        </div>
      `;
    }

    case 'divider': {
      const color = block.content?.color || '#e5e7eb';
      const thickness = block.content?.thickness || '1px';
      const margin = block.content?.margin || '16px 0';
      return `<hr style="border: none; border-top: ${thickness} solid ${color}; margin: ${margin};" />`;
    }

    case 'spacer': {
      const height = block.content?.height || 20;
      return `<div style="height: ${height}px; line-height: ${height}px;">&nbsp;</div>`;
    }

    case 'columns': {
      const columns = block.children || [];
      const columnCount = columns.length || 2;
      const columnWidth = Math.floor(100 / columnCount);
      const gap = block.content?.gap || '20px';

      const columnsHtml = columns.map((col, idx) => {
        const colContent = col.children?.map(child => renderBlock(child, globalStyles)).join('') || '';
        const isLast = idx === columns.length - 1;
        return `
          <td style="width: ${columnWidth}%; vertical-align: top; ${!isLast ? `padding-right: ${gap};` : ''}">
            ${colContent}
          </td>
        `;
      }).join('');

      return `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="${styleString}">
          <tr>
            ${columnsHtml}
          </tr>
        </table>
      `;
    }

    case 'html': {
      const htmlContent = block.content?.html || block.content || '';
      return `<div style="${styleString}">${htmlContent}</div>`;
    }

    case 'social': {
      const networks = block.content?.networks || [];
      const align = block.styles?.textAlign || 'center';
      const iconSize = block.content?.iconSize || '32px';

      const socialIcons: Record<string, { icon: string; color: string }> = {
        facebook: { icon: 'f', color: '#1877F2' },
        twitter: { icon: 'x', color: '#000000' },
        linkedin: { icon: 'in', color: '#0A66C2' },
        instagram: { icon: 'ig', color: '#E4405F' },
        youtube: { icon: 'yt', color: '#FF0000' },
        whatsapp: { icon: 'wa', color: '#25D366' },
      };

      const iconsHtml = networks.map((network: { type: string; url: string }) => {
        const social = socialIcons[network.type] || { icon: '?', color: '#666' };
        return `
          <a href="${network.url}" style="display: inline-block; margin: 0 8px; text-decoration: none;">
            <div style="width: ${iconSize}; height: ${iconSize}; background-color: ${social.color}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">
              ${social.icon}
            </div>
          </a>
        `;
      }).join('');

      return `<div style="text-align: ${align}; padding: 10px 0; ${styleString}">${iconsHtml}</div>`;
    }

    case 'video': {
      const thumbnailUrl = block.content?.thumbnailUrl || '';
      const videoUrl = block.content?.videoUrl || block.content?.url || '#';
      const alt = block.content?.alt || 'Watch video';
      const align = block.styles?.textAlign || 'center';

      if (!thumbnailUrl) {
        return `
          <div style="text-align: ${align}; padding: 10px 0; ${styleString}">
            <a href="${videoUrl}" style="display: inline-block; padding: 12px 24px; background-color: #EF4444; color: white; text-decoration: none; border-radius: 8px;">
              ▶ ${alt}
            </a>
          </div>
        `;
      }

      return `
        <div style="text-align: ${align}; ${styleString}">
          <a href="${videoUrl}">
            <img src="${thumbnailUrl}" alt="${alt}" style="max-width: 100%; height: auto; display: inline-block;" />
          </a>
        </div>
      `;
    }

    case 'menu': {
      const items = block.content?.items || [];
      const align = block.styles?.textAlign || 'center';
      const separator = block.content?.separator || ' | ';
      const linkColor = globalStyles.linkColor || '#3B82F6';

      const menuHtml = items.map((item: { text: string; url: string }, idx: number) => {
        const sep = idx < items.length - 1 ? `<span style="color: #999;">${separator}</span>` : '';
        return `<a href="${item.url}" style="color: ${linkColor}; text-decoration: none;">${item.text}</a>${sep}`;
      }).join(' ');

      return `<div style="text-align: ${align}; padding: 10px 0; font-size: 14px; ${styleString}">${menuHtml}</div>`;
    }

    default:
      return '';
  }
}

/**
 * Extract text content from various content formats
 */
function getTextContent(content: any): string {
  if (typeof content === 'string') return content;
  if (content === null || content === undefined) return '';
  if (typeof content === 'object') {
    if (content.html) return content.html;
    if (content.text) return content.text;
    return '';
  }
  return String(content);
}

/**
 * Convert camelCase to kebab-case for CSS properties
 */
function kebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Render email blocks to complete HTML email
 */
export function renderEmailBlocksToHtml(
  blocks: IEmailBlock[],
  globalStyles: IGlobalStyles = {}
): string {
  const {
    backgroundColor = '#f5f5f5',
    contentWidth = 600,
    fontFamily = 'Arial, sans-serif',
    textColor = '#333333',
    linkColor = '#3B82F6',
  } = globalStyles;

  const blocksHtml = blocks
    .map(block => renderBlock(block, { backgroundColor, contentWidth, fontFamily, textColor, linkColor }))
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    td { padding: 0; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${backgroundColor}; font-family: ${fontFamily}; color: ${textColor};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${backgroundColor};">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table width="${contentWidth}" cellpadding="0" cellspacing="0" border="0" style="max-width: ${contentWidth}px; width: 100%; background-color: #ffffff;">
          <tr>
            <td style="padding: 20px;">
              ${blocksHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Wrap content in a complete HTML email structure
 * This ensures the tracking pixel can be properly inserted before </body>
 */
function wrapInEmailStructure(content: string, globalStyles: IGlobalStyles = {}): string {
  const {
    backgroundColor = '#f5f5f5',
    contentWidth = 600,
    fontFamily = 'Arial, sans-serif',
    textColor = '#333333',
  } = globalStyles;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${backgroundColor}; font-family: ${fontFamily}; color: ${textColor};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${backgroundColor};">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table width="${contentWidth}" cellpadding="0" cellspacing="0" border="0" style="max-width: ${contentWidth}px; width: 100%; background-color: #ffffff;">
          <tr>
            <td style="padding: 20px;">
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Get email body HTML from template (handles both legacy and block-based templates)
 * Always returns a complete HTML document with </body> for proper tracking pixel insertion
 */
export function getTemplateBodyHtml(template: {
  body?: string;
  blocks?: IEmailBlock[];
  globalStyles?: IGlobalStyles;
}): string {
  // If template has blocks, render them to HTML
  if (template.blocks && Array.isArray(template.blocks) && template.blocks.length > 0) {
    return renderEmailBlocksToHtml(template.blocks, template.globalStyles);
  }

  // Otherwise, use legacy body
  const body = template.body || '';

  // Check if body is already a complete HTML document
  if (body.toLowerCase().includes('<!doctype') || body.toLowerCase().includes('<html')) {
    // Already a complete document, ensure it has </body>
    if (body.toLowerCase().includes('</body>')) {
      return body;
    }
    // Add </body></html> if missing
    return body + '</body></html>';
  }

  // Wrap partial HTML or plain text in a complete email structure
  // This ensures tracking pixel can be inserted before </body>
  let content = body;

  // If it's plain text (no HTML tags), convert newlines to <br>
  if (!body.includes('<') || !body.includes('>')) {
    content = `<p>${body.replace(/\n/g, '<br>')}</p>`;
  }

  return wrapInEmailStructure(content, template.globalStyles);
}
