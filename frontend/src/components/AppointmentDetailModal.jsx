import { useState } from 'react';
import { X } from 'lucide-react';
import { adminAppointmentService } from '../services/adminAppointmentService';

const STATUS_CONFIG = {
    COMPLETED: { label: 'Ολοκληρωμένο', dot: 'bg-success', text: 'text-success' },
    CONFIRMED: { label: 'Επιβεβαιωμένο', dot: 'bg-blue', text: 'text-blue' },
    PENDING: { label: 'Εκκρεμές', dot: 'bg-blue-soft', text: 'text-slate' },
    CANCELLED: { label: 'Ακυρωμένο', dot: 'bg-danger', text: 'text-danger' },
    NO_SHOW: { label: 'Μη προσέλευση', dot: 'bg-slate/40', text: 'text-slate/60' },
};

function formatDate(instant) {
    return new Date(instant).toLocaleDateString('el-GR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
}

function formatTime(instant) {
    return new Date(instant).toLocaleTimeString('el-GR', {
        hour: '2-digit', minute: '2-digit',
    });
}

function formatMoney(value) {
    return (Number(value) || 0).toFixed(2) + ' €';
}

export default function AppointmentDetailModal({ appointment, onClose, onChanged, onReschedule }) {
    const [working, setWorking] = useState(false);
    const [error, setError] = useState('');

    if (!appointment) return null;

    const status = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.PENDING;

    // Ενέργειες επιτρεπτές ΜΟΝΟ σε CONFIRMED (state machine, D148).
    const canModify = appointment.status === 'CONFIRMED';

    async function changeStatus(target) {
        setError('');
        setWorking(true);
        try {
            await adminAppointmentService.changeStatus(appointment.id, target);
            onChanged();
        } catch (err) {
            setError(err.message || 'Η ενέργεια απέτυχε.');
            setWorking(false);
        }
    }

    return (
        <div
            className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate/10">
                    <h2 className="text-lg font-semibold text-slate">Λεπτομέρειες ραντεβού</h2>
                    <button
                        onClick={onClose}
                        className="text-slate/40 hover:text-slate transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${status.dot}`} />
                        <span className={`text-sm font-semibold ${status.text}`}>
                            {status.label}
                        </span>
                    </div>

                    <DetailRow label="Πελάτης" value={appointment.customerName} />
                    <DetailRow label="Υπάλληλος" value={appointment.employeeName} />
                    <DetailRow label="Ημερομηνία" value={formatDate(appointment.startsAt)} />
                    <DetailRow
                        label="Ώρα"
                        value={`${formatTime(appointment.startsAt)} – ${formatTime(appointment.endsAt)}`}
                    />

                    <div>
                        <p className="text-slate/50 text-xs mb-1.5">Υπηρεσίες</p>
                        <div className="space-y-1">
                            {appointment.serviceNames.map((name, i) => (
                                <div
                                    key={i}
                                    className="text-slate text-sm bg-page rounded-lg px-3 py-2"
                                >
                                    {name}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate/10">
                        <div>
                            <p className="text-slate/50 text-xs">Διάρκεια</p>
                            <p className="text-slate text-sm font-medium">
                                {appointment.totalDurationMinutes} λεπτά
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-slate/50 text-xs">Σύνολο</p>
                            <p className="text-slate text-base font-semibold">
                                {formatMoney(appointment.totalPrice)}
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer: ενέργειες ΜΟΝΟ σε CONFIRMED */}
                {canModify && (
                    <div className="px-6 py-4 border-t border-slate/10 space-y-2">
                        <button
                            onClick={() => changeStatus('COMPLETED')}
                            disabled={working}
                            className="w-full py-2.5 rounded-lg bg-success text-white text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-50"
                        >
                            {working ? 'Επεξεργασία...' : 'Ολοκληρώθηκε'}
                        </button>
                        <button
                            onClick={() => onReschedule(appointment)}
                            disabled={working}
                            className="w-full py-2.5 rounded-lg border border-blue text-blue text-sm font-medium hover:bg-blue-tint transition-colors disabled:opacity-50"
                        >
                            Επαναπρογραμματισμός
                        </button>
                        <button
                            onClick={() => changeStatus('CANCELLED')}
                            disabled={working}
                            className="w-full py-2.5 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/90 transition-colors disabled:opacity-50"
                        >
                            {working ? 'Επεξεργασία...' : 'Ακύρωση ραντεβού'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function DetailRow({ label, value }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-slate/50 text-xs">{label}</span>
            <span className="text-slate text-sm font-medium">{value}</span>
        </div>
    );
}