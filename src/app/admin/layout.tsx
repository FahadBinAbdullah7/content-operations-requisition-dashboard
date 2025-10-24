
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';


const adminNavLinks = [
  { href: '/admin', label: 'Form Management' },
    { href: '/admin/work-types', label: 'Work Types' },
  { href: '/admin/members', label: 'Manage Members' },
  { href: '/admin/tickets', label: 'All Tickets' },
  { href: '/admin/projects', label: 'Projects' },
  { href: '/admin/kanban', label: 'Kanban Setup' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isMounted } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isMounted && !user) {
        router.push('/login');
    }
  }, [user, isMounted, router]);
  
  if (!isMounted || !user) {
      return null;
  }

  return (
    <div>
      <div className="border-b">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center space-x-2 md:space-x-4 overflow-x-auto">
            {adminNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'py-3 px-2 text-sm font-medium whitespace-nowrap',
                  pathname.startsWith(link.href) && (pathname.length === link.href.length || pathname[link.href.length] === '/')
                    ? 'border-b-2 border-primary text-primary'
                    : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
