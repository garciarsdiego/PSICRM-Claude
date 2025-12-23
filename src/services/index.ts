/**
 * Services index
 * Export all service modules for easy imports
 */
export { patientsService } from './patients.service';
export type { Patient, PatientInsert, PatientUpdate } from './patients.service';

export { sessionsService } from './sessions.service';
export type {
  Session,
  SessionInsert,
  SessionUpdate,
  SessionWithPatient,
} from './sessions.service';
