import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Check, Clock, Star, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';


export default function BookingPage() {
    // ─── WIZARD STATE ───
    // Ένα component κρατάει ΟΛΟ το state της ροής (τοπικά, όχι context —
    // το state ζει και πεθαίνει σε αυτή τη σελίδα, δεν το χρειάζεται κανείς έξω).
    const [step, setStep] = useState(1);

    // selectedServices: ΟΛΟΚΛΗΡΑ objects (όχι μόνο ids) — το UI δείχνει
    // ονόματα/τιμές/διάρκεια. Στο booking POST στέλνουμε μόνο τα ids.
    const [selectedServices, setSelectedServices] = useState([]);

    // Ο επιλεγμένος υπάλληλος (object, ή null πριν επιλέξει).
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // Δεδομένα βήματος 2: λίστα διαθέσιμων υπαλλήλων + το δικό του loading/error.
    const [employees, setEmployees] = useState([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [employeesError, setEmployeesError] = useState('');

    // Ποιου υπαλλήλου το προφίλ βλέπουμε στο modal (id, ή null = κλειστό).
    // Κρατάμε ΜΟΝΟ το id (όχι ολόκληρο object): το modal κάνει το δικό του
    // fetch για τα reviews, οπότε το id αρκεί. Το state ζει στο page level
    // (όχι μέσα στην κάρτα) → το modal είναι top-level component, ΟΧΙ φωλιασμένο.
    const [profileEmployee, setProfileEmployee] = useState(null);

    // Βήμα 3: ημερομηνία (string "YYYY-MM-DD") + επιλεγμένο slot (Instant string).
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState(null);

    // Δεδομένα βήματος 3: διαθέσιμα slots + loading/error.
    const [slots, setSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [slotsError, setSlotsError] = useState('');

    // ─── ΔΕΔΟΜΕΝΑ ΒΗΜΑΤΟΣ 1 ───
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Βήμα 4: κατάσταση του booking request.
    const [booking, setBooking] = useState(false);        // τρέχει το POST;
    const [bookingError, setBookingError] = useState('');  // γενικό σφάλμα
    const [confirmedBooking, setConfirmedBooking] = useState(null); // η επιτυχής απάντηση

    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    // Φόρτωση υπηρεσιών στο mount.
    useEffect(() => {
        async function loadServices() {
            try {
                const data = await api.get('/services');
                setServices(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        loadServices();
    }, []);

    // ─── PRESELECT υπηρεσίας από URL (?service=ID) — landing deep-link ───
    // Τρέχει ΟΤΑΝ φορτωθούν οι υπηρεσίες (χρειάζεται τη λίστα για να βρει το object).
    // ΔΕΝ εφαρμόζεται αν υπάρχει pendingBooking (guest restore προηγείται).
    useEffect(() => {
        if (services.length === 0) return;
        if (sessionStorage.getItem('pendingBooking')) return;

        const serviceId = searchParams.get('service');
        if (!serviceId) return;

        const service = services.find((s) => String(s.id) === serviceId);
        if (service) {
            setSelectedServices([service]);  // βήμα 1, τσεκαρισμένη — ο χρήστης μπορεί να προσθέσει κι άλλες
        }
    }, [services, searchParams]);

    // ─── GUEST FLOW: restore επιλογών μετά από login/register (D51) ───
    // Αν ο ανώνυμος πάτησε "Επιβεβαίωση" στο βήμα 4, οι επιλογές του σώθηκαν
    // σε sessionStorage πριν το redirect στο /login. Τώρα που γύρισε (logged in),
    // τις ξαναφορτώνουμε και τον πάμε ΚΑΤΕΥΘΕΙΑΝ στο βήμα 4 (προ-συμπληρωμένο).
    useEffect(() => {
        const raw = sessionStorage.getItem('pendingBooking');
        if (!raw) return;

        // Restore ΜΟΝΟ αν είναι πλέον logged in (αλλιώς περιμένουμε το login).
        if (!user) return;

        try {
            const pending = JSON.parse(raw);
            setSelectedServices(pending.selectedServices || []);
            setSelectedEmployee(pending.selectedEmployee || null);
            setSelectedDate(pending.selectedDate || '');
            setSelectedSlot(pending.selectedSlot || null);
            setStep(4);
        } catch {
            // corrupt data — αγνόησε
        } finally {
            // Καθάρισε: το διαβάσαμε, δεν το χρειαζόμαστε άλλο (Απόφαση Γ).
            sessionStorage.removeItem('pendingBooking');
        }
    }, [user]);

    // Φόρτωσε υπαλλήλους ΟΤΑΝ φτάνουμε στο βήμα 2.
    // Dependency [step]: τρέχει κάθε φορά που αλλάζει το step.
    useEffect(() => {
        // Τρέχει ΜΟΝΟ στο βήμα 2, και μόνο αν έχουμε επιλεγμένες υπηρεσίες.
        if (step !== 2) return;

        async function loadEmployees() {
            setEmployeesLoading(true);
            setEmployeesError('');
            try {
                // Χτίζουμε το query param: serviceIds=1,4,7 (comma-separated).
                const ids = selectedServices.map((s) => s.id).join(',');
                const data = await api.get(`/employees/available?serviceIds=${ids}`);
                setEmployees(data);
            } catch (err) {
                setEmployeesError(err.message);
            } finally {
                setEmployeesLoading(false);
            }
        }
        loadEmployees();
    }, [step]);

    // Φόρτωσε slots όταν επιλεγεί ημερομηνία (στο βήμα 3).
    // Dependencies: [selectedDate, step] — ξανατρέχει αν αλλάξει η μέρα.
    useEffect(() => {
        if (step !== 3 || !selectedDate || !selectedEmployee) return;

        async function loadSlots() {
            setSlotsLoading(true);
            setSlotsError('');
            setSelectedSlot(null); // reset επιλογή αν άλλαξε η μέρα
            try {
                if (selectedEmployee.id === null) {
                    // «Οποιοσδήποτε»: κάλεσε availability για ΚΑΘΕ υπάλληλο της λίστας,
                    // ένωσε τα slots (unique + sorted). Η ΠΡΟΒΟΛΗ είναι η ένωση (D121)·
                    // η ΑΝΑΘΕΣΗ γίνεται least-loaded στο backend POST (D18).
                    const perEmployee = await Promise.all(
                        employees.map((emp) => {
                            const params = new URLSearchParams({
                                employeeId: emp.id,
                                date: selectedDate,
                                durationMinutes: totalDuration,
                            });
                            return api.get(`/availability?${params}`).catch(() => []);
                        })
                    );
                    const merged = [...new Set(perEmployee.flat())].sort();
                    setSlots(merged);
                } else {
                    // Συγκεκριμένος υπάλληλος: μία κλήση.
                    // durationMinutes = RAW άθροισμα (το backend κάνει ceiling).
                    const params = new URLSearchParams({
                        employeeId: selectedEmployee.id,
                        date: selectedDate,
                        durationMinutes: totalDuration,
                    });
                    const data = await api.get(`/availability?${params}`);
                    setSlots(data);
                }
            } catch (err) {
                setSlotsError(err.message);
            } finally {
                setSlotsLoading(false);
            }
        }
        loadSlots();
    }, [selectedDate, step]);

    // ─── ΛΟΓΙΚΗ ΕΠΙΛΟΓΗΣ ───
    // Toggle: αν είναι ήδη επιλεγμένη, αφαίρεσέ την· αλλιώς πρόσθεσέ την.
    function toggleService(service) {
        setSelectedServices((prev) => {
            const exists = prev.find((s) => s.id === service.id);
            if (exists) {
                return prev.filter((s) => s.id !== service.id);
            }
            return [...prev, service];
        });
    }
    // Το τελικό POST. Χειρίζεται τρεις εκβάσεις: επιτυχία / 409 / άλλο.
    async function handleBooking() {
        // ─── GUEST GATE (D51): ανώνυμος → σώσε επιλογές + πήγαινε login ───
        if (!user) {
            const pending = {
                selectedServices,
                selectedEmployee,
                selectedDate,
                selectedSlot,
            };
            sessionStorage.setItem('pendingBooking', JSON.stringify(pending));
            navigate('/login');
            return;
        }

        setBooking(true);
        setBookingError('');

        try {
            const payload = {
                serviceIds: selectedServices.map((s) => s.id),  // μόνο ids στο backend
                employeeId: selectedEmployee.id,
                startsAt: selectedSlot,   // το Instant string, ως έχει
            };
            const response = await api.post('/appointments', payload);
            setConfirmedBooking(response);  // επιτυχία → δείξε επιβεβαίωση
            sessionStorage.removeItem('pendingBooking');  // σιγουριά (Απόφαση Γ)
        } catch (err) {
            // 409 = το slot πιάστηκε στο μεσοδιάστημα (D84).
            // Το backend στέλνει 409 με μήνυμα· το api.js το πετάει ως error.
            // Ξεχωρίζουμε το 409 από άλλα σφάλματα με το status.
            if (err.status === 409) {
                setBookingError('Αυτή η ώρα μόλις κλείστηκε από άλλον. Διάλεξε άλλη ώρα.');
                setStep(3);              // γύρνα στο βήμα επιλογής ώρας
                setSelectedSlot(null);   // καθάρισε την πιασμένη ώρα
            } else {
                setBookingError(err.message);
            }
        } finally {
            setBooking(false);
        }
    }

    // Μηδενίζει όλο το wizard state για νέα κράτηση.
    // Δεν αρκεί navigate('/book') — το component δεν ξαναφορτώνεται αν είσαι
    // ήδη εκεί, άρα το state μένει κολλημένο στην οθόνη επιτυχίας.
    function resetWizard() {
        setStep(1);
        setSelectedServices([]);
        setSelectedEmployee(null);
        setSelectedDate('');
        setSelectedSlot(null);
        setSlots([]);
        setConfirmedBooking(null);
        setBookingError('');
    }

    function isSelected(serviceId) {
        return selectedServices.some((s) => s.id === serviceId);
    }

    // ─── ΠΑΡΑΓΩΓΑ (υπολογίζονται από το state) ───
    // Συνολική RAW διάρκεια — θα σταλεί στο availability (το backend κάνει ceiling).
    const totalDuration = selectedServices.reduce(
        (sum, s) => sum + s.durationMinutes, 0
    );
    const totalPrice = selectedServices.reduce(
        (sum, s) => sum + Number(s.price), 0
    );

    // ─── ΟΜΑΔΟΠΟΙΗΣΗ ανά κατηγορία ───
    // Το UI δείχνει τις υπηρεσίες ομαδοποιημένες (PROJECT.md Section 5).
    // Μετατρέπουμε flat λίστα → { categoryName: [services] }.
    const grouped = services.reduce((acc, service) => {
        const cat = service.categoryName;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(service);
        return acc;
    }, {});

    // ─── RENDER ───
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

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">

            {/* Στεπερ ένδειξη */}
            <StepIndicator currentStep={step} />

            {/* ─── ΒΗΜΑ 1: ΕΠΙΛΟΓΗ ΥΠΗΡΕΣΙΩΝ ─── */}
            {step === 1 && (
                <div>
                    <h1 className="text-2xl font-semibold text-slate mb-1">Επίλεξε υπηρεσίες</h1>
                    <p className="text-slate/60 text-sm mb-6">
                        Μπορείς να επιλέξεις περισσότερες από μία.
                    </p>

                    {/* Υπηρεσίες ομαδοποιημένες ανά κατηγορία */}
                    <div className="space-y-6">
                        {Object.keys(grouped).map((categoryName) => (
                            <div key={categoryName}>
                                <h2 className="text-sm font-semibold text-slate/50 uppercase tracking-wide mb-3">
                                    {categoryName}
                                </h2>
                                <div className="space-y-2">
                                    {grouped[categoryName].map((service) => (
                                        <button
                                            key={service.id}
                                            onClick={() => toggleService(service)}
                                            className={`w-full text-left flex items-center justify-between p-4 rounded-xl border transition-colors ${
                                                isSelected(service.id)
                                                    ? 'border-blue bg-blue-tint'
                                                    : 'border-slate/10 bg-white hover:border-slate/25'
                                            }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-slate font-medium">{service.name}</p>
                                                <p className="text-slate/50 text-sm flex items-center gap-1 mt-0.5">
                                                    <Clock size={13} />
                                                    {service.durationMinutes} λεπτά
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <span className="text-slate font-medium">
                                                    {Number(service.price).toFixed(2)} €
                                                </span>
                                                {/* Checkbox ένδειξη */}
                                                <span className={`w-6 h-6 rounded-md flex items-center justify-center ${
                                                    isSelected(service.id)
                                                        ? 'bg-blue text-white'
                                                        : 'border border-slate/25'
                                                }`}>
                                                    {isSelected(service.id) && <Check size={16} />}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Σύνοψη + κουμπί συνέχειας (sticky κάτω) */}
                    {selectedServices.length > 0 && (
                        <div className="sticky bottom-4 mt-6 bg-white border border-slate/15 rounded-2xl p-4 shadow-lg flex items-center justify-between">
                            <div>
                                <p className="text-slate font-medium">
                                    {selectedServices.length} {selectedServices.length === 1 ? 'υπηρεσία' : 'υπηρεσίες'}
                                </p>
                                <p className="text-slate/60 text-sm">
                                    {totalDuration} λεπτά · {totalPrice.toFixed(2)} €
                                </p>
                            </div>
                            <button
                                onClick={() => setStep(2)}
                                className="bg-blue text-white rounded-xl px-6 py-3 font-medium hover:bg-blue-soft transition-colors"
                            >
                                Συνέχεια
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ─── ΒΗΜΑΤΑ 2-4: placeholder, θα τα χτίσουμε ─── */}
            {/* ─── ΒΗΜΑ 2: ΕΠΙΛΟΓΗ ΥΠΑΛΛΗΛΟΥ ─── */}
            {step === 2 && (
                <div>
                    <h1 className="text-2xl font-semibold text-slate mb-1">Επίλεξε υπάλληλο</h1>
                    <p className="text-slate/60 text-sm mb-6">
                        Εμφανίζονται όσοι προσφέρουν όλες τις επιλεγμένες υπηρεσίες.
                    </p>

                    {employeesLoading && (
                        <p className="text-slate/60 text-center py-8">Φόρτωση...</p>
                    )}

                    {employeesError && (
                        <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 mb-4">
                            {employeesError}
                        </div>
                    )}

                    {/* Κανένας υπάλληλος δεν προσφέρει όλες τις υπηρεσίες */}
                    {!employeesLoading && !employeesError && employees.length === 0 && (
                        <div className="bg-page rounded-xl px-4 py-8 text-center text-slate/60">
                            Κανένας υπάλληλος δεν προσφέρει όλες τις επιλεγμένες υπηρεσίες.
                            <br />
                            <button onClick={() => setStep(1)} className="text-blue mt-3 hover:underline">
                                ← Άλλαξε υπηρεσίες
                            </button>
                        </div>
                    )}

                    {/* Λίστα υπαλλήλων */}
                    {!employeesLoading && employees.length > 0 && (
                        <div className="space-y-2">
                            {/* Κάρτα «Οποιοσδήποτε διαθέσιμος» — id:null → backend least-loaded (D18) */}
                            <div
                                onClick={() => setSelectedEmployee({ id: null, fullName: 'Οποιοσδήποτε διαθέσιμος' })}
                                className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                                    selectedEmployee?.id === null
                                        ? 'border-blue bg-blue-tint'
                                        : 'border-slate/10 bg-white hover:border-slate/25'
                                }`}
                            >
                                <div className="w-11 h-11 rounded-full bg-blue-tint text-blue font-semibold flex items-center justify-center flex-shrink-0">
                                    ✨
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-slate font-medium">Οποιοσδήποτε διαθέσιμος</p>
                                    <p className="text-slate/50 text-sm mt-0.5">Επιλέγουμε τον πιο κατάλληλο για εσάς</p>
                                </div>
                                {selectedEmployee?.id === null && (
                                    <span className="w-6 h-6 rounded-full bg-blue text-white flex items-center justify-center flex-shrink-0">
                                        <Check size={16} />
                                    </span>
                                )}
                            </div>

                            {employees.map((emp) => (
                                // ΠΡΟΣΟΧΗ: div, ΟΧΙ button. Μέσα υπάρχει το κουμπί
                                // «Προβολή προφίλ» — button μέσα σε button = invalid HTML.
                                // Η επιλογή γίνεται με onClick στο div· το inner κουμπί
                                // κάνει stopPropagation ώστε να μην επιλέγει τον υπάλληλο.
                                <div
                                    key={emp.id}
                                    onClick={() => setSelectedEmployee(emp)}
                                    className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                                        selectedEmployee?.id === emp.id
                                            ? 'border-blue bg-blue-tint'
                                            : 'border-slate/10 bg-white hover:border-slate/25'
                                    }`}
                                >
                                    {/* Avatar: φωτογραφία αν υπάρχει, αλλιώς αρχικά ονόματος */}
                                    <Avatar name={emp.fullName} photoUrl={emp.photoUrl} />

                                    {/* Όνομα + inline βαθμολογία (από το batch response, D110) */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate font-medium">{emp.fullName}</p>
                                        <RatingBadge
                                            average={emp.averageRating}
                                            count={emp.reviewCount}
                                        />
                                    </div>

                                    {/* Προβολή προφίλ: stopPropagation → δεν επιλέγει τον υπάλληλο */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setProfileEmployee(emp);
                                        }}
                                        className="text-sm text-blue hover:underline flex-shrink-0"
                                    >
                                        Προβολή προφίλ
                                    </button>

                                    {/* Ένδειξη επιλογής */}
                                    {selectedEmployee?.id === emp.id && (
                                        <span className="w-6 h-6 rounded-full bg-blue text-white flex items-center justify-center flex-shrink-0">
                                            <Check size={16} />
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Πλοήγηση: Πίσω + Συνέχεια */}
                    <div className="flex items-center justify-between mt-6">
                        <button
                            onClick={() => setStep(1)}
                            className="text-slate/60 hover:text-slate transition-colors"
                        >
                            ← Πίσω
                        </button>

                        {selectedEmployee && (
                            <button
                                onClick={() => setStep(3)}
                                className="bg-blue text-white rounded-xl px-6 py-3 font-medium hover:bg-blue-soft transition-colors"
                            >
                                Συνέχεια
                            </button>
                        )}
                    </div>
                </div>
            )}
            {/* ─── ΒΗΜΑ 3: ΗΜΕΡΟΜΗΝΙΑ & ΩΡΑ ─── */}
            {step === 3 && (
                <div>
                    <h1 className="text-2xl font-semibold text-slate mb-1">Επίλεξε ημέρα & ώρα</h1>
                    <p className="text-slate/60 text-sm mb-6">
                        Υπάλληλος: {selectedEmployee.fullName}
                    </p>

                    {/* Date picker */}
                    <label className="block text-sm text-slate/70 mb-1">Ημερομηνία</label>
                    <input
                        type="date"
                        value={selectedDate}
                        min={today()}   // δεν επιτρέπουμε παρελθόν
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full border border-slate/20 rounded-xl px-3 py-2.5 mb-6 focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                    />

                    {/* Slots */}
                    {selectedDate && (
                        <div>
                            <label className="block text-sm text-slate/70 mb-2">Διαθέσιμες ώρες</label>

                            {slotsLoading && (
                                <p className="text-slate/60 text-center py-6">Φόρτωση ωρών...</p>
                            )}

                            {slotsError && (
                                <div className="bg-danger-tint text-danger rounded-xl px-4 py-3">
                                    {slotsError}
                                </div>
                            )}

                            {!slotsLoading && !slotsError && slots.length === 0 && (
                                <p className="bg-page rounded-xl px-4 py-6 text-center text-slate/60">
                                    Δεν υπάρχουν διαθέσιμες ώρες αυτή τη μέρα.
                                </p>
                            )}

                            {!slotsLoading && slots.length > 0 && (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {slots.map((slot) => (
                                        <button
                                            key={slot}
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                                                selectedSlot === slot
                                                    ? 'border-blue bg-blue text-white'
                                                    : 'border-slate/15 bg-white text-slate hover:border-blue'
                                            }`}
                                        >
                                            {formatTime(slot)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Πλοήγηση */}
                    <div className="flex items-center justify-between mt-8">
                        <button
                            onClick={() => setStep(2)}
                            className="text-slate/60 hover:text-slate transition-colors"
                        >
                            ← Πίσω
                        </button>

                        {selectedSlot && (
                            <button
                                onClick={() => setStep(4)}
                                className="bg-blue text-white rounded-xl px-6 py-3 font-medium hover:bg-blue-soft transition-colors"
                            >
                                Συνέχεια
                            </button>
                        )}
                    </div>
                </div>
            )}
            {/* ─── ΒΗΜΑ 4: ΕΠΙΒΕΒΑΙΩΣΗ ─── */}
            {step === 4 && (
                <div>
                    {/* Αν έχει γίνει η κράτηση → οθόνη επιτυχίας */}
                    {confirmedBooking ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-success-tint text-success flex items-center justify-center mx-auto mb-4">
                                <Check size={32} />
                            </div>
                            <h1 className="text-2xl font-semibold text-slate mb-2">Το ραντεβού κλείστηκε!</h1>
                            <p className="text-slate/60 mb-6">
                                Θα λάβεις email επιβεβαίωσης σύντομα.
                            </p>
                            <div className="bg-white border border-slate/10 rounded-2xl p-5 text-left max-w-sm mx-auto">
                                <SummaryRow label="Υπάλληλος" value={confirmedBooking.employeeName} />
                                <SummaryRow label="Ώρα" value={formatDateTime(confirmedBooking.startsAt)} />
                                <SummaryRow label="Σύνολο" value={`${Number(confirmedBooking.totalPrice).toFixed(2)} €`} />
                            </div>
                            {/* Κουμπιά επόμενης ενέργειας */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                                <button
                                    onClick={() => navigate('/appointments')}
                                    className="w-full sm:w-auto bg-blue text-white rounded-xl px-6 py-3 font-medium hover:bg-blue-soft transition-colors"
                                >
                                    Τα ραντεβού μου
                                </button>
                                <button
                                    onClick={resetWizard}
                                    className="w-full sm:w-auto border border-slate/20 text-slate rounded-xl px-6 py-3 font-medium hover:bg-page transition-colors"
                                >
                                    Νέα κράτηση
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Αλλιώς → σύνοψη + κουμπί επιβεβαίωσης */
                        <div>
                            <h1 className="text-2xl font-semibold text-slate mb-6">Επιβεβαίωση</h1>

                            <div className="bg-white border border-slate/10 rounded-2xl p-5 mb-4">
                                {/* Υπηρεσίες */}
                                <p className="text-sm text-slate/50 uppercase tracking-wide mb-2">Υπηρεσίες</p>
                                {selectedServices.map((s) => (
                                    <div key={s.id} className="flex justify-between text-slate mb-1">
                                        <span>{s.name}</span>
                                        <span>{Number(s.price).toFixed(2)} €</span>
                                    </div>
                                ))}

                                <div className="border-t border-slate/10 my-3" />

                                <SummaryRow label="Υπάλληλος" value={selectedEmployee.fullName} />
                                <SummaryRow label="Ώρα" value={formatDateTime(selectedSlot)} />
                                <SummaryRow label="Διάρκεια" value={`${totalDuration} λεπτά`} />

                                <div className="border-t border-slate/10 my-3" />

                                <div className="flex justify-between font-semibold text-slate text-lg">
                                    <span>Σύνολο</span>
                                    <span>{totalPrice.toFixed(2)} €</span>
                                </div>
                            </div>

                            {bookingError && (
                                <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 mb-4">
                                    {bookingError}
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={booking}
                                    className="text-slate/60 hover:text-slate transition-colors disabled:opacity-50"
                                >
                                    ← Πίσω
                                </button>
                                <button
                                    onClick={handleBooking}
                                    disabled={booking}
                                    className="bg-blue text-white rounded-xl px-8 py-3 font-medium hover:bg-blue-soft transition-colors disabled:opacity-50"
                                >
                                    {booking
                                        ? 'Κλείσιμο...'
                                        : user
                                            ? 'Επιβεβαίωση κράτησης'
                                            : 'Σύνδεση & επιβεβαίωση'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ─── MODAL ΠΡΟΦΙΛ ΥΠΑΛΛΗΛΟΥ ─── */}
            {/* Render ΜΟΝΟ όταν profileEmployee !== null. Το component είναι
                top-level (ορίζεται κάτω, στη στήλη 0) — εδώ απλώς το καλούμε.
                onClose μηδενίζει το state → το modal ξεμοντάρεται. */}
            {profileEmployee && (
                <EmployeeProfileModal
                    employee={profileEmployee}
                    onClose={() => setProfileEmployee(null)}
                />
            )}
        </div>
    );
}

// ─── Step indicator (μικρό βοηθητικό component) ───
function StepIndicator({ currentStep }) {
    const steps = ['Υπηρεσίες', 'Υπάλληλος', 'Ημ/νία & ώρα', 'Επιβεβαίωση'];
    return (
        <div className="flex items-center gap-2 mb-8">
            {steps.map((label, index) => {
                const stepNum = index + 1;
                const isActive = stepNum === currentStep;
                const isDone = stepNum < currentStep;
                return (
                    <div key={label} className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                            isActive ? 'bg-blue text-white'
                                : isDone ? 'bg-blue-tint text-blue'
                                    : 'bg-page text-slate/40'
                        }`}>
                            {isDone ? <Check size={14} /> : stepNum}
                        </div>
                        <span className={`text-sm hidden sm:inline ${
                            isActive ? 'text-slate font-medium' : 'text-slate/40'
                        }`}>
                            {label}
                        </span>
                        {index < steps.length - 1 && (
                            <div className="w-6 h-px bg-slate/15 mx-1 hidden sm:block" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Avatar: φωτογραφία ή αρχικά ονόματος ───
// photoUrl είναι null στα seed → placeholder με τα αρχικά (π.χ. "Μαρία Παπαδοπούλου" → "ΜΠ").
// size = Tailwind κλάσεις μεγέθους (default = μικρό, όπως στην κάρτα βήματος 2).
// Το modal περνάει μεγαλύτερο μέγεθος χωρίς να επηρεάζεται η κάρτα.
// textSize = μέγεθος γραμμάτων για το placeholder με τα αρχικά.
function Avatar({ name, photoUrl, size = 'w-11 h-11', textSize = 'text-base' }) {
    if (photoUrl) {
        return (
            <img
                src={photoUrl}
                alt={name}
                className={`${size} rounded-full object-cover flex-shrink-0`}
            />
        );
    }

    // Αρχικά, με προστασία για κενές λέξεις (διπλά κενά κ.λπ.).
    const initials = name
        .split(' ')
        .filter((word) => word.length > 0)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();

    return (
        <div className={`${size} ${textSize} rounded-full bg-blue-tint text-blue font-semibold flex items-center justify-center flex-shrink-0`}>
            {initials}
        </div>
    );
}

// ─── RatingBadge: inline αστεράκι + μέσος όρος + count ───
// average είναι Double nullable από το backend (D110): null όταν 0 reviews.
// ΔΕΝ δείχνουμε "0 ★" σε αβαθμολόγητο υπάλληλο — μηδέν κριτικές ≠ βαθμός 0
// (το min rating είναι 1). Δείχνουμε ρητά «Χωρίς κριτικές».
function RatingBadge({ average, count }) {
    if (average === null || average === undefined) {
        return <p className="text-slate/40 text-sm mt-0.5">Χωρίς κριτικές</p>;
    }
    return (
        <p className="text-slate/60 text-sm flex items-center gap-1 mt-0.5">
            <Star size={13} className="fill-blue text-blue" />
            <span className="font-medium text-slate">{average.toFixed(1)}</span>
            <span>({count})</span>
        </p>
    );
}

// ─── StarRow: γεμάτα/άδεια αστεράκια για ένα rating 1-5 (μέσα στο modal) ───
function StarRow({ rating }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    size={14}
                    className={n <= rating ? 'fill-blue text-blue' : 'text-slate/25'}
                />
            ))}
        </div>
    );
}

// ─── EmployeeProfileModal: popup με φωτό + όνομα + reviews ───
// Δέχεται ΟΛΟΚΛΗΡΟ το emp object (το έχουμε ήδη από το βήμα 2) → το header
// (φωτό/όνομα/μέσος όρος) εμφανίζεται ΑΜΕΣΩΣ, χωρίς να περιμένει το fetch.
// Τα reviews φορτώνονται LAZY: το useEffect τρέχει στο mount (το modal μοντάρεται
// μόνο όταν το πατήσεις — άρα mount == άνοιγμα). Κλειδί το employee.id: αν
// αλλάξει ο υπάλληλος, ξαναφορτώνει.
function EmployeeProfileModal({ employee, onClose }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadReviews() {
            setLoading(true);
            setError('');
            try {
                // GET /api/employees/{id}/reviews → EmployeeRatingResponse
                // { id, fullName, average, count, reviews[] }. Μας ενδιαφέρει
                // το reviews[] (κάθε στοιχείο = ReviewResponse, public-safe D109:
                // rating, comment, createdAt — ΧΩΡΙΣ customerName).
                const data = await api.get(`/employees/${employee.id}/reviews`);
                setReviews(data.reviews || []);
            } catch (err) {
                setError('Δεν ήταν δυνατή η φόρτωση των κριτικών.');
            } finally {
                setLoading(false);
            }
        }
        loadReviews();
    }, [employee.id]);

    return (
        // Overlay: click στο φόντο → κλείσιμο. Το inner div κάνει stopPropagation
        // ώστε click ΜΕΣΑ στο modal να μην το κλείνει.
        <div
            className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header: φωτό + όνομα + μέσος όρος (από το ήδη-γνωστό object) */}
                <div className="flex items-start gap-4 p-5 border-b border-slate/10">
                    <Avatar name={employee.fullName} photoUrl={employee.photoUrl} size="w-16 h-16" textSize="text-xl" />
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-slate">{employee.fullName}</h2>
                        <RatingBadge
                            average={employee.averageRating}
                            count={employee.reviewCount}
                        />
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate/40 hover:text-slate transition-colors flex-shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Σώμα: λίστα κριτικών (scrollable) */}
                <div className="p-5 overflow-y-auto">
                    {loading && (
                        <p className="text-slate/60 text-center py-6">Φόρτωση κριτικών...</p>
                    )}

                    {error && (
                        <div className="bg-danger-tint text-danger rounded-xl px-4 py-3">
                            {error}
                        </div>
                    )}

                    {!loading && !error && reviews.length === 0 && (
                        <p className="text-slate/50 text-center py-6">
                            Δεν υπάρχουν κριτικές ακόμα.
                        </p>
                    )}

                    {!loading && !error && reviews.length > 0 && (
                        <div className="space-y-3">
                            {reviews.map((review) => (
                                <div
                                    key={review.id}
                                    className="bg-page rounded-xl p-4"
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <StarRow rating={review.rating} />
                                        <span className="text-slate/40 text-xs">
                                            {formatReviewDate(review.createdAt)}
                                        </span>
                                    </div>
                                    {review.comment && (
                                        <p className="text-slate/80 text-sm">{review.comment}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Ημερομηνία κριτικής, π.χ. "11 Αυγ 2026".
function formatReviewDate(instantString) {
    return new Date(instantString).toLocaleDateString('el-GR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

// Σημερινή ημερομηνία ως "YYYY-MM-DD" (για το min του date picker).
function today() {
    return new Date().toISOString().split('T')[0];
}

// Μετατρέπει Instant (UTC, π.χ. "2026-08-11T06:00:00Z") σε τοπική ώρα "09:00".
// Ο browser ξέρει το timezone του χρήστη → κάνει τη μετατροπή αυτόματα.
// Μετατρέπει Instant (UTC, π.χ. "2026-08-11T06:00:00Z") σε τοπική ώρα "09:00".
// Ο browser ξέρει το timezone του χρήστη → κάνει τη μετατροπή αυτόματα.
function formatTime(instantString) {
    return new Date(instantString).toLocaleTimeString('el-GR', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

// Γραμμή σύνοψης: label αριστερά, τιμή δεξιά.
function SummaryRow({ label, value }) {
    return (
        <div className="flex justify-between text-slate mb-1.5">
            <span className="text-slate/60">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

// Μετατρέπει Instant σε τοπική ημερομηνία+ώρα, π.χ. "Δευ 11 Αυγ, 09:00".
function formatDateTime(instantString) {
    return new Date(instantString).toLocaleString('el-GR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}