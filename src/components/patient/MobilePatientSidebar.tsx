import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Heart,
  LayoutDashboard,
  Calendar,
  CreditCard,
  CalendarPlus,
  MessageSquare,
  LogOut,
  Menu,
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Início', href: '/patient/dashboard' },
  { icon: Calendar, label: 'Minhas Sessões', href: '/patient/sessions' },
  { icon: CalendarPlus, label: 'Agendar', href: '/patient/book' },
  { icon: CreditCard, label: 'Pagamentos', href: '/patient/payments' },
  { icon: MessageSquare, label: 'Mensagens', href: '/patient/messages' },
];

export function MobilePatientSidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground">Meu Portal</span>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border mt-auto">
          {profile && (
            <div className="mb-3 px-3">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile.full_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile.email}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              signOut();
              setOpen(false);
            }}
            className="w-full justify-start text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
