import { api } from './api';

export const workingHoursService = {
    getSchedule(employeeId) {
        return api.get(`/admin/employees/${employeeId}/working-hours`);
    },
    replaceSchedule(employeeId, shifts) {
        return api.put(`/admin/employees/${employeeId}/working-hours`, { shifts });
    },
};
