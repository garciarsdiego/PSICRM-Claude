import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

export type Session = Tables<'sessions'> & {
  patients: { full_name: string } | null;
};

export function useSessions() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['sessions', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      
      const { data, error } = await supabase
        .from('sessions')
        .select('*, patients(full_name)')
        .eq('professional_id', profile.user_id)
        .order('scheduled_at', { ascending: true });
      
      if (error) throw error;
      return data as Session[];
    },
    enabled: !!profile?.user_id,
  });
}
