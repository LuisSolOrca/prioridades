import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import connectDB from '@/lib/mongodb';
import LandingPage from '@/models/LandingPage';
import WebForm from '@/models/WebForm';
import PublicLandingPage from './PublicLandingPage';

interface Props {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connectDB();

  const page = await LandingPage.findOne({
    slug: params.slug,
    status: 'published',
    isActive: true,
  }).lean();

  if (!page) {
    return { title: 'Pagina no encontrada' };
  }

  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords?.join(', '),
    openGraph: {
      title: page.ogTitle || page.title,
      description: page.ogDescription || page.description,
      images: page.ogImage ? [page.ogImage] : undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: page.ogTitle || page.title,
      description: page.ogDescription || page.description,
      images: page.ogImage ? [page.ogImage] : undefined,
    },
    icons: page.favicon ? { icon: page.favicon } : undefined,
  };
}

export default async function LandingPageRoute({ params, searchParams }: Props) {
  await connectDB();

  const page = await LandingPage.findOne({
    slug: params.slug,
    status: 'published',
    isActive: true,
  }).lean();

  if (!page) {
    notFound();
  }

  // Get form data if associated
  let form = null;
  if (page.formId) {
    form = await WebForm.findById(page.formId).lean();
  }

  // Determine variant for A/B testing
  let sections = page.content?.sections || [];
  let variant: string | undefined;

  if (page.abTest?.enabled && page.abTest.variants?.length > 0) {
    const totalWeight = page.abTest.variants.reduce((sum: number, v: any) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;

    for (const v of page.abTest.variants) {
      random -= v.weight;
      if (random <= 0) {
        variant = v.id;
        if (v.sections && v.sections.length > 0) {
          sections = v.sections;
        }
        break;
      }
    }
  }

  // Extract UTM parameters
  const utmParams = {
    utmSource: searchParams.utm_source as string | undefined,
    utmMedium: searchParams.utm_medium as string | undefined,
    utmCampaign: searchParams.utm_campaign as string | undefined,
    utmTerm: searchParams.utm_term as string | undefined,
    utmContent: searchParams.utm_content as string | undefined,
  };

  // Serialize page data
  const pageData = {
    id: page._id.toString(),
    slug: page.slug,
    title: page.title,
    description: page.description,
    favicon: page.favicon,
    scripts: page.scripts,
    content: {
      sections: JSON.parse(JSON.stringify(sections)),
      globalStyles: page.content?.globalStyles,
    },
    form: form ? JSON.parse(JSON.stringify(form)) : null,
    variant,
    utmParams,
  };

  return <PublicLandingPage pageData={pageData} />;
}
