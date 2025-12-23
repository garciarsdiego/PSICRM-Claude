import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    Building2,
    Activity
} from 'lucide-react';
import { ThemeCustomizer } from '@/components/settings/ThemeCustomizer';

export function AdminSidebar() {
    const navigate = useNavigate();
    const { signOut } = useAuth();

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
        { icon: Users, label: 'Usuários', path: '/admin/users' },
        { icon: Building2, label: 'Clínicas', path: '/admin/clinics' },
        { icon: Activity, label: 'Auditoria', path: '/admin/audit' },
        { icon: Settings, label: 'Configurações', path: '/admin/settings' },
    ];

    return (
        <aside className="w-64 bg-slate-900 text-slate-50 border-r border-slate-800 hidden md:flex flex-col h-screen fixed left-0 top-0 z-50">
            <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-2 font-bold text-xl text-white">
                    <div className="bg-primary/20 p-2 rounded-lg">
                        <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <span>PSICRM<span className="text-xs ml-1 opacity-50 font-normal">ADMIN</span></span>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map((item) => (
                    <Button
                        key={item.path}
                        variant="ghost"
                        className="w-full justify-start gap-3 hover:bg-slate-800 hover:text-white text-slate-400"
                        onClick={() => navigate(item.path)}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </Button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800 space-y-2">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 hover:bg-slate-800 hover:text-white text-slate-400"
                    onClick={() => navigate('/dashboard')}
                >
                    <LayoutDashboard className="h-4 w-4" />
                    Ir para o App
                </Button>
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                    onClick={async () => {
                        await signOut();
                        navigate('/auth');
                    }}
                >
                    <LogOut className="h-4 w-4" />
                    Sair
                </Button>
            </div>
        </aside>
    );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pl-64 transition-all duration-300">
            <AdminSidebar />
            <main className="p-8">
                {children}
            </main>
        </div>
    );
}
