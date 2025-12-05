import { disconnectPlatform } from '@/lib/marketing/platformHelpers';

export async function POST() {
  return disconnectPlatform('TIKTOK');
}
