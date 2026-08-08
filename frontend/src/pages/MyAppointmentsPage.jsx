import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Calendar, Clock, User } from 'lucide-react';

export default function MyAppointmentsPage() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Ποιο ραντεβού ακυρώνεται τώρα (id) — για disable/spinner στο κουμπί.
    const [cancellingId, setCancellingId] = useState(null);

    // Φόρτωση στο mount.
    useEffect(() => {
        loadAppointments();
    }, []);

    async function loadAppointments() {
        try {
            const data = await api.get('/appointments/me');
            setAppointments(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // Ακύρωση: POST /cancel → μετά ΞΑΝΑφόρτωσε τη λίστα (φρέσκα δεδομένα).
    async function handleCancel(id) {
        // Απλή επιβεβαίωση πριν από μη-αναστρέψιμη ενέργεια.
        if (!window.confirm('Σίγουρα θέλεις να ακυρώσεις αυτό το ραντεβού;')) {
            return;
        }

        setCancellingId(id);
        try {
            await api.post(`/appointments/${id}/cancel`);
            // Ξαναφόρτωσε: το status θα είναι τώρα CANCELLED, canCancel false.
            // Απλούστερο & ασφαλέστερο από το να πειράξουμε το state τοπικά.
            await loadAppointments();
        } catch (err) {
            alert(err.message); // απλό για τώρα· μπορεί να γίνει inline μήνυμα
        } finally {
            setCancellingId(null);
        }
    }

    if (loading) {
        return <div className="max-w-3xl mx-auto px-4 py-12 text-center text-slate/60">Φόρτωση...</div>;
    }

    if (error) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-12">
                <div className="bg-danger-tint text-danger rounded-xl px-4 py-3">{error}</div>
            </div>
        );
    }

    // ─── Χωρισμός σε επερχόμενα vs ιστορικό ───
    // "Επερχόμενο" = CONFIRMED και στο μέλλον. Ό,τι άλλο (ολοκληρωμένα,
    // ακυρωμένα, no-show, ή περασμένα) πάει στο ιστορικό.
    // Ο διαχωρισμός γίνεται frontend-side (θέμα προβολής) — το backend
    // στέλνει όλα τα ραντεβού.
    const now = new Date();

    const upcoming = appointments
        .filter((a) => a.status === 'CONFIRMED' && new Date(a.startsAt) > now)
        // Επερχόμενα: ΝΩΡΙΤΕΡΟ πρώτο (το επόμενο ραντεβού στην κορυφή).
        // Το backend στέλνει DESC· εδώ αναστρέφουμε σε ASC (σε αντίγραφο — το
        // filter επιστρέφει νέο array, οπότε το sort δεν πειράζει το state).
        .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));

    const history = appointments
        // Ό,τι δεν είναι "επερχόμενο". Μένει DESC (νεότερο πρώτο, από backend).
        .filter((a) => !(a.status === 'CONFIRMED' && new Date(a.startsAt) > now));

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-semibold text-slate mb-6">Τα ραντεβού μου</h1>

            {/* Καμία κράτηση καθόλου */}
            {appointments.length === 0 ? (
                <div className="bg-page rounded-2xl px-4 py-12 text-center text-slate/60">
                    Δεν έχεις ραντεβού ακόμα.
                </div>
            ) : (
                <div className="space-y-8">

                    {/* ─── ΕΠΕΡΧΟΜΕΝΑ ─── */}
                    <section>
                        <h2 className="text-sm font-semibold text-slate/50 uppercase tracking-wide mb-3">
                            Επερχόμενα
                        </h2>
                        {upcoming.length === 0 ? (
                            <div className="bg-page rounded-2xl px-4 py-8 text-center text-slate/50 text-sm">
                                Δεν έχεις επερχόμενα ραντεβού.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcoming.map((appt) => (
                                    <AppointmentCard
                                        key={appt.id}
                                        appt={appt}
                                        cancellingId={cancellingId}
                                        onCancel={handleCancel}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* ─── ΙΣΤΟΡΙΚΟ ─── */}
                    {history.length > 0 && (
                        <section>
                            <h2 className="text-sm font-semibold text-slate/50 uppercase tracking-wide mb-3">
                                Ιστορικό
                            </h2>
                            <div className="space-y-3">
                                {history.map((appt) => (
                                    <AppointmentCard
                                        key={appt.id}
                                        appt={appt}
                                        cancellingId={cancellingId}
                                        onCancel={handleCancel}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Κάρτα ενός ραντεβού (κοινή για επερχόμενα & ιστορικό) ───
function AppointmentCard({ appt, cancellingId, onCancel }) {
    return (
        <div className="bg-white border border-slate/10 rounded-2xl p-5">
            {/* Πάνω σειρά: ημερομηνία + status badge */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 text-slate">
                    <Calendar size={16} className="text-blue" />
                    <span className="font-medium">{formatDate(appt.startsAt)}</span>
                    <Clock size={16} className="text-blue ml-2" />
                    <span className="font-medium">{formatTime(appt.startsAt)}</span>
                </div>
                <StatusBadge status={appt.status} />
            </div>

            {/* Υπάλληλος */}
            <div className="flex items-center gap-2 text-slate/70 text-sm mb-2">
                <User size={15} />
                {appt.employeeName}
            </div>

            {/* Υπηρεσίες */}
            <div className="flex flex-wrap gap-1.5 mb-3">
                {appt.serviceNames.map((name, i) => (
                    <span
                        key={i}
                        className="bg-blue-tint text-blue text-xs font-medium rounded-lg px-2.5 py-1"
                    >
                        {name}
                    </span>
                ))}
            </div>

            {/* Κάτω σειρά: σύνολο + κουμπί ακύρωσης */}
            <div className="flex items-center justify-between pt-3 border-t border-slate/10">
                <span className="text-slate font-semibold">
                    {Number(appt.totalPrice).toFixed(2)} €
                </span>

                {appt.canCancel && (
                    <button
                        onClick={() => onCancel(appt.id)}
                        disabled={cancellingId === appt.id}
                        className="text-danger text-sm font-medium border border-danger/30 rounded-lg px-4 py-2 hover:bg-danger-tint transition-colors disabled:opacity-50"
                    >
                        {cancellingId === appt.id ? 'Ακύρωση...' : 'Ακύρωση'}
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Status badge: χρωματιστό, ΜΟΝΟ για μη-CONFIRMED καταστάσεις ───
// Το CONFIRMED είναι η "κανονική" κατάσταση → δεν χρειάζεται ετικέτα.
// Badge μόνο όταν κάτι ξεχωρίζει (ακυρωμένο, ολοκληρωμένο).
function StatusBadge({ status }) {
    if (status === 'CONFIRMED') {
        return null;
    }

    const config = {
        COMPLETED: { label: 'Ολοκληρωμένο', cls: 'bg-success-tint text-success' },
        CANCELLED: { label: 'Ακυρωμένο', cls: 'bg-danger-tint text-danger' },
        NO_SHOW: { label: 'Μη προσέλευση', cls: 'bg-slate/10 text-slate/60' },
        PENDING: { label: 'Εκκρεμές', cls: 'bg-slate/10 text-slate/60' },
    };
    const c = config[status];
    if (!c) return null; // άγνωστο status → τίποτα

    return (
        <span className={`text-xs font-medium rounded-lg px-2.5 py-1 ${c.cls}`}>
            {c.label}
        </span>
    );
}

// ─── Helpers: τοπική ημερομηνία/ώρα από Instant ───
function formatDate(instantString) {
    return new Date(instantString).toLocaleDateString('el-GR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}

function formatTime(instantString) {
    return new Date(instantString).toLocaleTimeString('el-GR', {
        hour: '2-digit',
        minute: '2-digit',
    });
}
