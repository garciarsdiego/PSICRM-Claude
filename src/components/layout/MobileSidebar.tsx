import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Brain,
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  Mail,
  Settings,
  LogOut,
  MessageSquare,
  Menu,
} from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Pacientes', href: '/patients' },
  { icon: Calendar, label: 'Agenda', href: '/schedule' },
  { icon: DollarSign, label: 'Financeiro', href: '/financial' },
  { icon: MessageSquare, label: 'Mensagens', href: '/messages' },
  { icon: Mail, label: 'E-mails', href: '/emails' },
  { icon: Settings, label: 'Configurações', href: '/settings' },
];

export function MobileSidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const handleNavigation = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar">
        <SheetHeader className="p-4 border-b border-sidebar-border">
          <SheetTitle className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">MentalCare</span>
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1 py-4 h-[calc(100vh-180px)]">
          <nav className="space-y-1 px-3">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={handleNavigation}
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

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border bg-sidebar">
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
            <LogOut className="w-5 h-5" />
            <span className="ml-3">Sair</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}