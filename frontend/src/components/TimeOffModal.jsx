import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { timeOffService } from '../services/timeOffService';

function formatRange(startsAt, endsAt) {
    // Το backend αποθηκεύει [start 00:00, endDate+1 00:00) — για εμφάνιση
    // αφαιρούμε μία μέρα από το endsAt ώστε να δείξουμε την inclusive τελευταία μέρα.
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    end.setDate(end.getDate() - 1);
    const fmt = (d) => d.toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' });
    return start.getTime() === end.getTime()
        ? fmt(start)
        : `${fmt(start)} – ${fmt(end)}`;
}

// employee = { employeeProfileId, fullName }
export default function TimeOffModal({ employee, onClose, onChanged }) {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function reload() {
        setLoading(true);
        timeOffService
            .list(employee.employeeProfileId)
            .then((res) => {
                setList(res || []);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }

    useEffect(reload, [employee.employeeProfileId]);

    async function handleAdd() {
        if (!startDate || !endDate) {
            setError('Συμπλήρωσε ημερομηνία έναρξης και λήξης.');
            return;
        }
        if (endDate < startDate) {
            setError('Η ημερομηνία λήξης δεν μπορεί να είναι πριν την έναρξη.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await timeOffService.create(employee.employeeProfileId, {
                startDate,
                endDate,
                reason: reason.trim() || null,
            });
            setStartDate('');
            setEndDate('');
            setReason('');
            reload();
            onChanged?.();
        } catch (err) {
            // 409 = ραντεβού στην περίοδο Ή overlap άλλης άδειας.
            // 400 = παρελθόν / λάθος input.
            if (err.status === 409) {
                setError(
                    err.message?.includes('appointments')
                        ? 'Ο υπάλληλος έχει ραντεβού αυτή την περίοδο. Ακύρωσέ τα πρώτα.'
                        : 'Η περίοδος επικαλύπτεται με υπάρχουσα άδεια.'
                );
            } else if (err.status === 400 && err.message?.includes('past')) {
                setError('Δεν μπορείς να ορίσεις άδεια στο παρελθόν.');
            } else {
                setError(err.message);
            }
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        try {
            await timeOffService.delete(employee.employeeProfileId, id);
            reload();
            onChanged?.();
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate/10 sticky top-0 bg-white">
                    <div>
                        <h2 className="text-lg font-semibold text-slate">Άδειες</h2>
                        <p className="text-slate/50 text-sm">{employee.fullName}</p>
                    </div>
                    <button onClick={onClose} className="text-slate/40 hover:text-slate transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {error && (
                        <div className="bg-danger-tint text-danger rounded-lg px-3 py-2 text-sm">{error}</div>
                    )}

                    {/* Νέα άδεια */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-slate/60 text-xs mb-1.5">Από</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                                />
                            </div>
                            <div>
                                <label className="block text-slate/60 text-xs mb-1.5">Έως</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-slate/60 text-xs mb-1.5">Αιτία (προαιρετικό)</label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                maxLength={200}
                                className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                                placeholder="π.χ. Διακοπές"
                            />
                        </div>
                        <button
                            onClick={handleAdd}
                            disabled={saving}
                            className="w-full px-4 py-2 rounded-lg bg-blue text-white text-sm font-medium hover:bg-blue-soft transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Προσθήκη...' : 'Προσθήκη άδειας'}
                        </button>
                    </div>

                    {/* Λίστα υπαρχουσών */}
                    <div>
                        <p className="text-slate/60 text-xs mb-2">Υπάρχουσες άδειες</p>
                        {loading ? (
                            <p className="text-slate/40 text-sm py-4 text-center">Φόρτωση...</p>
                        ) : list.length === 0 ? (
                            <p className="text-slate/30 text-sm py-4 text-center">Καμία άδεια.</p>
                        ) : (
                            <div className="space-y-2">
                                {list.map((t) => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between bg-page rounded-lg px-3 py-2.5"
                                    >
                                        <div>
                                            <p className="text-slate text-sm font-medium">{formatRange(t.startsAt, t.endsAt)}</p>
                                            {t.reason && <p className="text-slate/50 text-xs">{t.reason}</p>}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            className="text-slate/30 hover:text-danger transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end px-6 py-4 border-t border-slate/10 sticky bottom-0 bg-white">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-slate/15 text-slate text-sm font-medium hover:bg-page transition-colors"
                    >
                        Κλείσιμο
                    </button>
                </div>
            </div>
        </div>
    );
}
