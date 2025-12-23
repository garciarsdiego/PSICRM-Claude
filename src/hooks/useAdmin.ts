import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type UserProfile = {
    id: string;
    full_name: string | null;
    email: string | null;
    role: 'admin' | 'professional' | 'patient' | 'clinic_admin' | 'staff' | null;
    status?: 'pending' | 'active' | 'suspended' | 'rejected';
    last_seen?: string | null;
    created_at: string;
};

/* ... imports ... */

export function useAdminUsers() {
    return useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            console.log("Fetching admin users (Standard Select)...");
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching admin users:", error);
                throw error;
            }
            console.log("Admin users fetched:", data);
            return data as UserProfile[];
        },
    });
}

export function useUpdateUserStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
            const { error } = await supabase
                .from('profiles')
                .update({ status })
                .eq('id', userId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
    });
}

export function useAdminStats() {
    return useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            // Fetch real counts from Supabase
            // Note: 'count' option returns the total number of rows matching the query

            // 1. Users Count
            const { count: usersCount, error: usersError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            if (usersError) throw usersError;

            // 2. Clinics Count
            // Note: This requires the 'clinics' table to be queryable by the current user (admin policy)
            const { count: clinicsCount, error: clinicsError } = await supabase
                .from('clinics')
                .select('*', { count: 'exact', head: true });

            if (clinicsError) {
                console.warn("Could not fetch clinics count:", clinicsError);
            }

            // 3. Revenue (Still mock/placeholder for now as we don't have payments table)
            // Future: Sum 'amount' from 'payments' table

            return {
                users: usersCount || 0,
                clinics: clinicsCount || 0,
                revenue: 0,
                activeAlerts: 0
            };
        }
    })
}
