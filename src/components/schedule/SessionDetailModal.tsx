import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, User, DollarSign, FileText, Edit2, X, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Session = Tables<'sessions'> & {
  patients: { full_name: string } | null;
};

interface SessionDetailModalProps {
  session: Session | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<Session>) => void;
  onStatusChange: (id: string, status: string) => void;
}

const sessionStatusColors: Record<string, string> = {
  scheduled: 'bg-primary/20 text-primary border-primary',
  completed: 'bg-success/20 text-success border-success',
  cancelled: 'bg-muted text-muted-foreground border-muted',
  no_show: 'bg-destructive/20 text-destructive border-destructive',
};

const sessionStatusLabels: Record<string, string> = {
  scheduled: 'Agendada',
  completed: 'Realizada',
  cancelled: 'Cancelada',
  no_show: 'Não compareceu',
};

export function SessionDetailModal({
  session,
  open,
  onOpenChange,
  onUpdate,
  onStatusChange,
}: SessionDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [editedPrice, setEditedPrice] = useState('');
  const [editedDuration, setEditedDuration] = useState('');

  if (!session) return null;

  const handleStartEdit = () => {
    setEditedNotes(session.notes || '');
    setEditedPrice(String(session.price));
    setEditedDuration(String(session.duration || 50));
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdate(session.id, {
      notes: editedNotes || null,
      price: Number(editedPrice),
      duration: Number(editedDuration),
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes da Sessão</span>
            {!isEditing && (
              <Button variant="ghost" size="icon" onClick={handleStartEdit}>
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {session.patients?.full_name || 'Paciente'}
              </p>
              <p className="text-sm text-muted-foreground">Paciente</p>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-medium text-foreground">
                  {format(new Date(session.scheduled_at), "dd 'de' MMMM, yyyy", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Horário</p>
                <p className="font-medium text-foreground">
                  {format(new Date(session.scheduled_at), 'HH:mm')}
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <Label className="text-muted-foreground">Status</Label>
            <Select
              value={session.status || 'scheduled'}
              onValueChange={(value) => onStatusChange(session.id, value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Agendada</SelectItem>
                <SelectItem value="completed">Realizada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
                <SelectItem value="no_show">Não compareceu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Duração (min)</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedDuration}
                  onChange={(e) => setEditedDuration(e.target.value)}
                  className="mt-1"
                />
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{session.duration || 50} min</span>
                </div>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Valor</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={editedPrice}
                  onChange={(e) => setEditedPrice(e.target.value)}
                  className="mt-1"
                />
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    R$ {Number(session.price).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-muted-foreground">Observações</Label>
            {isEditing ? (
              <Textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                placeholder="Notas sobre a sessão..."
                className="mt-1"
                rows={3}
              />
            ) : (
              <div className="mt-1 p-3 bg-muted/30 rounded-lg min-h-[80px]">
                {session.notes ? (
                  <p className="text-sm text-foreground">{session.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sem observações</p>
                )}
              </div>
            )}
          </div>

          {/* Google Meet Link */}
          {session.meet_link && (
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Google Meet</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() => window.open(session.meet_link!, '_blank')}
              >
                Entrar na Reunião
              </Button>
            </div>
          )}

          {/* Payment Status */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <span className="text-sm text-muted-foreground">Status de Pagamento</span>
            <Badge
              variant="outline"
              className={cn(
                session.payment_status === 'paid' && 'bg-success/20 text-success border-success',
                session.payment_status === 'pending' && 'bg-warning/20 text-warning border-warning',
                session.payment_status === 'overdue' && 'bg-destructive/20 text-destructive border-destructive'
              )}
            >
              {session.payment_status === 'paid' && 'Pago'}
              {session.payment_status === 'pending' && 'Pendente'}
              {session.payment_status === 'overdue' && 'Atrasado'}
              {session.payment_status === 'cancelled' && 'Cancelado'}
            </Badge>
          </div>
        </div>

        {isEditing && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar Alterações</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
