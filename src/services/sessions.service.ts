/**
 * Sessions Service
 * Centralized data access layer for session operations
 */
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Session = Tables<'sessions'>;
export type SessionInsert = TablesInsert<'sessions'>;
export type SessionUpdate = TablesUpdate<'sessions'>;

export type SessionWithPatient = Session & {
  patients: { full_name: string; email?: string | null } | null;
};

export const sessionsService = {
  /**
   * Get all sessions for a professional
   */
  async getAll(professionalId: string): Promise<SessionWithPatient[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*, patients(full_name, email)')
      .eq('professional_id', professionalId)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data as SessionWithPatient[];
  },

  /**
   * Get sessions by date range
   */
  async getByDateRange(
    professionalId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SessionWithPatient[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*, patients(full_name, email)')
      .eq('professional_id', professionalId)
      .gte('scheduled_at', startDate.toISOString())
      .lte('scheduled_at', endDate.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data as SessionWithPatient[];
  },

  /**
   * Get sessions for a specific patient
   */
  async getByPatient(patientId: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('patient_id', patientId)
      .order('scheduled_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Get a single session by ID
   */
  async getById(sessionId: string): Promise<SessionWithPatient | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*, patients(full_name, email)')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) throw error;
    return data as SessionWithPatient | null;
  },

  /**
   * Create a new session
   */
  async create(session: SessionInsert): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .insert(session)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create multiple sessions (for recurring)
   */
  async createMany(sessions: SessionInsert[]): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .insert(sessions)
      .select();

    if (error) throw error;
    return data;
  },

  /**
   * Update an existing session
   */
  async update(sessionId: string, updates: SessionUpdate): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a session
   */
  async delete(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  },

  /**
   * Get pending payments for a professional
   */
  async getPendingPayments(professionalId: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('payment_status', 'pending');

    if (error) throw error;
    return data;
  },

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    sessionId: string,
    status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  ): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .update({ payment_status: status })
      .eq('id', sessionId);

    if (error) throw error;
  },

  /**
   * Update session status
   */
  async updateStatus(
    sessionId: string,
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  ): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .update({ status })
      .eq('id', sessionId);

    if (error) throw error;
  },

  /**
   * Calculate revenue for a date range
   */
  async getRevenue(
    professionalId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const { data, error } = await supabase
      .from('sessions')
      .select('price')
      .eq('professional_id', professionalId)
      .eq('payment_status', 'paid')
      .gte('scheduled_at', startDate.toISOString())
      .lte('scheduled_at', endDate.toISOString());

    if (error) throw error;
    return data.reduce((sum, s) => sum + Number(s.price), 0);
  },
};
