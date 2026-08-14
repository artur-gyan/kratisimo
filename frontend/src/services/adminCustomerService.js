import { api } from './api';

export const adminCustomerService = {
    // Πλήρης λίστα πελατών (σελίδα διαχείρισης).
    getAll: () => api.get('/admin/customers/all'),

    // Πλούσιο search (min 3 chars, με email/active).
    search: (q) => api.get(`/admin/customers/manage?q=${encodeURIComponent(q)}`),

    // Update: fullName + phone.
    update: (id, data) => api.put(`/admin/customers/${id}`, data),

    // Active toggle.
    activate: (id) => api.post(`/admin/customers/${id}/activate`),
    deactivate: (id) => api.post(`/admin/customers/${id}/deactivate`),

    // Ιστορικό ραντεβού.
    getHistory: (id) => api.get(`/admin/customers/${id}/appointments`),
};