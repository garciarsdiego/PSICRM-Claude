import { ReactNode } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Brain } from 'lucide-react';

interface PublicLayoutProps {
    children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
                            <Brain className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            PSICRM
                        </span>
                    </div>
                    <ThemeToggle />
                </div>
            </header>
            <main className="flex-1 container mx-auto px-4 py-8">
                {children}
            </main>
            <footer className="border-t bg-muted/20">
                <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} PSICRM. Todos os direitos reservados.
                </div>
            </footer>
        </div>
    );
}
