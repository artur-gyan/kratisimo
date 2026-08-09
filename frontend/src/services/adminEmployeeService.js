import { api } from './api';

export const adminEmployeeService = {
    // Όλοι οι υπάλληλοι (ενεργοί + ανενεργοί). Το φιλτράρισμα ενεργών
    // γίνεται στη σελίδα (active === true).
    getAll() {
        return api.get('/admin/employees');
    },
};