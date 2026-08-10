import { api } from './api';

export const adminEmployeeService = {
    getAll() {
        return api.get('/admin/employees');
    },
    activate(id) {
        return api.post(`/admin/employees/${id}/activate`);
    },
    delete(id) {
        return api.delete(`/admin/employees/${id}`);
    },
};