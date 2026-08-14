import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMyEmployeeAppointments } from '../services/employeeAppointmentService';

const START_HOUR = 8;
const END_HOUR = 22;
const HOUR_HEIGHT = 90;
const GRID_PADDING = 12;

const DAY_NAMES = ['Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ', 'Κυρ'];
const MONTH_NAMES = [
    'Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου',
    'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου',
];

const STATUS_BLOCK = {
    COMPLETED: 'bg-success-tint border-success/30 text-success',
    CONFIRMED: 'bg-blue-tint border-blue/30 text-blue',
    PENDING: 'bg-page border-blue-soft/40 text-slate',
    NO_SHOW: 'bg-page border-slate/20 text-slate/50',
};

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function formatTime(instant) {
    return new Date(instant).toLocaleTimeString('el-GR', {
        hour: '2-digit', minute: '2-digit',
    });
}

function toDateParam(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export default function EmployeePage() {
    const [anchorDate, setAnchorDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const days = Array.from({ length: 7 }, (_, i) => addDays(getMonday(anchorDate), i));

    async function loadAppointments() {
        setLoading(true);
        setError('');
        try {
            const from = toDateParam(days[0]);
            const to = toDateParam(days[6]);
            const result = await getMyEmployeeAppointments(from, to);
            setAppointments(result);
        } catch (err) {
            setError('Δεν ήταν δυνατή η φόρτωση των ραντεβού.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAppointments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anchorDate]);

    function navigate(direction) {
        setAnchorDate((prev) => addDays(prev, direction * 7));
    }

    function goToday() {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        setAnchorDate(d);
    }

    const visibleAppointments = appointments.filter((a) => a.status !== 'CANCELLED');

    function apptsFor(day) {
        return visibleAppointments.filter((a) => isSameDay(new Date(a.startsAt), day));
    }

    function blockPosition(appointment) {
        const start = new Date(appointment.startsAt);
        const end = new Date(appointment.endsAt);
        const startMinutes = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
        const durationMinutes = (end - start) / 60000;
        return {
            top: (startMinutes / 60) * HOUR_HEIGHT + GRID_PADDING,
            height: Math.max((durationMinutes / 60) * HOUR_HEIGHT, 30),
        };
    }

    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
    const totalGridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT + GRID_PADDING * 2;

    const rangeLabel = `${days[0].getDate()} – ${days[6].getDate()} ${MONTH_NAMES[days[6].getMonth()]} ${days[6].getFullYear()}`;

    function renderBlock(appt) {
        const pos = blockPosition(appt);
        const style = STATUS_BLOCK[appt.status] || STATUS_BLOCK.PENDING;

        const availableForServices = pos.height - 42;
        const maxServiceLines = Math.max(0, Math.floor(availableForServices / 16));
        const showServices = maxServiceLines >= 1;
        const shownServices = showServices ? appt.serviceNames.slice(0, maxServiceLines) : [];
        const hiddenCount = appt.serviceNames.length - shownServices.length;

        return (
            <div
                key={appt.id}
                className={`absolute left-1 right-1 rounded-lg border px-2 py-1 text-left overflow-hidden z-10 ${style}`}
                style={{ top: pos.top, height: pos.height }}
            >
                <div className="text-xs font-semibold truncate">{formatTime(appt.startsAt)}</div>
                <div className="text-xs truncate">{appt.customerName}</div>
                {shownServices.map((name, i) => (
                    <div key={i} className="text-xs truncate opacity-70 leading-tight">{name}</div>
                ))}
                {showServices && hiddenCount > 0 && (
                    <div className="text-xs opacity-50 leading-tight">+{hiddenCount} ακόμη</div>
                )}
            </div>
        );
    }

    function ColumnBackground() {
        return (
            <>
                {hours.slice(0, -1).map((h, i) => (
                    <div
                        key={`h-${h}`}
                        className="absolute left-0 right-0 border-b border-slate/10"
                        style={{ top: i * HOUR_HEIGHT + GRID_PADDING }}
                    />
                ))}
            </>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-slate">Το πρόγραμμά μου</h1>

                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-lg border border-slate/15 text-slate/70 hover:bg-page transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <button onClick={goToday} className="px-3 py-2 rounded-lg border border-slate/15 text-slate text-sm font-medium hover:bg-page transition-colors">
                        Σήμερα
                    </button>
                    <button onClick={() => navigate(1)} className="p-2 rounded-lg border border-slate/15 text-slate/70 hover:bg-page transition-colors">
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <p className="text-slate/60 text-sm mb-4">{rangeLabel}</p>

            {error && (
                <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 mb-4">{error}</div>
            )}

            {loading ? (
                <div className="bg-white border border-slate/10 rounded-2xl py-16 text-center text-slate/50">Φόρτωση...</div>
            ) : (
                <div className="bg-white border border-slate/10 rounded-2xl overflow-hidden">
                    <div className="grid border-b border-slate/10" style={{ gridTemplateColumns: `60px repeat(7, 1fr)` }}>
                        <div className="border-r border-slate/10" />
                        {days.map((day, i) => {
                            const isToday = isSameDay(day, new Date());
                            return (
                                <div key={i} className={`px-2 py-3 text-center border-r border-slate/10 last:border-r-0 ${isToday ? 'bg-blue-tint' : ''}`}>
                                    <div className="text-slate/50 text-xs uppercase">{DAY_NAMES[(day.getDay() + 6) % 7]}</div>
                                    <div className={`text-sm font-semibold ${isToday ? 'text-blue' : 'text-slate'}`}>{day.getDate()}</div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid" style={{ gridTemplateColumns: `60px repeat(7, 1fr)` }}>
                        <div className="border-r border-slate/10 relative" style={{ height: totalGridHeight }}>
                            {hours.map((h, i) => (
                                <div
                                    key={h}
                                    className="absolute right-2 -translate-y-1/2 text-slate/40 text-xs bg-white px-1"
                                    style={{ top: i * HOUR_HEIGHT + GRID_PADDING }}
                                >
                                    {String(h).padStart(2, '0')}:00
                                </div>
                            ))}
                        </div>

                        {days.map((day, dayIdx) => (
                            <div
                                key={dayIdx}
                                className="border-r border-slate/10 last:border-r-0 relative"
                                style={{ height: totalGridHeight }}
                            >
                                <ColumnBackground />
                                {apptsFor(day).map(renderBlock)}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}