import { api } from "./api";


// Μορφοποιεί Date -> "YYYY-MM-DD" (τοπική ημερομηνία, όχι UTC — αλλιώς το toISOString
// μπορεί να γυρίσει προηγούμενη μέρα λόγω timezone offset).
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
};