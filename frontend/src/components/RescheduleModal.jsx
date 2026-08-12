import { useState } from 'react';
import { X } from 'lucide-react';
import { adminAppointmentService } from '../services/adminAppointmentService';

// Στρογγυλοποιεί "HH:mm" στο κοντινότερο πολλαπλάσιο του granularity.
function snapToGranularity(timeStr, granularity) {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMin = h * 60 + m;
    const snapped = Math.round(totalMin / granularity) * granularity;
    const clamped = Math.min(snapped, 23 * 60 + 59);
    const sh = Math.floor(clamped / 60);
    const sm = clamped % 60;
    return `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
}

function buildInstant(dateStr, timeStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, min] = timeStr.split(':').map(Number);
    return new Date(y, m - 1, d, h, min).toISOString();
}

// Instant → { date: "YYYY-MM-DD", time: "HH:mm" } τοπικά (prefill).
function splitInstant(instant) {
    const d = new Date(instant);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return { date, time };
}

export default function RescheduleModal({
                                            appointment,       // το ραντεβού που μετακινείται (έχει startsAt, employeeId)
                                            employees,
                                            granularity,
                                            onClose,
                                            onRescheduled,
                                        }) {
    const initial = splitInstant(appointment.startsAt);

    const [date, setDate] = useState(initial.date);
    const [time, setTime] = useState(initial.time);
    const [employeeId, setEmployeeId] = useState(appointment.employeeId);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const activeEmployees = employees.filter((e) => e.active);
    const stepSeconds = (granularity || 15) * 60;

    async function handleSubmit() {
        setError('');
        if (!date || !time) {
            setError('Συμπλήρωσε ημερομηνία και ώρα.');
            return;
        }

        const snappedTime = snapToGranularity(time, granularity || 15);
        const body = {
            startsAt: buildInstant(date, snappedTime),
            employeeId: Number(employeeId),
        };

        setSubmitting(true);
        try {
            await adminAppointmentService.reschedule(appointment.id, body);
            onRescheduled();
        } catch (err) {
            if (err.status === 409) {
                setError('Ο υπάλληλος είναι ήδη κλεισμένος αυτή την ώρα.');
            } else {
                setError(err.message || 'Ο επαναπρογραμματισμός απέτυχε.');
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div
            className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-[60]"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate/10">
                    <h2 className="text-lg font-semibold text-slate">Επαναπρογραμματισμός</h2>
                    <button onClick={onClose} className="text-slate/40 hover:text-slate transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 text-sm">{error}</div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-slate/60 text-xs mb-2">Ημερομηνία</p>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                            />
                        </div>
                        <div>
                            <p className="text-slate/60 text-xs mb-2">Ώρα</p>
                            <input
                                type="time"
                                value={time}
                                step={stepSeconds}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                            />
                        </div>
                    </div>

                    <div>
                        <p className="text-slate/60 text-xs mb-2">Υπάλληλος</p>
                        <select
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate bg-white focus:outline-none focus:border-blue"
                        >
                            {activeEmployees.map((emp) => (
                                <option key={emp.employeeProfileId} value={emp.employeeProfileId}>
                                    {emp.fullName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate/10 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-slate/15 text-slate text-sm font-medium hover:bg-page transition-colors"
                    >
                        Άκυρο
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg bg-blue text-white text-sm font-medium hover:bg-blue/90 transition-colors disabled:opacity-50"
                    >
                        {submitting ? 'Αποθήκευση...' : 'Επαναπρογραμματισμός'}
                    </button>
                </div>
            </div>
        </div>
    );
}