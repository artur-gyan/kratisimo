import { api } from "./api";

function toDateParam(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export const adminAppointmentService = {
    getInRange(fromDate, toDate) {
        const from = toDateParam(fromDate);
        const to = toDateParam(toDate);
        return api.get(`/admin/appointments?from=${from}&to=${to}`);
    },

    create(body) {
        return api.post('/admin/appointments', body);
    },

    // Αλλαγή status (D148): "COMPLETED" ή "CANCELLED". Αντικαθιστά το παλιό cancel.
    changeStatus(id, status) {
        return api.put(`/admin/appointments/${id}/status`, { status });
    },

    // Reschedule (D145). body: { startsAt (ISO), employeeId|null }
    reschedule(id, body) {
        return api.put(`/admin/appointments/${id}/reschedule`, body);
    },

    // Drill-down (D149): ραντεβού status σε περίοδο. status: "COMPLETED"|"CONFIRMED"|"CANCELLED"
    getByStatusInRange(status, fromStr, toStr) {
        return api.get(`/admin/appointments/by-status?status=${status}&from=${fromStr}&to=${toStr}`);
    },
};