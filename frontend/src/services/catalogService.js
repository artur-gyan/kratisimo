import { api } from './api';

// Ενοποιημένο service για κατηγορίες + υπηρεσίες (το "catalog" του μαγαζιού).
export const catalogService = {
    // --- Κατηγορίες ---
    getCategories() {
        return api.get('/admin/categories');
    },
    createCategory(body) {
        return api.post('/admin/categories', body);
    },
    updateCategory(id, body) {
        return api.put(`/admin/categories/${id}`, body);
    },
    deleteCategory(id) {
        return api.delete(`/admin/categories/${id}`);
    },

    // --- Υπηρεσίες ---
    getServices() {
        return api.get('/admin/services');
    },
    createService(body) {
        return api.post('/admin/services', body);
    },
    updateService(id, body) {
        return api.put(`/admin/services/${id}`, body);
    },
    deleteService(id) {
        return api.delete(`/admin/services/${id}`);
    },

    activateCategory(id) {
        return api.post(`/admin/categories/${id}/activate`);
    },
    activateService(id) {
        return api.post(`/admin/services/${id}/activate`);
    },
};