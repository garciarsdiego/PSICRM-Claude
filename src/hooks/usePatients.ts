import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

export type Patient = Tables<'patients'>;

export function usePatients(options?: { activeOnly?: boolean }) {
  const { profile } = useAuth();
  const { activeOnly = false } = options || {};

  return useQuery({
    queryKey: ['patients', profile?.user_id, activeOnly],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      
      let query = supabase
        .from('patients')
        .select('*')
        .eq('professional_id', profile.user_id)
        .order('full_name');
      
      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Patient[];
    },
    enabled: !!profile?.user_id,
  });
}
