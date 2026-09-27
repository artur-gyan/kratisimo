import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Check, Clock, Gift } from 'lucide-react';
import Avatar from '../components/Avatar';
import RatingBadge from '../components/RatingBadge';
import EmployeeProfileModal from '../components/EmployeeProfileModal';
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

    // Ποιου υπαλλήλου το προφίλ βλέπουμε στο modal (object, ή null = κλειστό).
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

    // ΝΕΟ (2f): κατάσταση επιβράβευσης (LoyaltyResponse) — μόνο για ΠΡΟΒΟΛΗ στο βήμα 4.
    const [loyalty, setLoyalty] = useState(null);

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
    // ΔΕΝ εφαρμόζεται αν υπάρχει pendingBooking (guest restore προηγείται).
    useEffect(() => {
        if (services.length === 0) return;
        if (sessionStorage.getItem('pendingBooking')) return;

        const serviceId = searchParams.get('service');
        if (!serviceId) return;

        const service = services.find((s) => String(s.id) === serviceId);
        if (service) {
            setSelectedServices([service]);
        }
    }, [services, searchParams]);

    // ─── GUEST FLOW: restore επιλογών μετά από login/register (D51) ───
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
            sessionStorage.removeItem('pendingBooking');
        }
    }, [user]);

    // Φόρτωσε υπαλλήλους ΟΤΑΝ φτάνουμε στο βήμα 2.
    useEffect(() => {
        if (step !== 2) return;

        async function loadEmployees() {
            setEmployeesLoading(true);
            setEmployeesError('');
            try {
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
    useEffect(() => {
        if (step !== 3 || !selectedDate || !selectedEmployee) return;

        async function loadSlots() {
            setSlotsLoading(true);
            setSlotsError('');
            setSelectedSlot(null); // reset επιλογή αν άλλαξε η μέρα
            try {
                if (selectedEmployee.id === null) {
                    // «Οποιοσδήποτε»: ένωση slots όλων (προβολή, D121)·
                    // ανάθεση least-loaded στο backend POST (D18).
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

    // ─── ΝΕΟ (2f): επιβράβευση για την ΠΡΟΒΟΛΗ του βήματος 4 ───
    // Μόνο συνδεδεμένος (ο ανώνυμος δεν έχει ιστορικό). Ξαναφορτώνει ΚΑΘΕ φορά
    // που μπαίνουμε στο βήμα 4 — π.χ. μετά από κράτηση η επιβράβευση έχει
    // καταναλωθεί, ή μετά από guest login (user αλλάζει → ξανατρέχει).
    // Enhancement: αν αποτύχει → χωρίς πρόβλεψη, η κράτηση δουλεύει κανονικά.
    useEffect(() => {
        if (step !== 4 || !user) return;
        api.get('/loyalty/me')
            .then(setLoyalty)
            .catch(() => setLoyalty(null));
    }, [step, user]);

    // ─── ΛΟΓΙΚΗ ΕΠΙΛΟΓΗΣ ───
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
            // Στέλνουμε ΜΟΝΟ επιλογές — ΠΟΤΕ τιμή ή έκπτωση (D76).
            // Την τελική τιμή την αποφασίζει ο server.
            const payload = {
                serviceIds: selectedServices.map((s) => s.id),
                employeeId: selectedEmployee.id,
                startsAt: selectedSlot,
            };
            const response = await api.post('/appointments', payload);
            setConfirmedBooking(response);
            sessionStorage.removeItem('pendingBooking');
        } catch (err) {
            // 409 = το slot πιάστηκε στο μεσοδιάστημα (D84).
            if (err.status === 409) {
                setBookingError('Αυτή η ώρα μόλις κλείστηκε από άλλον. Διάλεξε άλλη ώρα.');
                setStep(3);
                setSelectedSlot(null);
            } else {
                setBookingError(err.message);
            }
        } finally {
            setBooking(false);
        }
    }

    // Μηδενίζει όλο το wizard state για νέα κράτηση.
    function resetWizard() {
        setStep(1);
        setSelectedServices([]);
        setSelectedEmployee(null);
        setSelectedDate('');
        setSelectedSlot(null);
        setSlots([]);
        setConfirmedBooking(null);
        setBookingError('');
        setLoyalty(null);   // ΝΕΟ (2f): όχι παλιά πρόβλεψη στη νέα κράτηση
    }

    function isSelected(serviceId) {
        return selectedServices.some((s) => s.id === serviceId);
    }

    // ─── ΠΑΡΑΓΩΓΑ (υπολογίζονται από το state) ───
    const totalDuration = selectedServices.reduce(
        (sum, s) => sum + s.durationMinutes, 0
    );
    const totalPrice = selectedServices.reduce(
        (sum, s) => sum + Number(s.price), 0
    );

    // ─── ΠΡΟΒΛΕΨΗ έκπτωσης — ΜΟΝΟ για προβολή ───
    // Ίδιος κανόνας με τον server: σύνολο × % / 100, στρογγυλοποίηση σε λεπτά.
    // (σύνολο × %) = ποσό σε λεπτά → Math.round → /100 = ευρώ με 2 δεκαδικά.
    // Η ΤΕΛΙΚΗ τιμή έρχεται από το POST response (οθόνη επιτυχίας).
    // ΑΛΛΑΓΗ (D173): το % του ΔΩΡΟΥ (nextRewardPercent), όχι του τρέχοντος κανόνα —
    // αν ο admin άλλαξε το % αφού κερδήθηκε το δώρο, το δώρο κρατά το δικό του.
    const hasReward = Boolean(loyalty?.enabled && loyalty.availableRewards > 0);
    const previewPercent = hasReward ? loyalty.nextRewardPercent : 0;
    const previewDiscount = Math.round(totalPrice * previewPercent) / 100;
    const previewTotal = totalPrice - previewDiscount;
    const visitsToReward = loyalty ? loyalty.visitsRequired - loyalty.progress : 0;

    // ─── ΟΜΑΔΟΠΟΙΗΣΗ ανά κατηγορία ───
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

            <StepIndicator currentStep={step} />

            {/* ─── ΒΗΜΑ 1: ΕΠΙΛΟΓΗ ΥΠΗΡΕΣΙΩΝ ─── */}
            {step === 1 && (
                <div>
                    <h1 className="text-2xl font-semibold text-slate mb-1">Επίλεξε υπηρεσίες</h1>
                    <p className="text-slate/60 text-sm mb-6">
                        Μπορείς να επιλέξεις περισσότερες από μία.
                    </p>

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

                    {!employeesLoading && !employeesError && employees.length === 0 && (
                        <div className="bg-page rounded-xl px-4 py-8 text-center text-slate/60">
                            Κανένας υπάλληλος δεν προσφέρει όλες τις επιλεγμένες υπηρεσίες.
                            <br />
                            <button onClick={() => setStep(1)} className="text-blue mt-3 hover:underline">
                                ← Άλλαξε υπηρεσίες
                            </button>
                        </div>
                    )}

                    {!employeesLoading && employees.length > 0 && (
                        <div className="space-y-2">
                            {/* «Οποιοσδήποτε διαθέσιμος» — id:null → backend least-loaded (D18) */}
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
                                // div, ΟΧΙ button: μέσα υπάρχει το «Προβολή προφίλ» (button-in-button = invalid, D129).
                                <div
                                    key={emp.id}
                                    onClick={() => setSelectedEmployee(emp)}
                                    className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                                        selectedEmployee?.id === emp.id
                                            ? 'border-blue bg-blue-tint'
                                            : 'border-slate/10 bg-white hover:border-slate/25'
                                    }`}
                                >
                                    <Avatar name={emp.fullName} photoUrl={emp.photoUrl} />

                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate font-medium">{emp.fullName}</p>
                                        <RatingBadge
                                            average={emp.averageRating}
                                            count={emp.reviewCount}
                                        />
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setProfileEmployee(emp);
                                        }}
                                        className="text-sm text-blue hover:underline flex-shrink-0"
                                    >
                                        Προβολή προφίλ
                                    </button>

                                    {selectedEmployee?.id === emp.id && (
                                        <span className="w-6 h-6 rounded-full bg-blue text-white flex items-center justify-center flex-shrink-0">
                                            <Check size={16} />
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

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

                    <label className="block text-sm text-slate/70 mb-1">Ημερομηνία</label>
                    <input
                        type="date"
                        value={selectedDate}
                        min={today()}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full border border-slate/20 rounded-xl px-3 py-2.5 mb-6 focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                    />

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
                    {confirmedBooking ? (
                        /* ── Οθόνη επιτυχίας: τιμές ΑΠΟ ΤΟΝ SERVER (όχι πρόβλεψη) ── */
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
                                {/* ΝΕΟ (2f): έκπτωση όπως την εφάρμοσε ο server */}
                                {confirmedBooking.discountPercent > 0 && (
                                    <div className="flex justify-between text-success mb-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <Gift size={15} /> Επιβράβευση −{confirmedBooking.discountPercent}%
                                        </span>
                                        <span className="font-medium">
                                            −{Number(confirmedBooking.discountAmount).toFixed(2)} €
                                        </span>
                                    </div>
                                )}
                                <SummaryRow label="Σύνολο" value={`${Number(confirmedBooking.totalPrice).toFixed(2)} €`} />
                            </div>
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
                        /* ── Σύνοψη + κουμπί επιβεβαίωσης ── */
                        <div>
                            <h1 className="text-2xl font-semibold text-slate mb-6">Επιβεβαίωση</h1>

                            <div className="bg-white border border-slate/10 rounded-2xl p-5 mb-4">
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

                                {/* ΝΕΟ (2f): πρόβλεψη έκπτωσης */}
                                {previewPercent > 0 && (
                                    <>
                                        <div className="flex justify-between text-slate mb-1.5">
                                            <span className="text-slate/60">Υποσύνολο</span>
                                            <span>{totalPrice.toFixed(2)} €</span>
                                        </div>
                                        <div className="flex justify-between text-success mb-3">
                                            <span className="flex items-center gap-1.5">
                                                <Gift size={15} /> Επιβράβευση −{previewPercent}%
                                            </span>
                                            <span className="font-medium">−{previewDiscount.toFixed(2)} €</span>
                                        </div>
                                    </>
                                )}

                                <div className="flex justify-between font-semibold text-slate text-lg">
                                    <span>Σύνολο</span>
                                    <span>{previewTotal.toFixed(2)} €</span>
                                </div>

                                {/* ΝΕΟ (2f): υπενθύμιση προόδου όταν δεν υπάρχει διαθέσιμη επιβράβευση */}
                                {loyalty?.enabled && !hasReward && (
                                    <p className="text-slate/50 text-sm mt-3 flex items-center gap-1.5">
                                        <Gift size={14} />
                                        Ακόμη {visitsToReward}{' '}
                                        {visitsToReward === 1 ? 'ολοκληρωμένο ραντεβού' : 'ολοκληρωμένα ραντεβού'}{' '}
                                        για έκπτωση {loyalty.discountPercent}%
                                    </p>
                                )}

                                {/* ΝΕΟ (2f): ανώνυμος — η επιβράβευση φαίνεται μετά τη σύνδεση */}
                                {!user && (
                                    <p className="text-slate/50 text-sm mt-3">
                                        Αν έχεις διαθέσιμη επιβράβευση, θα εμφανιστεί μετά τη σύνδεση.
                                    </p>
                                )}
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

            {profileEmployee && (
                <EmployeeProfileModal
                    employee={profileEmployee}
                    onClose={() => setProfileEmployee(null)}
                />
            )}
        </div>
    );
}

// ─── Step indicator ───
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

// Σημερινή ημερομηνία ως "YYYY-MM-DD" (για το min του date picker).
function today() {
    return new Date().toISOString().split('T')[0];
}

// Instant (UTC) → τοπική ώρα "09:00". Ο browser κάνει τη μετατροπή ζώνης.
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

// Instant → τοπική ημερομηνία+ώρα, π.χ. "Δευ 11 Αυγ, 09:00".
function formatDateTime(instantString) {
    return new Date(instantString).toLocaleString('el-GR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}