import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Clock, Save } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

type AvailabilityRow = {
  id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

type LocalAvailability = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

export function AvailabilitySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [availability, setAvailability] = useState<LocalAvailability[]>(
    DAYS_OF_WEEK.map((day) => ({
      day_of_week: day.value,
      start_time: day.value >= 1 && day.value <= 5 ? '08:00' : '',
      end_time: day.value >= 1 && day.value <= 5 ? '18:00' : '',
      is_active: day.value >= 1 && day.value <= 5,
    }))
  );

  const { isLoading } = useQuery({
    queryKey: ['availability', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('professional_availability')
        .select('*')
        .eq('professional_id', user.id);
      if (error) throw error;
      return data as AvailabilityRow[];
    },
    enabled: !!user?.id,
    onSuccess: (data: AvailabilityRow[]) => {
      if (data && data.length > 0) {
        setAvailability((prev) =>
          prev.map((slot) => {
            const existing = data.find((d) => d.day_of_week === slot.day_of_week);
            if (existing) {
              return {
                day_of_week: existing.day_of_week,
                start_time: existing.start_time.slice(0, 5),
                end_time: existing.end_time.slice(0, 5),
                is_active: existing.is_active,
              };
            }
            return slot;
          })
        );
      }
    },
  } as any);

  const saveAvailability = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Delete existing and insert new
      await supabase
        .from('professional_availability')
        .delete()
        .eq('professional_id', user.id);

      const toInsert = availability
        .filter((a) => a.is_active && a.start_time && a.end_time)
        .map((a) => ({
          professional_id: user.id,
          day_of_week: a.day_of_week,
          start_time: a.start_time,
          end_time: a.end_time,
          is_active: a.is_active,
        }));

      if (toInsert.length > 0) {
        const { error } = await supabase
          .from('professional_availability')
          .insert(toInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      toast({ title: 'Disponibilidade salva com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar disponibilidade', variant: 'destructive' });
    },
  });

  const updateDay = (dayIndex: number, field: keyof LocalAvailability, value: string | boolean) => {
    setAvailability((prev) =>
      prev.map((slot) =>
        slot.day_of_week === dayIndex ? { ...slot, [field]: value } : slot
      )
    );
  };

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horários de Atendimento
        </CardTitle>
        <CardDescription>
          Defina os dias e horários em que você está disponível para atendimentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {DAYS_OF_WEEK.map((day) => {
          const slot = availability.find((a) => a.day_of_week === day.value);
          return (
            <div
              key={day.value}
              className="flex items-center gap-4 p-3 rounded-lg border bg-card"
            >
              <div className="w-8">
                <Switch
                  checked={slot?.is_active || false}
                  onCheckedChange={(checked) => updateDay(day.value, 'is_active', checked)}
                />
              </div>
              <div className="w-32 font-medium">
                {day.label}
              </div>
              <div className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-muted-foreground text-sm">Das</Label>
                  <Input
                    type="time"
                    value={slot?.start_time || ''}
                    onChange={(e) => updateDay(day.value, 'start_time', e.target.value)}
                    disabled={!slot?.is_active}
                    className="w-28"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-muted-foreground text-sm">às</Label>
                  <Input
                    type="time"
                    value={slot?.end_time || ''}
                    onChange={(e) => updateDay(day.value, 'end_time', e.target.value)}
                    disabled={!slot?.is_active}
                    className="w-28"
                  />
                </div>
              </div>
            </div>
          );
        })}
        <Button
          className="w-full mt-4"
          onClick={() => saveAvailability.mutate()}
          disabled={saveAvailability.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {saveAvailability.isPending ? 'Salvando...' : 'Salvar Disponibilidade'}
        </Button>
      </CardContent>
    </Card>
  );
}
