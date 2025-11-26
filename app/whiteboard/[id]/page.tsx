'use client';

import WhiteboardCanvas from '@/components/whiteboard/WhiteboardCanvas';

interface WhiteboardPageProps {
  params: { id: string };
}

export default function WhiteboardPage({ params }: WhiteboardPageProps) {
  return <WhiteboardCanvas whiteboardId={params.id} />;
}
