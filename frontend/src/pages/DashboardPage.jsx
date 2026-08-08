import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Euro, CheckCircle2, CalendarClock, TrendingUp, Users } from 'lucide-react';

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadDashboard() {
            try {
                const result = await api.get('/admin/dashboard');
                setData(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        loadDashboard();
    }, []);

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-12 text-center text-slate/60">
                Φόρτωση...
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-12">
                <div className="bg-danger-tint text-danger rounded-xl px-4 py-3">
                    {error}
                </div>
            </div>
        );
    }

    const byStatus = data.appointmentsByStatus || {};

    // Status config: label + χρώματα. Ένα σημείο ορισμού (single source).
    const statusConfig = {
        COMPLETED: { label: 'Ολοκληρωμένα', dot: 'bg-success' },
        CONFIRMED: { label: 'Επιβεβαιωμένα', dot: 'bg-blue' },
        PENDING: { label: 'Εκκρεμή', dot: 'bg-blue-soft' },
        CANCELLED: { label: 'Ακυρωμένα', dot: 'bg-danger' },
        NO_SHOW: { label: 'Μη προσέλευση', dot: 'bg-slate/40' },
    };

    // Το max για τα progress bars: η υπηρεσία με τις περισσότερες κρατήσεις
    // ορίζει το 100% — οι υπόλοιπες μετριούνται σχετικά με αυτήν.
    const maxBookings = Math.max(
        1, // αποφυγή διαίρεσης με το 0 αν λίστα άδεια
        ...data.popularServices.map((s) => s.timesBooked)
    );

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">

            {/* Επικεφαλίδα */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-slate">Dashboard</h1>
                <p className="text-slate/60 text-sm mt-1">
                    Περίοδος {data.from} — {data.to}
                </p>
            </div>

            {/* --- KPI κάρτες --- */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">

                {/* Έσοδα — πράσινο */}
                <KpiCard
                    icon={<Euro size={20} />}
                    iconBg="bg-success-tint"
                    iconColor="text-success"
                    label="Συνολικά έσοδα"
                    value={formatMoney(data.totalRevenue)}
                    hint="μόνο ολοκληρωμένα"
                />

                {/* Ολοκληρωμένα — μπλε */}
                <KpiCard
                    icon={<CheckCircle2 size={20} />}
                    iconBg="bg-blue-tint"
                    iconColor="text-blue"
                    label="Ολοκληρωμένα ραντεβού"
                    value={byStatus.COMPLETED || 0}
                    hint="στην περίοδο"
                />

                {/* Επερχόμενα — ουδέτερο */}
                <KpiCard
                    icon={<CalendarClock size={20} />}
                    iconBg="bg-page"
                    iconColor="text-slate/70"
                    label="Επιβεβαιωμένα"
                    value={byStatus.CONFIRMED || 0}
                    hint="επερχόμενα"
                />
            </div>

            {/* --- Δύο στήλες --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                {/* Δημοφιλείς υπηρεσίες με progress bars */}
                <div className="bg-white border border-slate/10 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <TrendingUp size={18} className="text-blue" />
                        <h2 className="text-base font-semibold text-slate">Δημοφιλείς υπηρεσίες</h2>
                    </div>

                    {data.popularServices.length === 0 ? (
                        <p className="text-slate/50 text-sm">Καμία εγγραφή.</p>
                    ) : (
                        <div className="space-y-4">
                            {data.popularServices.map((s) => (
                                <div key={s.serviceId}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-slate text-sm font-medium">{s.serviceName}</span>
                                        <span className="text-slate/60 text-sm">
                                            {s.timesBooked} × · {formatMoney(s.revenue)}
                                        </span>
                                    </div>
                                    {/* Progress bar: πλάτος ανάλογο των κρατήσεων */}
                                    <div className="h-2 bg-page rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue rounded-full transition-all"
                                            style={{ width: `${(s.timesBooked / maxBookings) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Απόδοση υπαλλήλων με ranking */}
                <div className="bg-white border border-slate/10 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Users size={18} className="text-blue" />
                        <h2 className="text-base font-semibold text-slate">Απόδοση υπαλλήλων</h2>
                    </div>

                    {data.employeeStats.length === 0 ? (
                        <p className="text-slate/50 text-sm">Καμία εγγραφή.</p>
                    ) : (
                        <div className="space-y-1">
                            {data.employeeStats.map((e, index) => (
                                <div
                                    key={e.employeeProfileId}
                                    className="flex items-center gap-3 py-2.5 border-b border-slate/5 last:border-0"
                                >
                                    {/* Ranking badge */}
                                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-tint text-blue text-xs font-semibold flex items-center justify-center">
                                        {index + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate text-sm font-medium truncate">{e.employeeName}</p>
                                        <p className="text-slate/50 text-xs">{e.appointmentCount} ραντεβού</p>
                                    </div>
                                    <span className="text-slate text-sm font-semibold">
                                        {formatMoney(e.revenue)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- Status breakdown με χρωματιστά badges --- */}
            <div className="bg-white border border-slate/10 rounded-2xl p-6 mt-6">
                <h2 className="text-base font-semibold text-slate mb-4">Ραντεβού ανά κατάσταση</h2>
                <div className="flex flex-wrap gap-3">
                    {Object.keys(statusConfig).map((status) => (
                        <div
                            key={status}
                            className="flex items-center gap-2 bg-page rounded-xl px-4 py-2.5"
                        >
                            <span className={`w-2.5 h-2.5 rounded-full ${statusConfig[status].dot}`} />
                            <span className="text-slate text-sm font-semibold">{byStatus[status] || 0}</span>
                            <span className="text-slate/60 text-sm">{statusConfig[status].label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- Επαναχρησιμοποιήσιμο KPI card component ---
// Το εξάγω σε ξεχωριστό component: οι 3 κάρτες έχουν ίδια δομή,
// διαφορετικά δεδομένα. DRY — μία αλλαγή στο layout, ισχύει σε όλες.
function KpiCard({ icon, iconBg, iconColor, label, value, hint }) {
    return (
        <div className="bg-white border border-slate/10 rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center mb-3`}>
                {icon}
            </div>
            <p className="text-slate/60 text-sm">{label}</p>
            <p className="text-2xl font-semibold text-slate mt-0.5">{value}</p>
            <p className="text-slate/40 text-xs mt-1">{hint}</p>
        </div>
    );
}

function formatMoney(value) {
    const num = Number(value) || 0;
    return num.toFixed(2) + ' €';
}