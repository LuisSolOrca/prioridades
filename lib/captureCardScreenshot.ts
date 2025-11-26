import html2canvas from 'html2canvas';

interface CaptureOptions {
  projectId: string;
  channelId: string;
  commandType: string;
  title: string;
  delay?: number; // Delay en ms antes de capturar (útil para ReactFlow, animaciones, etc.)
}

/**
 * Captura un screenshot del card interactivo y lo guarda como attachment
 * @param elementRef - Ref del elemento a capturar
 * @param options - Opciones de captura (projectId, channelId, commandType, title, delay)
 * @returns Promise con el ID del attachment creado
 */
export async function captureCardScreenshot(
  elementRef: HTMLElement | null,
  options: CaptureOptions
): Promise<string | null> {
  if (!elementRef) {
    console.error('No element ref provided for screenshot');
    return null;
  }

  try {
    // Esperar el delay si se especifica (para dar tiempo a que se rendericen elementos como ReactFlow)
    if (options.delay && options.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }

    // Capturar el elemento como canvas
    const canvas = await html2canvas(elementRef, {
      backgroundColor: '#ffffff',
      scale: 2, // Mayor calidad
      logging: false,
      useCORS: true,
      allowTaint: true,
      onclone: (clonedDoc) => {
        // Dar tiempo adicional para que SVGs se rendericen en el clon
        return new Promise(resolve => setTimeout(resolve, 100));
      }
    });

    // Convertir canvas a blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png', 0.95);
    });

    if (!blob) {
      console.error('Failed to create blob from canvas');
      return null;
    }

    // Crear nombre de archivo descriptivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const sanitizedTitle = options.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);

    const fileName = `${options.commandType}-${sanitizedTitle}-${timestamp}.png`;

    // Crear FormData para subir
    const formData = new FormData();
    const file = new File([blob], fileName, { type: 'image/png' });
    formData.append('file', file);
    formData.append('channelId', options.channelId);

    // Subir archivo
    const uploadResponse = await fetch(`/api/projects/${options.projectId}/attachments`, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload screenshot');
    }

    const { attachment } = await uploadResponse.json();

    // Crear mensaje con el attachment
    const messageResponse = await fetch(`/api/projects/${options.projectId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `📸 Captura de **${options.commandType}**: ${options.title}`,
        channelId: options.channelId,
        attachments: [attachment._id]
      })
    });

    if (!messageResponse.ok) {
      console.error('Failed to create message with screenshot');
    }

    return attachment._id;
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    return null;
  }
}
