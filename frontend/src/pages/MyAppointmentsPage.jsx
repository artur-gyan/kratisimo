import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Calendar, Clock, User, Star, X } from 'lucide-react';
import LoyaltyCard from '../components/LoyaltyCard';

export default function MyAppointmentsPage() {
    const [appointments, setAppointments] = useState([]);
    const [loyalty, setLoyalty] = useState(null);   // ΝΕΟ (2f)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Ποιο ραντεβού ακυρώνεται τώρα (id) — για disable/spinner στο κουμπί.
    const [cancellingId, setCancellingId] = useState(null);

    // Ποιο ραντεβού αξιολογείται τώρα (ολόκληρο το object, ή null = κλειστό modal).
    const [reviewingAppt, setReviewingAppt] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    // Ραντεβού + πρόοδος επιβράβευσης ΠΑΡΑΛΛΗΛΑ (ανεξάρτητα requests).
    // Το loyalty έχει δικό του .catch → αν αποτύχει, η σελίδα δουλεύει χωρίς κάρτα.
    async function loadData() {
        try {
            const [appts, loyaltyData] = await Promise.all([
                api.get('/appointments/me'),
                api.get('/loyalty/me').catch(() => null),
            ]);
            setAppointments(appts);
            setLoyalty(loyaltyData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    // Ακύρωση → ξαναφόρτωσε ΚΑΙ την πρόοδο: αν το ραντεβού είχε έκπτωση,
    // η επιβράβευση επιστρέφει (derived μοντέλο στο backend).
    async function handleCancel(id) {
        if (!window.confirm('Σίγουρα θέλεις να ακυρώσεις αυτό το ραντεβού;')) {
            return;
        }

        setCancellingId(id);
        try {
            await api.post(`/appointments/${id}/cancel`);
            await loadData();
        } catch (err) {
            alert(err.message);
        } finally {
            setCancellingId(null);
        }
    }

    // Αξιολόγηση → κλείσε modal → ξαναφόρτωσε (canReview γίνεται false).
    async function handleReviewSubmit(appointmentId, rating, comment) {
        await api.post('/reviews', { appointmentId, rating, comment });
        setReviewingAppt(null);
        await loadData();
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

    // ─── Χωρισμός σε επερχόμενα vs ιστορικό (frontend-side, D124) ───
    const now = new Date();

    const upcoming = appointments
        .filter((a) => a.status === 'CONFIRMED' && new Date(a.startsAt) > now)
        .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));

    const history = appointments
        .filter((a) => !(a.status === 'CONFIRMED' && new Date(a.startsAt) > now));

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-semibold text-slate mb-6">Τα ραντεβού μου</h1>

            {/* ─── ΝΕΟ (2f): πρόοδος επιβράβευσης ─── */}
            {loyalty?.enabled && (
                <div className="mb-8">
                    <LoyaltyCard loyalty={loyalty} />
                </div>
            )}

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
                                        onReview={setReviewingAppt}
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
                                        onReview={setReviewingAppt}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}

            {reviewingAppt && (
                <ReviewModal
                    appt={reviewingAppt}
                    onClose={() => setReviewingAppt(null)}
                    onSubmit={handleReviewSubmit}
                />
            )}
        </div>
    );
}

// ─── Κάρτα ενός ραντεβού (κοινή για επερχόμενα & ιστορικό) ───
function AppointmentCard({ appt, cancellingId, onCancel, onReview }) {
    return (
        <div className="bg-white border border-slate/10 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 text-slate">
                    <Calendar size={16} className="text-blue" />
                    <span className="font-medium">{formatDate(appt.startsAt)}</span>
                    <Clock size={16} className="text-blue ml-2" />
                    <span className="font-medium">{formatTime(appt.startsAt)}</span>
                </div>
                <StatusBadge status={appt.status} />
            </div>

            <div className="flex items-center gap-2 text-slate/70 text-sm mb-2">
                <User size={15} />
                {appt.employeeName}
            </div>

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

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate/10">
                <PriceBlock appt={appt} />

                <div className="flex items-center gap-2 flex-shrink-0">
                    {appt.canReview && (
                        <button
                            onClick={() => onReview(appt)}
                            className="text-blue text-sm font-medium border border-blue/30 rounded-lg px-4 py-2 hover:bg-blue-tint transition-colors"
                        >
                            Αξιολόγησε
                        </button>
                    )}

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
        </div>
    );
}

