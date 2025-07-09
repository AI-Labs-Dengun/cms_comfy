'use client';
import CMSLayout from '@/components/CMSLayout';
import { usePathname } from 'next/navigation';

export default function PsicologosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  let currentPage: 'psicologos-create' | 'psicologos' | undefined = undefined;
  if (pathname.endsWith('/psicologos/create')) currentPage = 'psicologos-create';
  else if (pathname.endsWith('/psicologos')) currentPage = 'psicologos';

  return <CMSLayout currentPage={currentPage}>{children}</CMSLayout>;
} 