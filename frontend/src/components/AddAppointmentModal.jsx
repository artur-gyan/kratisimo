import { useState, useEffect } from 'react';
import { X, Search, User, UserPlus } from 'lucide-react';
import { catalogService } from '../services/catalogService';
import { customerSearchService } from '../services/customerSearchService';
import { adminAppointmentService } from '../services/adminAppointmentService';

// Στρογγυλοποιεί "HH:mm" στο κοντινότερο πολλαπλάσιο του granularity.
// π.χ. granularity=15: 12:12 → 12:15, 12:07 → 12:00.
function snapToGranularity(timeStr, granularity) {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMin = h * 60 + m;
    const snapped = Math.round(totalMin / granularity) * granularity;
    // clamp στο 0..1439 (μην ξεπεράσει τα μεσάνυχτα λόγω στρογγυλοποίησης)
    const clamped = Math.min(snapped, 23 * 60 + 59);
    const sh = Math.floor(clamped / 60);
    const sm = clamped % 60;
    return `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
}

// Χτίζει ISO Instant string από τοπική ημερομηνία + ώρα.
function buildInstant(dateStr, timeStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, min] = timeStr.split(':').map(Number);
    return new Date(y, m - 1, d, h, min).toISOString();
}

export default function AddAppointmentModal({
                                                initialDate,
                                                initialTime,
                                                initialEmployeeId,
                                                employees,
                                                granularity,       // ΝΕΟ: για step + snap
                                                onClose,
                                                onCreated,
                                            }) {
    const [customerMode, setCustomerMode] = useState('registered');

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [searching, setSearching] = useState(false);

    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');

    const [services, setServices] = useState([]);
    const [selectedServiceIds, setSelectedServiceIds] = useState([]);

    const [employeeId, setEmployeeId] = useState(initialEmployeeId ?? '');
    const [date, setDate] = useState(initialDate || '');
    const [time, setTime] = useState(initialTime || '');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        catalogService.getServices()
            .then((all) => setServices(all.filter((s) => s.active)))
            .catch((err) => setError(err.message));
    }, []);

    useEffect(() => {
        if (customerMode !== 'registered') return;
        if (query.trim().length < 3) {
            setResults([]);
            return;
        }
        setSearching(true);
        const t = setTimeout(() => {
            customerSearchService.search(query.trim())
                .then((res) => setResults(res))
                .catch(() => setResults([]))
                .finally(() => setSearching(false));
        }, 300);
        return () => clearTimeout(t);
    }, [query, customerMode]);

    function toggleService(id) {
        setSelectedServiceIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    async function handleSubmit() {
        setError('');

        if (selectedServiceIds.length === 0) {
            setError('Επίλεξε τουλάχιστον μία υπηρεσία.');
            return;
        }
        if (!date || !time) {
            setError('Συμπλήρωσε ημερομηνία και ώρα.');
            return;
        }
        if (customerMode === 'registered' && !selectedCustomer) {
            setError('Επίλεξε πελάτη ή άλλαξε σε περαστικό.');
            return;
        }
        if (customerMode === 'guest' && !guestName.trim()) {
            setError('Συμπλήρωσε το όνομα του περαστικού πελάτη.');
            return;
        }

        // Snap στο granularity (12:12 → 12:15). Δίχτυ για χειροκίνητη πληκτρολόγηση.
        const snappedTime = snapToGranularity(time, granularity || 15);

        const body = {
            serviceIds: selectedServiceIds,
            employeeId: employeeId === '' ? null : Number(employeeId),
            startsAt: buildInstant(date, snappedTime),
            customerId: customerMode === 'registered' ? selectedCustomer.id : null,
            guestName: customerMode === 'guest' ? guestName.trim() : null,
            guestPhone: customerMode === 'guest' && guestPhone.trim() ? guestPhone.trim() : null,
        };

        setSubmitting(true);
        try {
            await adminAppointmentService.create(body);
            onCreated();
        } catch (err) {
            if (err.status === 409) {
                setError('Ο υπάλληλος είναι ήδη κλεισμένος αυτή την ώρα.');
            } else {
                setError(err.message || 'Κάτι πήγε στραβά.');
            }
        } finally {
            setSubmitting(false);
        }
    }

    const activeEmployees = employees.filter((e) => e.active);
    const stepSeconds = (granularity || 15) * 60;  // <input type="time"> step = δευτερόλεπτα

    return (
        <div
            className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate/10 sticky top-0 bg-white z-10">
                    <h2 className="text-lg font-semibold text-slate">Νέο ραντεβού</h2>
                    <button onClick={onClose} className="text-slate/40 hover:text-slate transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {error && (
                        <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 text-sm">{error}</div>
                    )}

                    {/* --- Τύπος πελάτη --- */}
                    <div>
                        <p className="text-slate/60 text-xs mb-2">Πελάτης</p>
                        <div className="flex rounded-lg border border-slate/15 overflow-hidden mb-3">
                            <button
                                onClick={() => setCustomerMode('registered')}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${customerMode === 'registered' ? 'bg-blue text-white' : 'text-slate/70 hover:bg-page'}`}
                            >
                                <User size={15} /> Εγγεγραμμένος
                            </button>
                            <button
                                onClick={() => setCustomerMode('guest')}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${customerMode === 'guest' ? 'bg-blue text-white' : 'text-slate/70 hover:bg-page'}`}
                            >
                                <UserPlus size={15} /> Περαστικός
                            </button>
                        </div>

                        {customerMode === 'registered' ? (
                            <div>
                                {selectedCustomer ? (
                                    <div className="flex items-center justify-between bg-blue-tint rounded-lg px-3 py-2">
                                        <div>
                                            <div className="text-sm font-medium text-slate">{selectedCustomer.fullName}</div>
                                            {selectedCustomer.phone && (
                                                <div className="text-xs text-slate/60">{selectedCustomer.phone}</div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => { setSelectedCustomer(null); setQuery(''); setResults([]); }}
                                            className="text-blue text-sm font-medium hover:underline"
                                        >
                                            Αλλαγή
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate/40" />
                                        <input
                                            type="text"
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            placeholder="Όνομα ή τηλέφωνο (min 3 χαρακτήρες)..."
                                            className="w-full border border-slate/15 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue"
                                        />
                                        {searching && (
                                            <div className="text-xs text-slate/50 mt-1 px-1">Αναζήτηση...</div>
                                        )}
                                        {results.length > 0 && (
                                            <div className="mt-1 border border-slate/15 rounded-lg overflow-hidden divide-y divide-slate/10 max-h-48 overflow-y-auto">
                                                {results.map((c) => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => { setSelectedCustomer(c); setResults([]); }}
                                                        className="w-full text-left px-3 py-2 hover:bg-page transition-colors"
                                                    >
                                                        <div className="text-sm text-slate">{c.fullName}</div>
                                                        {c.phone && <div className="text-xs text-slate/60">{c.phone}</div>}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {query.trim().length >= 3 && !searching && results.length === 0 && (
                                            <div className="text-xs text-slate/50 mt-1 px-1">Κανένα αποτέλεσμα.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    placeholder="Ονοματεπώνυμο"
                                    className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue"
                                />
                                <input
                                    type="text"
                                    value={guestPhone}
                                    onChange={(e) => setGuestPhone(e.target.value)}
                                    placeholder="Τηλέφωνο (προαιρετικό)"
                                    className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue"
                                />
                            </div>
                        )}
                    </div>

                    {/* --- Υπηρεσίες --- */}
                    <div>
                        <p className="text-slate/60 text-xs mb-2">Υπηρεσίες</p>
                        <div className="border border-slate/15 rounded-lg divide-y divide-slate/10 max-h-48 overflow-y-auto">
                            {services.map((s) => (
                                <label
                                    key={s.id}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-page cursor-pointer transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedServiceIds.includes(s.id)}
                                        onChange={() => toggleService(s.id)}
                                        className="accent-blue"
                                    />
                                    <span className="flex-1 text-sm text-slate">{s.name}</span>
                                    <span className="text-xs text-slate/50">{s.durationMinutes}′ · {Number(s.price).toFixed(2)}€</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* --- Υπάλληλος --- */}
                    <div>
                        <p className="text-slate/60 text-xs mb-2">Υπάλληλος</p>
                        <select
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate bg-white focus:outline-none focus:border-blue"
                        >
                            <option value="">Οποιοσδήποτε διαθέσιμος</option>
                            {activeEmployees.map((emp) => (
                                <option key={emp.employeeProfileId} value={emp.employeeProfileId}>
                                    {emp.fullName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* --- Ημερομηνία + ώρα (override ωραρίου, αλλά snap στο granularity) --- */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-slate/60 text-xs mb-2">Ημερομηνία</p>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                            />
                        </div>
                        <div>
                            <p className="text-slate/60 text-xs mb-2">Ώρα</p>
                            <input
                                type="time"
                                value={time}
                                step={stepSeconds}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                            />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate/10 flex justify-end gap-2 sticky bottom-0 bg-white">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-slate/15 text-slate text-sm font-medium hover:bg-page transition-colors"
                    >
                        Άκυρο
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg bg-blue text-white text-sm font-medium hover:bg-blue/90 transition-colors disabled:opacity-50"
                    >
                        {submitting ? 'Κλείσιμο...' : 'Κλείσε ραντεβού'}
                    </button>
                </div>
            </div>
        </div>
    );
}