// ─── ΝΕΟ (2f): τιμή με/χωρίς έκπτωση ───
// Υποσύνολο = totalPrice + discountAmount (invariant του backend) —
// δεν χρειάζεται ξεχωριστό πεδίο από τον server.
function PriceBlock({ appt }) {
    const total = Number(appt.totalPrice);

    if (!appt.discountPercent) {
        return <span className="text-slate font-semibold">{total.toFixed(2)} €</span>;
    }

    const subtotal = total + Number(appt.discountAmount);
    const cancelled = appt.status === 'CANCELLED';

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate/40 line-through text-sm">{subtotal.toFixed(2)} €</span>
            <span className="text-slate font-semibold">{total.toFixed(2)} €</span>
            <span
                className={`text-xs font-medium rounded-lg px-2 py-0.5 ${
                    cancelled ? 'bg-slate/10 text-slate/60' : 'bg-success-tint text-success'
                }`}
            >
                {cancelled
                    ? `−${appt.discountPercent}% · η επιβράβευση επιστράφηκε`
                    : `−${appt.discountPercent}% επιβράβευση`}
            </span>
        </div>
    );
}

// ─── Status badge: ΜΟΝΟ για μη-CONFIRMED καταστάσεις ───
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
    if (!c) return null;

    return (
        <span className={`text-xs font-medium rounded-lg px-2.5 py-1 ${c.cls}`}>
            {c.label}
        </span>
    );
}

// ─── Modal αξιολόγησης (TOP-LEVEL, στήλη 0) ───
function ReviewModal({ appt, onClose, onSubmit }) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit() {
        if (rating < 1) {
            setError('Επίλεξε βαθμολογία από 1 έως 5 αστέρια.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await onSubmit(appt.id, rating, comment.trim() || null);
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    }

    return (
        <div
            className="fixed inset-0 bg-slate/40 flex items-center justify-center px-4 z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-1">
                    <h3 className="text-lg font-semibold text-slate">Αξιολόγηση ραντεβού</h3>
                    <button
                        onClick={onClose}
                        className="text-slate/40 hover:text-slate transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <p className="text-sm text-slate/60 mb-5">
                    {appt.employeeName} · {formatDate(appt.startsAt)}
                </p>

                <div className="flex items-center gap-1 mb-5">
                    {[1, 2, 3, 4, 5].map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => setRating(n)}
                            onMouseEnter={() => setHover(n)}
                            onMouseLeave={() => setHover(0)}
                            className="p-1 transition-transform hover:scale-110"
                        >
                            <Star
                                size={32}
                                className={
                                    n <= (hover || rating)
                                        ? 'fill-blue text-blue'
                                        : 'text-slate/25'
                                }
                            />
                        </button>
                    ))}
                </div>

                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={1000}
                    rows={4}
                    placeholder="Πες μας την εμπειρία σου (προαιρετικό)..."
                    className="w-full border border-slate/15 rounded-xl px-3 py-2 text-sm text-slate resize-none focus:outline-none focus:border-blue"
                />

                {error && (
                    <div className="bg-danger-tint text-danger text-sm rounded-lg px-3 py-2 mt-3">
                        {error}
                    </div>
                )}

                <div className="flex gap-2 mt-5">
                    <button
                        onClick={onClose}
                        className="flex-1 text-slate/70 text-sm font-medium border border-slate/15 rounded-xl px-4 py-2.5 hover:bg-page transition-colors"
                    >
                        Άκυρο
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 bg-blue text-white text-sm font-medium rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {submitting ? 'Υποβολή...' : 'Υποβολή'}
                    </button>
                </div>
            </div>
        </div>
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