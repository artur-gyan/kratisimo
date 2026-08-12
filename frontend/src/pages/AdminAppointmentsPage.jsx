import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { adminAppointmentService } from '../services/adminAppointmentService';
import { adminEmployeeService } from '../services/adminEmployeeService';
import { settingsService } from '../services/settingsService';
import { workingHoursService } from '../services/workingHoursService';
import { timeOffService } from '../services/timeOffService';
import AppointmentDetailModal from '../components/AppointmentDetailModal';
import AddAppointmentModal from '../components/AddAppointmentModal';
import RescheduleModal from '../components/RescheduleModal';

// --- Ρυθμίσεις grid ---
const START_HOUR = 8;
const END_HOUR = 22;
const HOUR_HEIGHT = 90;
const GRID_PADDING = 12;

const DAY_NAMES = ['Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ', 'Κυρ'];
const MONTH_NAMES = [
    'Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου',
    'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου',
];

const JS_DAY_TO_ENUM = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

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

function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function toDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Χτίζει ISO Instant από τοπική μέρα (Date) + λεπτά-από-μεσάνυχτα.
function buildInstantFromDayMinutes(day, minutes) {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    d.setMinutes(minutes);
    return d.toISOString();
}

export default function AdminAppointmentsPage() {
    const [viewMode, setViewMode] = useState('week');
    const [anchorDate, setAnchorDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [appointments, setAppointments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [granularity, setGranularity] = useState(15);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(null);
    const [addModal, setAddModal] = useState(null);
    const [rescheduleTarget, setRescheduleTarget] = useState(null); // ΝΕΟ: ραντεβού προς reschedule
    const [dragError, setDragError] = useState('');

    const [workingHoursMap, setWorkingHoursMap] = useState({});
    const [timeOffMap, setTimeOffMap] = useState({});

    const days = viewMode === 'week'
        ? Array.from({ length: 7 }, (_, i) => addDays(getMonday(anchorDate), i))
        : [anchorDate];

    const activeEmployees = employees.filter((e) => e.active);

    useEffect(() => {
        async function loadStatic() {
            try {
                const [emps, settings] = await Promise.all([
                    adminEmployeeService.getAll(),
                    settingsService.get(),
                ]);
                setEmployees(emps);
                setGranularity(settings.slotGranularityMinutes || 15);

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

    useEffect(() => {
        if (activeEmployees.length === 0) return;
        async function loadHours() {
            try {
                const results = await Promise.all(
                    activeEmployees.map((emp) =>
                        workingHoursService.getSchedule(emp.employeeProfileId)
                            .then((res) => [emp.employeeProfileId, res.shifts || []])
                            .catch(() => [emp.employeeProfileId, []])
                    )
                );
                setWorkingHoursMap(Object.fromEntries(results));
            } catch {
                // σιωπηλά
            }
        }
        loadHours();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employees]);

    useEffect(() => {
        if (activeEmployees.length === 0) return;
        async function loadTimeOff() {
            try {
                const results = await Promise.all(
                    activeEmployees.map((emp) =>
                        timeOffService.list(emp.employeeProfileId)
                            .then((res) => [emp.employeeProfileId, res || []])
                            .catch(() => [emp.employeeProfileId, []])
                    )
                );
                setTimeOffMap(Object.fromEntries(results));
            } catch {
                // σιωπηλά
            }
        }
        loadTimeOff();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employees, viewMode, anchorDate]);

    async function loadAppointments() {
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

    useEffect(() => {
        loadAppointments();
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

    const visibleAppointments = appointments.filter((a) => a.status !== 'CANCELLED');

    function apptsFor(day, employeeId = null) {
        return visibleAppointments.filter((a) => {
            if (!isSameDay(new Date(a.startsAt), day)) return false;
            if (employeeId !== null && a.employeeId !== employeeId) return false;
            return true;
        });
    }

    function dayStatus(day, employeeId) {
        const offs = timeOffMap[employeeId] || [];
        const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
        const onLeave = offs.some((t) => {
            const s = new Date(t.startsAt);
            const e = new Date(t.endsAt);
            return s < dayEnd && e > dayStart;
        });

        const enumDay = JS_DAY_TO_ENUM[day.getDay()];
        const shifts = (workingHoursMap[employeeId] || []).filter((s) => s.dayOfWeek === enumDay);
        const closed = shifts.length === 0;

        return { closed, onLeave, shifts };
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

    function shiftBand(shift) {
        const startMin = timeToMinutes(shift.startTime) - START_HOUR * 60;
        const endMin = timeToMinutes(shift.endTime) - START_HOUR * 60;
        const top = (startMin / 60) * HOUR_HEIGHT + GRID_PADDING;
        const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
        return { top: Math.max(top, GRID_PADDING), height: Math.max(height, 0) };
    }

    function handleColumnClick(e, day, employeeId) {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top - GRID_PADDING;
        if (y < 0) return;

        const minutesFromStart = (y / HOUR_HEIGHT) * 60;
        const absoluteMinutes = START_HOUR * 60 + minutesFromStart;
        const snapped = Math.floor(absoluteMinutes / granularity) * granularity;
        const h = Math.floor(snapped / 60);
        const m = snapped % 60;

        setAddModal({
            date: toDateStr(day),
            time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
            employeeId: employeeId ?? null,
        });
    }

    // --- ΝΕΟ: drag-and-drop reschedule ---
    // Στο drop υπολογίζω νέα ώρα (Y→snap) + νέο υπάλληλο/μέρα (η στήλη), καλώ reschedule.
    async function handleDrop(e, day, employeeId) {
        e.preventDefault();
        const raw = e.dataTransfer.getData('text/plain');
        if (!raw) return;

        const [apptId, grabOffsetStr] = raw.split(':');
        const grabOffset = Number(grabOffsetStr) || 0;

        const appt = visibleAppointments.find((a) => String(a.id) === apptId);
        if (!appt) return;

        const rect = e.currentTarget.getBoundingClientRect();
        // Αφαίρεσε το grab offset: πού πάει η ΑΡΧΗ του block, όχι το ποντίκι.
        const y = e.clientY - rect.top - GRID_PADDING - grabOffset;
        const minutesFromStart = (y / HOUR_HEIGHT) * 60;
        const absoluteMinutes = START_HOUR * 60 + minutesFromStart;
        const snapped = Math.round(absoluteMinutes / granularity) * granularity;
        const clamped = Math.max(START_HOUR * 60, Math.min(snapped, END_HOUR * 60));

        const newStartsAt = buildInstantFromDayMinutes(day, clamped);

        const sameTime = new Date(appt.startsAt).toISOString() === newStartsAt;
        const sameEmployee = appt.employeeId === employeeId;
        if (sameTime && sameEmployee) return;

        setDragError('');
        try {
            await adminAppointmentService.reschedule(appt.id, {
                startsAt: newStartsAt,
                employeeId: employeeId,
            });
            loadAppointments();
        } catch (err) {
            if (err.status === 409) {
                setDragError('Ο υπάλληλος είναι ήδη κλεισμένος αυτή την ώρα.');
            } else {
                setDragError(err.message || 'Ο επαναπρογραμματισμός απέτυχε.');
            }
        }
    }

    function allowDrop(e) {
        e.preventDefault();  // ΑΠΑΡΑΙΤΗΤΟ: χωρίς αυτό το drop δεν πυροδοτείται.
    }

    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
    const totalGridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT + GRID_PADDING * 2;

    const linesPerHour = Math.max(1, Math.round(60 / granularity));
    const granularityStep = HOUR_HEIGHT / linesPerHour;

    const rangeLabel = viewMode === 'week'
        ? `${days[0].getDate()} – ${days[6].getDate()} ${MONTH_NAMES[days[6].getMonth()]} ${days[6].getFullYear()}`
        : `${DAY_NAMES[(anchorDate.getDay() + 6) % 7]} ${anchorDate.getDate()} ${MONTH_NAMES[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`;

    function renderBlock(appt) {
        const pos = blockPosition(appt);
        const style = STATUS_BLOCK[appt.status] || STATUS_BLOCK.PENDING;

        const availableForServices = pos.height - 42;
        const maxServiceLines = Math.max(0, Math.floor(availableForServices / 16));
        const showServices = maxServiceLines >= 1;
        const shownServices = showServices ? appt.serviceNames.slice(0, maxServiceLines) : [];
        const hiddenCount = appt.serviceNames.length - shownServices.length;

        // Μόνο CONFIRMED σέρνεται (ίδιο κριτήριο με backend reschedule, D145).
        const draggable = appt.status === 'CONFIRMED';

        return (
            <button
                key={appt.id}
                draggable={draggable}
                onDragStart={(e) => {
                    const blockRect = e.currentTarget.getBoundingClientRect();
                    const grabOffset = e.clientY - blockRect.top;
                    // id + offset μαζί, χωρισμένα με ":" — κανένα state, κανένα re-render.
                    e.dataTransfer.setData('text/plain', `${appt.id}:${grabOffset}`);
                    e.dataTransfer.effectAllowed = 'move';
                }}
                onClick={(e) => { e.stopPropagation(); setSelected(appt); }}
                className={`absolute left-1 right-1 rounded-lg border px-2 py-1 text-left overflow-hidden hover:shadow-md transition-shadow z-10 ${style} ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
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
            </button>
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
                {Array.from({ length: (END_HOUR - START_HOUR) * linesPerHour }, (_, i) => {
                    if (i % linesPerHour === 0) return null;
                    return (
                        <div
                            key={`g-${i}`}
                            className="absolute left-0 right-0 border-b border-slate/15 border-dashed"
                            style={{ top: i * granularityStep + GRID_PADDING }}
                        />
                    );
                })}
            </>
        );
    }

    function StatusOverlay({ status }) {
        if (status.onLeave) {
            return (
                <div
                    className="absolute inset-0 z-0 pointer-events-none flex items-start justify-center pt-3"
                    style={{
                        background:
                            'repeating-linear-gradient(45deg, rgba(163,45,45,0.10) 0, rgba(163,45,45,0.10) 10px, rgba(163,45,45,0.16) 10px, rgba(163,45,45,0.16) 20px)',
                    }}
                >
                    <span className="bg-danger text-white text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full shadow-sm">
                        ΑΔΕΙΑ
                    </span>
                </div>
            );
        }
        if (status.closed) {
            return (
                <div
                    className="absolute inset-0 z-0 pointer-events-none flex items-start justify-center pt-3"
                    style={{
                        background:
                            'repeating-linear-gradient(45deg, rgba(15,23,42,0.05) 0, rgba(15,23,42,0.05) 10px, rgba(15,23,42,0.09) 10px, rgba(15,23,42,0.09) 20px)',
                    }}
                >
                    <span className="bg-slate text-white text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full shadow-sm">
                        ΡΕΠΟ
                    </span>
                </div>
            );
        }
        return (
            <>
                <div className="absolute inset-0 bg-slate/[0.06] z-0 pointer-events-none" />
                {status.shifts.map((shift, i) => {
                    const band = shiftBand(shift);
                    return (
                        <div
                            key={i}
                            className="absolute left-0 right-0 bg-white z-0 pointer-events-none"
                            style={{ top: band.top, height: band.height }}
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

                    {days.map((day, dayIdx) => {
                        const status = selectedEmployeeId ? dayStatus(day, selectedEmployeeId) : null;
                        return (
                            <div
                                key={dayIdx}
                                onClick={(e) => selectedEmployeeId && handleColumnClick(e, day, selectedEmployeeId)}
                                onDragOver={allowDrop}
                                onDrop={(e) => selectedEmployeeId && handleDrop(e, day, selectedEmployeeId)}
                                className="border-r border-slate/10 last:border-r-0 relative cursor-pointer"
                                style={{ height: totalGridHeight }}
                            >
                                {status && <StatusOverlay status={status} />}
                                <ColumnBackground />
                                {apptsFor(day, selectedEmployeeId).map(renderBlock)}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ================= DAY VIEW =================
    function DayView() {
        return (
            <div className="bg-white border border-slate/10 rounded-2xl overflow-hidden">
                <div className="grid border-b border-slate/10" style={{ gridTemplateColumns: `60px repeat(${activeEmployees.length}, 1fr)` }}>
                    <div className="border-r border-slate/10" />
                    {activeEmployees.map((emp) => (
                        <div key={emp.employeeProfileId} className="px-2 py-3 text-center border-r border-slate/10 last:border-r-0">
                            <div className="text-sm font-semibold text-slate truncate">{emp.fullName}</div>
                        </div>
                    ))}
                </div>

                {activeEmployees.length === 0 ? (
                    <div className="py-16 text-center text-slate/50">Κανένας ενεργός υπάλληλος.</div>
                ) : (
                    <div className="grid" style={{ gridTemplateColumns: `60px repeat(${activeEmployees.length}, 1fr)` }}>
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

                        {activeEmployees.map((emp) => {
                            const status = dayStatus(anchorDate, emp.employeeProfileId);
                            return (
                                <div
                                    key={emp.employeeProfileId}
                                    onClick={(e) => handleColumnClick(e, anchorDate, emp.employeeProfileId)}
                                    onDragOver={allowDrop}
                                    onDrop={(e) => handleDrop(e, anchorDate, emp.employeeProfileId)}
                                    className="border-r border-slate/10 last:border-r-0 relative cursor-pointer"
                                    style={{ height: totalGridHeight }}
                                >
                                    <StatusOverlay status={status} />
                                    <ColumnBackground />
                                    {apptsFor(anchorDate, emp.employeeProfileId).map(renderBlock)}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-semibold text-slate">Ραντεβού</h1>
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
                    <button
                        onClick={() => setAddModal({ date: '', time: '', employeeId: null })}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue text-white text-sm font-medium hover:bg-blue/90 transition-colors mr-2"
                    >
                        <Plus size={16} /> Νέο ραντεβού
                    </button>

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
            {dragError && (
                <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                    <span>{dragError}</span>
                    <button onClick={() => setDragError('')} className="text-danger/60 hover:text-danger text-sm">✕</button>
                </div>
            )}

            {loading ? (
                <div className="bg-white border border-slate/10 rounded-2xl py-16 text-center text-slate/50">Φόρτωση...</div>
            ) : (
                viewMode === 'week' ? <WeekView /> : <DayView />
            )}

            {selected && (
                <AppointmentDetailModal
                    appointment={selected}
                    onClose={() => setSelected(null)}
                    onChanged={() => { setSelected(null); loadAppointments(); }}
                    onReschedule={(appt) => { setSelected(null); setRescheduleTarget(appt); }}
                />
            )}

            {addModal && (
                <AddAppointmentModal
                    initialDate={addModal.date}
                    initialTime={addModal.time}
                    initialEmployeeId={addModal.employeeId}
                    employees={employees}
                    granularity={granularity}
                    onClose={() => setAddModal(null)}
                    onCreated={() => { setAddModal(null); loadAppointments(); }}
                />
            )}

            {rescheduleTarget && (
                <RescheduleModal
                    appointment={rescheduleTarget}
                    employees={employees}
                    granularity={granularity}
                    onClose={() => setRescheduleTarget(null)}
                    onRescheduled={() => { setRescheduleTarget(null); loadAppointments(); }}
                />
            )}
        </div>
    );
}