import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { adminAppointmentService } from '../services/adminAppointmentService';
import { adminEmployeeService } from '../services/adminEmployeeService';
import { settingsService } from '../services/settingsService';
import AppointmentDetailModal from '../components/AppointmentDetailModal';

// --- Ρυθμίσεις grid ---
const START_HOUR = 8;
const END_HOUR = 22;
const HOUR_HEIGHT = 90; // pixels ανά ώρα (μεγαλύτερο → χωράει όνομα σε μικρά ραντεβού)
const GRID_PADDING = 12; // χώρος πάνω/κάτω ώστε 08:00 & 22:00 να μην κόβονται

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
    // CANCELLED σκόπιμα ΕΚΤΟΣ — φιλτράρεται πριν το render
};

// --- Helpers ημερομηνιών ---
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

export default function AdminAppointmentsPage() {
    const [viewMode, setViewMode] = useState('week'); // 'week' | 'day'
    const [anchorDate, setAnchorDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [appointments, setAppointments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [granularity, setGranularity] = useState(15); // fallback· ενημερώνεται από settings
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(null);

    // Μέρες που εμφανίζονται.
    const days = viewMode === 'week'
        ? Array.from({ length: 7 }, (_, i) => addDays(getMonday(anchorDate), i))
        : [anchorDate];

    // Ενεργοί υπάλληλοι (για dropdown week + στήλες day).
    const activeEmployees = employees.filter((e) => e.active);

    // --- Αρχική φόρτωση: υπάλληλοι + settings (μία φορά) ---
    useEffect(() => {
        async function loadStatic() {
            try {
                const [emps, settings] = await Promise.all([
                    adminEmployeeService.getAll(),
                    settingsService.get(),
                ]);
                setEmployees(emps);
                setGranularity(settings.slotGranularityMinutes || 15);

                // Προεπιλογή week: πρώτος ενεργός υπάλληλος.
                const firstActive = emps.find((e) => e.active);
                if (firstActive) {
                    setSelectedEmployeeId(firstActive.employeeProfileId);
                }
            } catch (err) {
                setError(err.message);
            }
        }
        loadStatic();
    }, []);

    // --- Φόρτωση ραντεβού ανά ορατό εύρος ---
    useEffect(() => {
        async function load() {
            setLoading(true);
            setError('');
            try {
                const from = days[0];
                const to = days[days.length - 1];
                const result = await adminAppointmentService.getInRange(from, to);
                setAppointments(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, anchorDate]);

    function navigate(direction) {
        const step = viewMode === 'week' ? 7 : 1;
        setAnchorDate((prev) => addDays(prev, direction * step));
    }

    function goToday() {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        setAnchorDate(d);
    }

    // Ενεργά (μη-ακυρωμένα) ραντεβού — βάση για όλα τα φίλτρα.
    const visibleAppointments = appointments.filter((a) => a.status !== 'CANCELLED');

    // Ραντεβού μιας μέρας (προαιρετικά ενός υπαλλήλου).
    function apptsFor(day, employeeId = null) {
        return visibleAppointments.filter((a) => {
            if (!isSameDay(new Date(a.startsAt), day)) return false;
            if (employeeId !== null && a.employeeId !== employeeId) return false;
            return true;
        });
    }

    // Θέση block.
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

    // Γραμμές granularity: κάθε πόσα px μπαίνει λεπτή γραμμή.
    const linesPerHour = Math.max(1, Math.round(60 / granularity));
    const granularityStep = HOUR_HEIGHT / linesPerHour;

    const rangeLabel = viewMode === 'week'
        ? `${days[0].getDate()} – ${days[6].getDate()} ${MONTH_NAMES[days[6].getMonth()]} ${days[6].getFullYear()}`
        : `${DAY_NAMES[(anchorDate.getDay() + 6) % 7]} ${anchorDate.getDate()} ${MONTH_NAMES[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`;

    // --- Render ενός appointment block ---
    function renderBlock(appt) {
        const pos = blockPosition(appt);
        const style = STATUS_BLOCK[appt.status] || STATUS_BLOCK.PENDING;
        return (
            <button
                key={appt.id}
                onClick={() => setSelected(appt)}
                className={`absolute left-1 right-1 rounded-lg border px-2 py-1 text-left overflow-hidden hover:shadow-md transition-shadow z-10 ${style}`}
                style={{ top: pos.top, height: pos.height }}
            >
                <div className="text-xs font-semibold truncate">{formatTime(appt.startsAt)}</div>
                <div className="text-xs truncate">{appt.customerName}</div>
                {pos.height > 55 && (
                    <div className="text-xs truncate opacity-70">{appt.serviceNames.join(', ')}</div>
                )}
            </button>
        );
    }

    // --- Background γραμμές (ώρες + granularity) για μία στήλη ---
    function ColumnBackground() {
        return (
            <>
                {/* Ώρες: έντονη γραμμή */}
                {hours.slice(0, -1).map((h, i) => (
                    <div
                        key={`h-${h}`}
                        className="absolute left-0 right-0 border-b border-slate/10"
                        style={{ top: i * HOUR_HEIGHT + GRID_PADDING }}
                    />
                ))}
                {/* Granularity: λεπτές γραμμές (παραλείπει όσες πέφτουν πάνω στις ώρες) */}
                {Array.from({ length: (END_HOUR - START_HOUR) * linesPerHour }, (_, i) => {
                    if (i % linesPerHour === 0) return null; // ώρα, ήδη ζωγραφισμένη
                    return (
                        <div
                            key={`g-${i}`}
                            className="absolute left-0 right-0 border-b border-slate/5"
                            style={{ top: i * granularityStep + GRID_PADDING }}
                        />
                    );
                })}
            </>
        );
    }

    // ================= WEEK VIEW =================
    function WeekView() {
        return (
            <div className="bg-white border border-slate/10 rounded-2xl overflow-hidden">
                {/* Header μερών */}
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

                {/* Body */}
                <div className="grid" style={{ gridTemplateColumns: `60px repeat(7, 1fr)` }}>
                    {/* Στήλη ωρών */}
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

                    {/* Στήλες μερών */}
                    {days.map((day, dayIdx) => (
                        <div key={dayIdx} className="border-r border-slate/10 last:border-r-0 relative" style={{ height: totalGridHeight }}>
                            <ColumnBackground />
                            {apptsFor(day, selectedEmployeeId).map(renderBlock)}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ================= DAY VIEW =================
    function DayView() {
        return (
            <div className="bg-white border border-slate/10 rounded-2xl overflow-hidden">
                {/* Header υπαλλήλων */}
                <div className="grid border-b border-slate/10" style={{ gridTemplateColumns: `60px repeat(${activeEmployees.length}, 1fr)` }}>
                    <div className="border-r border-slate/10" />
                    {activeEmployees.map((emp) => (
                        <div key={emp.employeeProfileId} className="px-2 py-3 text-center border-r border-slate/10 last:border-r-0">
                            <div className="text-sm font-semibold text-slate truncate">{emp.fullName}</div>
                        </div>
                    ))}
                </div>

                {/* Body */}
                {activeEmployees.length === 0 ? (
                    <div className="py-16 text-center text-slate/50">Κανένας ενεργός υπάλληλος.</div>
                ) : (
                    <div className="grid" style={{ gridTemplateColumns: `60px repeat(${activeEmployees.length}, 1fr)` }}>
                        {/* Στήλη ωρών */}
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

                        {/* Στήλες υπαλλήλων */}
                        {activeEmployees.map((emp) => (
                            <div key={emp.employeeProfileId} className="border-r border-slate/10 last:border-r-0 relative" style={{ height: totalGridHeight }}>
                                <ColumnBackground />
                                {apptsFor(anchorDate, emp.employeeProfileId).map(renderBlock)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">

            {/* --- Toolbar --- */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-semibold text-slate">Ραντεβού</h1>

                    {/* Dropdown υπαλλήλου — ΜΟΝΟ σε week view */}
                    {viewMode === 'week' && (
                        <div className="flex items-center gap-2">
                            <span className="text-slate/60 text-sm">Υπάλληλος:</span>
                            <select
                                value={selectedEmployeeId || ''}
                                onChange={(e) => setSelectedEmployeeId(Number(e.target.value))}
                                className="border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate bg-white focus:outline-none focus:border-blue"
                            >
                                {activeEmployees.map((emp) => (
                                    <option key={emp.employeeProfileId} value={emp.employeeProfileId}>
                                        {emp.fullName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

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

                    <div className="flex rounded-lg border border-slate/15 overflow-hidden ml-2">
                        <button
                            onClick={() => setViewMode('day')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'day' ? 'bg-blue text-white' : 'text-slate/70 hover:bg-page'}`}
                        >
                            Ημέρα
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-blue text-white' : 'text-slate/70 hover:bg-page'}`}
                        >
                            Εβδομάδα
                        </button>
                    </div>
                </div>
            </div>

            <p className="text-slate/60 text-sm mb-4">{rangeLabel}</p>

            {error && (
                <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 mb-4">{error}</div>
            )}

            {loading ? (
                <div className="bg-white border border-slate/10 rounded-2xl py-16 text-center text-slate/50">Φόρτωση...</div>
            ) : (
                viewMode === 'week' ? <WeekView /> : <DayView />
            )}

            {selected && (
                <AppointmentDetailModal appointment={selected} onClose={() => setSelected(null)} />
            )}
        </div>
    );
}
