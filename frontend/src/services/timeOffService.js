import { api } from './api';

export const timeOffService = {
    list(employeeId) {
        return api.get(`/admin/employees/${employeeId}/time-off`);
    },
    create(employeeId, body) {
        // body = { startDate, endDate, reason }
        return api.post(`/admin/employees/${employeeId}/time-off`, body);
    },
    delete(employeeId, timeOffId) {
        return api.delete(`/admin/employees/${employeeId}/time-off/${timeOffId}`);
    },
};
