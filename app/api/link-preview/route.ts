import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface LinkMetadata {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
}

// Cache en memoria (en producción usar Redis o similar)
const cache = new Map<string, { data: LinkMetadata; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 horas

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Validar URL
    let validUrl: URL;
    try {
      validUrl = new URL(url);
      // Solo permitir http y https
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        return NextResponse.json(
          { error: 'Invalid URL protocol. Only HTTP and HTTPS are allowed.' },
          { status: 400 }
        );
      }
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Verificar cache
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    // Hacer fetch del HTML
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status}` },
        { status: 502 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extraer metadata (Open Graph, Twitter Cards, metadata estándar)
    const metadata: LinkMetadata = {
      url,
      title: null,
      description: null,
      image: null,
      siteName: null,
      favicon: null,
    };

    // Título (prioridad: og:title > twitter:title > title tag)
    metadata.title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      null;

    // Descripción
    metadata.description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      null;

    // Imagen
    let imageUrl =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      null;

    // Resolver URL relativa de imagen
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        imageUrl = new URL(imageUrl, validUrl.origin).href;
      } catch (e) {
        imageUrl = null;
      }
    }
    metadata.image = imageUrl;

    // Nombre del sitio
    metadata.siteName =
      $('meta[property="og:site_name"]').attr('content') ||
      validUrl.hostname ||
      null;

    // Favicon
    let faviconUrl =
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href') ||
      '/favicon.ico';

    // Resolver URL relativa de favicon
    if (faviconUrl && !faviconUrl.startsWith('http')) {
      try {
        faviconUrl = new URL(faviconUrl, validUrl.origin).href;
      } catch (e) {
        faviconUrl = `${validUrl.origin}/favicon.ico`;
      }
    }
    metadata.favicon = faviconUrl;

    // Guardar en cache
    cache.set(url, { data: metadata, timestamp: Date.now() });

    // Limpiar cache antigua (más de 24h)
    for (const [key, value] of cache.entries()) {
      if (Date.now() - value.timestamp > CACHE_DURATION) {
        cache.delete(key);
      }
    }

    return NextResponse.json(metadata);
  } catch (error: any) {
    console.error('Error fetching link preview:', error);

    // Manejar timeout
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate link preview' },
      { status: 500 }
    );
  }
}
