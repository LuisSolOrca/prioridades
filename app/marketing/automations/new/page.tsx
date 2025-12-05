'use client';

import { Suspense } from 'react';
import AutomationEditor from '@/components/marketing/AutomationEditor';

function LoadingEditor() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  );
}

export default function NewAutomationPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Suspense fallback={<LoadingEditor />}>
        <AutomationEditor />
      </Suspense>
    </div>
  );
}
