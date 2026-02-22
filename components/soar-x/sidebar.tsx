'use client';

import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X, LayoutDashboard, AlertCircle, BarChart3, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();

  const navItems = useMemo<NavItem[]>(() => [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', href: '/' },
    { icon: <AlertCircle size={20} />, label: 'Alerts', href: '/alerts' },
    { icon: <BarChart3 size={20} />, label: 'Analytics', href: '/analytics' },
    { icon: <FileText size={20} />, label: 'Audit Logs', href: '/audit-logs' },
    { icon: <Settings size={20} />, label: 'Settings', href: '/settings' },
  ], []);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.includes(href);
  };

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-40 lg:hidden"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </Button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-30 ${
          isOpen ? 'w-64' : 'w-0 -translate-x-full'
        } lg:translate-x-0 lg:w-64`}
      >
        <div className="flex flex-col h-full p-6 gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">X</span>
            </div>
            <h1 className="text-xl font-bold text-sidebar-foreground">SOAR X</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="pt-4 border-t border-sidebar-border">
            <p className="text-xs text-sidebar-foreground/60">© 2024 SOAR X</p>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
