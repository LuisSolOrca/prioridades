import { getPlatformStatus } from '@/lib/marketing/platformHelpers';

export async function GET() {
  return getPlatformStatus('WHATSAPP');
}
