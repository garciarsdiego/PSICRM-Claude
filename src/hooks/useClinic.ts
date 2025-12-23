import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types for Clinic Tables (Manual definition until codegen runs)
export type Clinic = {
    id: string;
    name: string;
    owner_id: string;
};

export type ClinicMember = {
    id: string;
    clinic_id: string;
    user_id: string;
    role: 'owner' | 'clinic_admin' | 'professional' | 'secretary' | 'staff';
    permissions: Record<string, boolean>;
    profile?: {
        full_name: string | null;
        email: string | null;
    }
};

export function useClinic() {
    const { user } = useAuth();

    // Fetch the clinic the current user belongs to
    // Simplified: Assuming user belongs to only ONE clinic for now
    return useQuery({
        queryKey: ['my-clinic', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            // 1. Check if user is a member
            const { data: memberData, error: memberError } = await supabase
                .from('clinic_members')
                .select('clinic_id, role, permissions')
                .eq('user_id', user!.id)
                .single();

            if (memberError && memberError.code !== 'PGRST116') { // PGRST116 is "No rows returned"
                // If not a member, check if they OWN a clinic
                const { data: ownerData, error: ownerError } = await supabase
                    .from('clinics')
                    .select('*')
                    .eq('owner_id', user!.id)
                    .single();

                if (ownerError) return null; // No clinic found
                return { ...ownerData, role: 'owner' } as Clinic & { role: string };
            }

            if (memberData) {
                const { data: clinicData, error: clinicError } = await supabase
                    .from('clinics')
                    .select('*')
                    .eq('id', memberData.clinic_id)
                    .single();

                if (clinicError) throw clinicError;
                return { ...clinicData, role: memberData.role, permissions: memberData.permissions };
            }

            return null;
        }
    });
}

export function useClinicMembers(clinicId: string | undefined) {
    return useQuery({
        queryKey: ['clinic-members', clinicId],
        enabled: !!clinicId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('clinic_members')
                .select(`
                    *,
                    profile:profiles(full_name, email)
                `)
                .eq('clinic_id', clinicId);

            if (error) throw error;
            return data as unknown as ClinicMember[];
        }
    });
}

export function useInviteMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ clinicId, email, role }: { clinicId: string, email: string, role: string }) => {
            // Logic to invite:
            // 1. Check if user exists by email (requires Edge Function usually for privacy)
            // 2. OR Create an invitation record (not yet implemented)
            // 3. For now, we'll try to find a profile with that email and link it. 
            // NOTE: This will likely fail with Row Level Security if we try to select profiles by email directly as a normal user.
            // PROPER WAY: Use Supabase Edge Function to handle invites safely.

            throw new Error("Convite por email requer implementação de Edge Function (Backend).");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinic-members'] });
        }
    })
}

export function useCreateClinic() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (name: string) => {
            if (!user?.id) throw new Error("Usuário não autenticado");

            // 1. Create Clinic
            const { data: clinic, error: clinicError } = await supabase
                .from('clinics')
                .insert({ name, owner_id: user.id })
                .select()
                .single();

            if (clinicError) throw clinicError;

            // 2. Add Owner as Member
            const { error: memberError } = await supabase
                .from('clinic_members')
                .insert({
                    clinic_id: clinic.id,
                    user_id: user.id,
                    role: 'owner',
                    permissions: { admin: true }
                });

            if (memberError) {
                // Rollback (delete clinic) if member creation fails - simplified transaction logic
                await supabase.from('clinics').delete().eq('id', clinic.id);
                throw memberError;
            }

            return clinic;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-clinic'] });
        }
    });
}
