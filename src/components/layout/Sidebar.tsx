import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { GlobalSearch } from './GlobalSearch';
import {
  Brain,
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  Mail,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  MessageSquare,
  ShieldAlert,
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

export function Sidebar() {
  const location = useLocation();
  const { profile, role, signOut, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out',
        collapsed ? 'w-[70px]' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-sidebar-border/50">
        <Link to="/dashboard" className={cn("flex items-center gap-3 overflow-hidden", collapsed ? "justify-center w-full px-0" : "")}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg text-sidebar-foreground truncate tracking-tight">PSICRM</span>
          )}
        </Link>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1.5 px-3">
          {/* Search button */}
          <div className={cn("mb-4 transition-all duration-300", collapsed ? "px-0 flex justify-center" : "")}>
            {collapsed ? (
              <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground" onClick={() => setCollapsed(false)}>
                <Search className="h-4 w-4" />
              </Button>
            ) : (
              <GlobalSearch variant="button" />
            )}
          </div>

          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group relative',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  collapsed ? "justify-center" : ""
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-current" : "text-sidebar-foreground/50 group-hover:text-current")} />
                {!collapsed && <span>{item.label}</span>}

                {/* Tooltip for collapsed state would go here */}
              </Link>
            );
          })}

          {role === 'admin' && (
            <>
              <Separator className="my-2 bg-sidebar-border/50" />
              <Link
                to="/admin"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group relative text-amber-500 hover:bg-amber-500/10 hover:text-amber-600',
                  collapsed ? "justify-center" : ""
                )}
              >
                <ShieldAlert className="w-5 h-5 shrink-0 transition-colors" />
                {!collapsed && <span>Admin CRM</span>}
              </Link>
            </>
          )}
        </nav>
      </ScrollArea>

      {/* Collapse Button (Bottom) - Only visible when collapsed */}
      {collapsed && (
        <div className="flex justify-center p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-sidebar-border/50 bg-sidebar-background/50">
        {profile && (
          <div className={cn("flex items-center gap-3 mb-4", collapsed ? "justify-center" : "")}>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-border">
              <span className="font-semibold text-primary text-sm">
                {profile.full_name?.charAt(0) || "U"}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {profile.full_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile.email}
                </p>
              </div>
            )}
          </div>
        )}

        <Button
          variant={collapsed ? "ghost" : "outline"}
          onClick={signOut}
          className={cn(
            'w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 border-sidebar-border',
            collapsed && 'justify-center px-0 border-0'
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="ml-3">Sair</span>}
        </Button>

        {!collapsed && user && (
          <div className="mt-4 p-2 bg-slate-100 dark:bg-slate-900 rounded text-[10px] font-mono text-slate-500 break-all select-all">
            <p>ID: {user.id.substring(0, 8)}...</p>
            <p>Role: {role || 'null'}</p>
            <p>St: {profile?.status || 'null'}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
