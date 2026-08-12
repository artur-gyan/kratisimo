import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { adminAppointmentService } from '../services/adminAppointmentService';
import { Euro, CheckCircle2, CalendarClock, TrendingUp, Users, X, Search } from 'lucide-react';

function toDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatMoney(value) {
    const num = Number(value) || 0;
    return num.toFixed(2) + ' €';
}

function formatDateTime(instant) {
    return new Date(instant).toLocaleString('el-GR', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
}

export default function DashboardPage() {
    const defaultFrom = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return toDateStr(d);
    })();
    const defaultTo = toDateStr(new Date());

    const [draftFrom, setDraftFrom] = useState(defaultFrom);
    const [draftTo, setDraftTo] = useState(defaultTo);
    const [appliedFrom, setAppliedFrom] = useState(defaultFrom);
    const [appliedTo, setAppliedTo] = useState(defaultTo);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal drill-down: κρατάει ποιο status ανοίχτηκε + τη λίστα.
    const [drillStatus, setDrillStatus] = useState(null); // null=κλειστό
    const [drillList, setDrillList] = useState([]);
    const [drillLoading, setDrillLoading] = useState(false);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const result = await api.get(`/admin/dashboard?from=${appliedFrom}&to=${appliedTo}`);
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [appliedFrom, appliedTo]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    function applyPeriod() {
        setAppliedFrom(draftFrom);
        setAppliedTo(draftTo);
    }

    const periodChanged = draftFrom !== appliedFrom || draftTo !== appliedTo;

    async function openDrill(status) {
        setDrillStatus(status);
        setDrillLoading(true);
        try {
            const list = await adminAppointmentService.getByStatusInRange(status, appliedFrom, appliedTo);
            setDrillList(list);
        } catch {
            setDrillList([]);
        } finally {
            setDrillLoading(false);
        }
    }

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

    // PENDING + NO_SHOW αφαιρέθηκαν (νεκρά statuses — πάντα 0).
    const statusConfig = {
        COMPLETED: { label: 'Ολοκληρωμένα', dot: 'bg-success' },
        CONFIRMED: { label: 'Προγραμματισμένα', dot: 'bg-blue' },
        CANCELLED: { label: 'Ακυρωμένα', dot: 'bg-danger' },
    };

    const maxBookings = Math.max(
        1,
        ...data.popularServices.map((s) => s.timesBooked)
    );

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">

            <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate">Στατιστικά</h1>
                    <p className="text-slate/60 text-sm mt-1">
                        Περίοδος {data.from} — {data.to}
                    </p>
                </div>

                <div className="flex items-end gap-3">
                    <div>
                        <label className="block text-slate/50 text-xs mb-1">Από</label>
                        <input
                            type="date"
                            value={draftFrom}
                            max={draftTo}
                            onChange={(e) => setDraftFrom(e.target.value)}
                            className="border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                        />
                    </div>
                    <div>
                        <label className="block text-slate/50 text-xs mb-1">Έως</label>
                        <input
                            type="date"
                            value={draftTo}
                            min={draftFrom}
                            onChange={(e) => setDraftTo(e.target.value)}
                            className="border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                        />
                    </div>
                    <button
                        onClick={applyPeriod}
                        disabled={!periodChanged}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue text-white text-sm font-medium hover:bg-blue/90 transition-colors disabled:opacity-40"
                    >
                        <Search size={15} /> Εφαρμογή
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <KpiCard
                    icon={<Euro size={20} />}
                    iconBg="bg-success-tint"
                    iconColor="text-success"
                    label="Συνολικά έσοδα"
                    value={formatMoney(data.totalRevenue)}
                    hint="μόνο ολοκληρωμένα"
                />
                <KpiCard
                    icon={<CheckCircle2 size={20} />}
                    iconBg="bg-blue-tint"
                    iconColor="text-blue"
                    label="Ολοκληρωμένα ραντεβού"
                    value={byStatus.COMPLETED || 0}
                    hint="στην περίοδο"
                />
                <KpiCard
                    icon={<CalendarClock size={20} />}
                    iconBg="bg-page"
                    iconColor="text-slate/70"
                    label="Προγραμματισμένα"
                    value={byStatus.CONFIRMED || 0}
                    hint="σε αναμονή"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

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
                                            {formatMoney(s.unitPrice)} × {s.timesBooked} = {formatMoney(s.revenue)}
                                        </span>
                                    </div>
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

            {/* --- Status breakdown: ΟΛΑ clickable (drill-down, D149) --- */}
            <div className="bg-white border border-slate/10 rounded-2xl p-6 mt-6">
                <h2 className="text-base font-semibold text-slate mb-4">Ραντεβού ανά κατάσταση</h2>
                <div className="flex flex-wrap gap-3">
                    {Object.keys(statusConfig).map((status) => {
                        const count = byStatus[status] || 0;
                        const clickable = count > 0;
                        return (
                            <button
                                key={status}
                                onClick={clickable ? () => openDrill(status) : undefined}
                                disabled={!clickable}
                                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition-colors ${
                                    clickable
                                        ? 'bg-page hover:bg-slate/10 cursor-pointer'
                                        : 'bg-page opacity-60 cursor-default'
                                }`}
                            >
                                <span className={`w-2.5 h-2.5 rounded-full ${statusConfig[status].dot}`} />
                                <span className="text-slate text-sm font-semibold">{count}</span>
                                <span className="text-slate/60 text-sm">{statusConfig[status].label}</span>
                                {clickable && <span className="text-slate/40 text-xs ml-1">→</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Modal drill-down */}
            {drillStatus && (
                <div
                    className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-50"
                    onClick={() => setDrillStatus(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate/10">
                            <h2 className="text-lg font-semibold text-slate">
                                {statusConfig[drillStatus]?.label} ραντεβού
                            </h2>
                            <button onClick={() => setDrillStatus(null)} className="text-slate/40 hover:text-slate transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="px-6 py-5 overflow-y-auto">
                            {drillLoading ? (
                                <p className="text-slate/50 text-sm text-center py-8">Φόρτωση...</p>
                            ) : drillList.length === 0 ? (
                                <p className="text-slate/50 text-sm text-center py-8">Κανένα ραντεβού σε αυτή την περίοδο.</p>
                            ) : (
                                <div className="space-y-2">
                                    {drillList.map((a) => (
                                        <div key={a.id} className="bg-page rounded-lg px-4 py-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate text-sm font-medium">{a.customerName}</span>
                                                <span className="text-slate/50 text-xs">{formatDateTime(a.startsAt)}</span>
                                            </div>
                                            <div className="text-slate/60 text-xs mt-1">
                                                {a.employeeName} · {a.serviceNames.join(', ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

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