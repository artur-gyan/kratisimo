import { api } from './api';

/**
 * Τα ραντεβού του logged-in υπαλλήλου σε date range.
 * Το backend φιλτράρει με τον χρήστη του token — δεν στέλνουμε employeeId.
 */
export function getMyEmployeeAppointments(from, to) {
    return api.get(`/employee/appointments?from=${from}&to=${to}`);
}