'use client';

import { usePathname } from 'next/navigation';
import HelpButton from '@/components/HelpButton';

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // No mostrar el botón de ayuda en login ni en la página de ayuda misma
  const showHelpButton = pathname !== '/login' && pathname !== '/help';

  return (
    <>
      {children}
      {showHelpButton && <HelpButton />}
    </>
  );
}
