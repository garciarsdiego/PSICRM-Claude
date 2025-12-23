import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeMessages(patientId: string | null, userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!patientId || !userId) return;

    const channel = supabase
      .channel(`messages-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `patient_id=eq.${patientId}`,
        },
        () => {
          // Invalidate queries to refetch messages
          queryClient.invalidateQueries({ queryKey: ['messages', patientId] });
          queryClient.invalidateQueries({ queryKey: ['patient-messages', patientId] });
          queryClient.invalidateQueries({ queryKey: ['unread-counts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, userId, queryClient]);
}
