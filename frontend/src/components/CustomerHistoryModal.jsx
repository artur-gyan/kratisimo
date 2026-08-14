import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { adminCustomerService } from '../services/adminCustomerService';

const STATUS_LABELS = {
    CONFIRMED: 'Προγραμματισμένο',
    COMPLETED: 'Ολοκληρώθηκε',
    CANCELLED: 'Ακυρώθηκε',
};

const STATUS_STYLES = {
    CONFIRMED: 'bg-blue/10 text-blue',
    COMPLETED: 'bg-success-tint text-success',
    CANCELLED: 'bg-slate/10 text-slate/50',
};

function formatDateTime(iso) {
    return new Date(iso).toLocaleString('el-GR', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function CustomerHistoryModal({ customer, onClose }) {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function load() {
            setLoading(true);
            setError('');
            try {
                const data = await adminCustomerService.getHistory(customer.id);
                setAppointments(data);
            } catch {
                setError('Δεν ήταν δυνατή η φόρτωση του ιστορικού.');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [customer.id]);

    return (
        <div className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-slate/10">
                    <div>
                        <h2 className="text-lg font-semibold text-slate">Ιστορικό ραντεβού</h2>
                        <p className="text-slate/60 text-sm">{customer.fullName}</p>
                    </div>
                    <button onClick={onClose} className="text-slate/40 hover:text-slate transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto">
                    {loading && <p className="text-slate/60 text-center py-6">Φόρτωση...</p>}
                    {error && <div className="bg-danger-tint text-danger rounded-xl px-4 py-3">{error}</div>}

                    {!loading && !error && appointments.length === 0 && (
                        <p className="text-slate/50 text-center py-6">Δεν υπάρχουν ραντεβού.</p>
                    )}

                    {!loading && !error && appointments.length > 0 && (
                        <div className="space-y-2">
                            {appointments.map((a) => (
                                <div key={a.id} className="bg-page rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-slate font-medium text-sm">
                                            {formatDateTime(a.startsAt)}
                                        </span>
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[a.status] || 'bg-slate/10 text-slate/60'}`}>
                                            {STATUS_LABELS[a.status] || a.status}
                                        </span>
                                    </div>
                                    <p className="text-slate/70 text-sm">{a.employeeName}</p>
                                    <p className="text-slate/50 text-xs mt-0.5">{a.serviceNames.join(', ')}</p>
                                    <p className="text-slate/60 text-sm mt-1">{Number(a.totalPrice).toFixed(2)} €</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}