import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldAlert, LogOut } from 'lucide-react';

export default function PendingApproval() {
    const { signOut, user, profile } = useAuth();

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-slate-100">
                <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                    <ShieldAlert className="w-8 h-8 text-amber-600" />
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">Acesso em Análise</h1>

                <p className="text-slate-600 mb-6">
                    Olá, <span className="font-semibold">{profile?.full_name || user?.email || 'Visitante'}</span>.
                </p>

                <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                    Sua conta foi criada com sucesso, mas o acesso ao sistema requer aprovação de um administrador.
                    Você receberá um e-mail assim que seu acesso for liberado.
                </p>

                <div className="flex flex-col gap-3">
                    <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="w-full"
                    >
                        Verificar Status Novamente
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={signOut}
                        className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sair
                    </Button>
                </div>
            </div>

            <p className="mt-8 text-xs text-slate-400">
                PSICRM - Gestão para Psicólogos
            </p>
        </div>
    );
}
