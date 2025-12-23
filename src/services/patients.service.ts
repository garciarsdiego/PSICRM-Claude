/**
 * Patients Service
 * Centralized data access layer for patient operations
 */
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Patient = Tables<'patients'>;
export type PatientInsert = TablesInsert<'patients'>;
export type PatientUpdate = TablesUpdate<'patients'>;

export const patientsService = {
  /**
   * Get all patients for a professional
   */
  async getAll(professionalId: string): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('professional_id', professionalId)
      .order('full_name');

    if (error) throw error;
    return data;
  },

  /**
   * Get active patients only
   */
  async getActive(professionalId: string): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;
    return data;
  },

  /**
   * Get a single patient by ID
   */
  async getById(patientId: string): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new patient
   */
  async create(patient: PatientInsert): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .insert(patient)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update an existing patient
   */
  async update(patientId: string, updates: PatientUpdate): Promise<Patient> {
    const { data, error } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', patientId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a patient
   */
  async delete(patientId: string): Promise<void> {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', patientId);

    if (error) throw error;
  },

  /**
   * Link a patient to a user account
   */
  async linkToUser(patientId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('patients')
      .update({ user_id: userId })
      .eq('id', patientId);

    if (error) throw error;
  },

  /**
   * Unlink a patient from user account
   */
  async unlinkFromUser(patientId: string): Promise<void> {
    const { error } = await supabase
      .from('patients')
      .update({ user_id: null })
      .eq('id', patientId);

    if (error) throw error;
  },

  /**
   * Bulk update patients
   */
  async bulkUpdate(
    patientIds: string[],
    updates: Partial<PatientUpdate>
  ): Promise<void> {
    const { error } = await supabase
      .from('patients')
      .update(updates)
      .in('id', patientIds);

    if (error) throw error;
  },

  /**
   * Bulk delete patients
   */
  async bulkDelete(patientIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('patients')
      .delete()
      .in('id', patientIds);

    if (error) throw error;
  },

  /**
   * Search patients by name, email, or phone
   */
  async search(professionalId: string, query: string): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('professional_id', professionalId)
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      .order('full_name')
      .limit(10);

    if (error) throw error;
    return data;
  },
};
