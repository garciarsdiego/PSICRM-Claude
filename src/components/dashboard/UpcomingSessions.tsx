import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Session {
  id: string;
  scheduled_at: string;
  patient: {
    full_name: string;
  };
  status: string;
}

interface UpcomingSessionsProps {
  sessions: Session[];
}

import { Calendar } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils'; // Ensure cn is available if needed, though simpler valid JSX is fine.

export function UpcomingSessions({ sessions }: UpcomingSessionsProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">Agendada</Badge>;
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Concluída</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="bg-white/60 dark:bg-card/40 backdrop-blur-md border-white/20 dark:border-border/50 h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Próximas Sessões</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Agenda Livre"
            description="Nenhuma sessão agendada para hoje."
            className="py-8"
          />
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-white/50 dark:bg-card/30 hover:bg-accent/50 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-primary/10">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {session.patient?.full_name || 'Paciente'}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {format(new Date(session.scheduled_at), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
                {getStatusBadge(session.status)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
