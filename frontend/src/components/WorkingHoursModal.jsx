import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { workingHoursService } from '../services/workingHoursService';

const DAYS = [
    { value: 'MONDAY', label: 'Δευτέρα' },
    { value: 'TUESDAY', label: 'Τρίτη' },
    { value: 'WEDNESDAY', label: 'Τετάρτη' },
    { value: 'THURSDAY', label: 'Πέμπτη' },
    { value: 'FRIDAY', label: 'Παρασκευή' },
    { value: 'SATURDAY', label: 'Σάββατο' },
    { value: 'SUNDAY', label: 'Κυριακή' },
];

// employee = { employeeProfileId, fullName }
export default function WorkingHoursModal({ employee, onClose, onSaved }) {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        workingHoursService
            .getSchedule(employee.employeeProfileId)
            .then((res) => {
                if (!active) return;
                // res.shifts = [{ id, dayOfWeek, startTime, endTime }]
                // Κρατάμε μόνο τα πεδία που στέλνουμε πίσω (χωρίς id).
                setShifts(
                    (res.shifts || []).map((s) => ({
                        dayOfWeek: s.dayOfWeek,
                        startTime: s.startTime?.slice(0, 5) || '09:00',
                        endTime: s.endTime?.slice(0, 5) || '17:00',
                    }))
                );
                setLoading(false);
            })
            .catch((err) => {
                if (!active) return;
                setError(err.message);
                setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [employee.employeeProfileId]);

    function addShift() {
        setShifts([...shifts, { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00' }]);
    }

    function removeShift(index) {
        setShifts(shifts.filter((_, i) => i !== index));
    }

    function updateShift(index, field, value) {
        setShifts(shifts.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
    }

    async function handleSave() {
        if (shifts.length === 0) {
            setError('Πρόσθεσε τουλάχιστον μία βάρδια (ή διέγραψε τον υπάλληλο για πλήρη απενεργοποίηση).');
            return;
        }
        // Client-side προέλεγχος: start < end (ο backend το ξαναελέγχει).
        for (const s of shifts) {
            if (s.startTime >= s.endTime) {
                setError('Η ώρα έναρξης πρέπει να είναι πριν την ώρα λήξης σε κάθε βάρδια.');
                return;
            }
        }

        setSaving(true);
        setError('');
        try {
            // Ο backend περιμένει HH:mm:ss ή HH:mm — στέλνουμε HH:mm, το JPA το δέχεται.
            const payload = shifts.map((s) => ({
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime.length === 5 ? s.startTime + ':00' : s.startTime,
                endTime: s.endTime.length === 5 ? s.endTime + ':00' : s.endTime,
            }));
            await workingHoursService.replaceSchedule(employee.employeeProfileId, payload);
            onSaved();
        } catch (err) {
            // 400 = overlap ή invalid range (backend μήνυμα).
            setError(err.message);
            setSaving(false);
        }
    }

    // Ομαδοποίηση ανά μέρα για εμφάνιση (sorted MON→SUN).
    const shiftsByDay = DAYS.map((day) => ({
        ...day,
        items: shifts
            .map((s, idx) => ({ ...s, idx }))
            .filter((s) => s.dayOfWeek === day.value),
    }));

    return (
        <div className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate/10 sticky top-0 bg-white">
                    <div>
                        <h2 className="text-lg font-semibold text-slate">Ωράριο εργασίας</h2>
                        <p className="text-slate/50 text-sm">{employee.fullName}</p>
                    </div>
                    <button onClick={onClose} className="text-slate/40 hover:text-slate transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="bg-danger-tint text-danger rounded-lg px-3 py-2 text-sm">{error}</div>
                    )}

                    {loading ? (
                        <p className="text-slate/50 text-sm py-8 text-center">Φόρτωση...</p>
                    ) : (
                        <>
                            <div className="space-y-3">
                                {shiftsByDay.map((day) => (
                                    <div key={day.value} className="border border-slate/10 rounded-lg p-3">
                                        <p className="text-slate/60 text-xs font-medium mb-2">{day.label}</p>
                                        {day.items.length === 0 ? (
                                            <p className="text-slate/30 text-sm">Κλειστά</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {day.items.map((s) => (
                                                    <div key={s.idx} className="flex items-center gap-2">
                                                        <input
                                                            type="time"
                                                            value={s.startTime}
                                                            onChange={(e) => updateShift(s.idx, 'startTime', e.target.value)}
                                                            className="border border-slate/15 rounded-lg px-2 py-1.5 text-sm text-slate focus:outline-none focus:border-blue"
                                                        />
                                                        <span className="text-slate/40">–</span>
                                                        <input
                                                            type="time"
                                                            value={s.endTime}
                                                            onChange={(e) => updateShift(s.idx, 'endTime', e.target.value)}
                                                            className="border border-slate/15 rounded-lg px-2 py-1.5 text-sm text-slate focus:outline-none focus:border-blue"
                                                        />
                                                        <button
                                                            onClick={() => removeShift(s.idx)}
                                                            className="text-slate/30 hover:text-danger transition-colors ml-1"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={addShift}
                                className="flex items-center gap-2 text-blue text-sm font-medium hover:text-blue-soft transition-colors"
                            >
                                <Plus size={16} /> Προσθήκη βάρδιας
                            </button>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate/10 sticky bottom-0 bg-white">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-slate/15 text-slate text-sm font-medium hover:bg-page transition-colors"
                    >
                        Ακύρωση
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-4 py-2 rounded-lg bg-blue text-white text-sm font-medium hover:bg-blue-soft transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
                    </button>
                </div>
            </div>
        </div>
    );
}
