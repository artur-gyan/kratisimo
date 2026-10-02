import { useState, useEffect } from 'react';
import { Check, Gift } from 'lucide-react';
import { settingsService } from '../services/settingsService';
import { useBusiness } from '../context/BusinessContext';

// Επιτρεπτές τιμές granularity: μόνο διαιρέτες του 60 (backend rule 60 % g == 0, D102).
// Dropdown αντί για ελεύθερο input → αδύνατο να σταλεί μη έγκυρη τιμή.
const GRANULARITY_OPTIONS = [5, 10, 15, 20, 30, 60];

export default function AdminSettingsPage() {
    // Μετά την αποθήκευση: ξαναφόρτωμα του global business info → Navbar/footer/τίτλος
    // δείχνουν αμέσως το νέο όνομα (αλλιώς μόνο μετά από refresh σελίδας).
    const { refresh: refreshBusiness } = useBusiness();

    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Editable πεδία (controlled inputs).
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [granularity, setGranularity] = useState(15);
    const [leadTime, setLeadTime] = useState(10);

    // ΝΕΟ (2f-2): πρόγραμμα επιβράβευσης — ΞΕΧΩΡΙΣΤΗ φόρμα, ξεχωριστό endpoint,
    // ξεχωριστά μηνύματα λάθους/επιτυχίας (δεν μπλέκεται με τα στοιχεία επιχείρησης).
    // Τα αριθμητικά πεδία κρατιούνται ως string όσο ο χρήστης πληκτρολογεί.
    const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
    const [visitsRequired, setVisitsRequired] = useState('7');
    const [discountPercent, setDiscountPercent] = useState('20');
    const [loyaltySaving, setLoyaltySaving] = useState(false);
    const [loyaltyError, setLoyaltyError] = useState('');
    const [loyaltySuccess, setLoyaltySuccess] = useState(false);

    // Γεμίζει τη φόρμα επιβράβευσης από SettingsResponse (load + μετά από save).
    function fillLoyaltyForm(data) {
        setLoyaltyEnabled(data.loyaltyEnabled);
        setVisitsRequired(String(data.loyaltyVisitsRequired));
        setDiscountPercent(String(data.loyaltyDiscountPercent));
    }

    useEffect(() => {
        async function load() {
            try {
                const data = await settingsService.get();
                setSettings(data);
                setName(data.name || '');
                setAddress(data.address || '');
                setPhone(data.phone || '');
                setGranularity(data.slotGranularityMinutes);
                setLeadTime(data.bookingLeadTimeMinutes);
                fillLoyaltyForm(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    async function handleSave() {
        if (!name.trim()) {
            setError('Το όνομα επιχείρησης είναι υποχρεωτικό.');
            return;
        }
        setSaving(true);
        setError('');
        setSuccess(false);
        try {
            const body = {
                name: name.trim(),
                address: address.trim() || null,
                phone: phone.trim() || null,
                slotGranularityMinutes: Number(granularity),
                bookingLeadTimeMinutes: Number(leadTime),
            };
            const updated = await settingsService.update(body);
            setSettings(updated);
            // Ξαναδιαβάζει το PUBLIC endpoint (/api/business-info) — αυτό ορίζει τι είναι δημόσιο,
            // όχι αντιγραφή πεδίων από το admin SettingsResponse εδώ.
            refreshBusiness();
            setSuccess(true);
            // Το success μήνυμα εξαφανίζεται μετά από 3 δευτερόλεπτα.
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    // ─── Επιβράβευση: client-side έλεγχος (ίδια όρια με το LoyaltySettingsRequest) ───
    // Ο server ελέγχει ξανά (@Min/@Max) — εδώ είναι μόνο για άμεσο, φιλικό μήνυμα.
    function validateLoyalty() {
        const v = Number(visitsRequired);
        const p = Number(discountPercent);
        if (!Number.isInteger(v) || v < 2) {
            return 'Ο αριθμός ραντεβού πρέπει να είναι ακέραιος, τουλάχιστον 2.';
        }
        if (!Number.isInteger(p) || p < 1 || p > 100) {
            return 'Η έκπτωση πρέπει να είναι ακέραιος από 1 έως 100.';
        }
        return '';
    }

    async function handleSaveLoyalty() {
        const validationError = validateLoyalty();
        if (validationError) {
            setLoyaltyError(validationError);
            return;
        }
        setLoyaltySaving(true);
        setLoyaltyError('');
        setLoyaltySuccess(false);
        try {
            const updated = await settingsService.updateLoyalty({
                enabled: loyaltyEnabled,
                visitsRequired: Number(visitsRequired),
                discountPercent: Number(discountPercent),
            });
            // Η απάντηση είναι ολόκληρο SettingsResponse → νέα «αλήθεια» για τη σελίδα.
            setSettings(updated);
            fillLoyaltyForm(updated);
            setLoyaltySuccess(true);
            setTimeout(() => setLoyaltySuccess(false), 3000);
        } catch (err) {
            setLoyaltyError(err.message || 'Η αποθήκευση απέτυχε.');
        } finally {
            setLoyaltySaving(false);
        }
    }

    if (loading) {
        return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-slate/60">Φόρτωση...</div>;
    }

    // Αν απέτυχε η φόρτωση, δεν υπάρχει settings → μην «σπάσει» η σελίδα στο settings.email.
    if (!settings) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12">
                <div className="bg-danger-tint text-danger rounded-xl px-4 py-3">
                    {error || 'Δεν ήταν δυνατή η φόρτωση των ρυθμίσεων.'}
                </div>
            </div>
        );
    }

    // Derived: υπάρχουν μη αποθηκευμένες αλλαγές στην επιβράβευση;
    const loyaltyDirty =
        loyaltyEnabled !== settings.loyaltyEnabled ||
        Number(visitsRequired) !== settings.loyaltyVisitsRequired ||
        Number(discountPercent) !== settings.loyaltyDiscountPercent;

    // ΑΛΛΑΓΗ (D173/D175): ενημέρωση για το τι σημαίνει κάθε αλλαγή στο ledger μοντέλο.
    // - αύξηση N  → οι σφραγίδες και τα κερδισμένα δώρα μένουν· η τρέχουσα κάρτα θέλει περισσότερες
    // - μείωση N  → όσοι φτάνουν ήδη τον νέο στόχο κερδίζουν ΑΜΕΣΩΣ (μη αναστρέψιμο) → κόκκινο
    // - αλλαγή %  → ισχύει για δώρα που θα κερδηθούν από εδώ και πέρα
    const newVisits = Number(visitsRequired);
    const visitsDecreased = newVisits < settings.loyaltyVisitsRequired;
    const visitsIncreased = newVisits > settings.loyaltyVisitsRequired;
    const percentChanged = Number(discountPercent) !== settings.loyaltyDiscountPercent;
    const loyaltyValid = validateLoyalty() === '';

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-semibold text-slate mb-6">Ρυθμίσεις</h1>

            {error && (
                <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 mb-4">{error}</div>
            )}
            {success && (
                <div className="flex items-center gap-2 bg-success-tint text-success rounded-xl px-4 py-3 mb-4">
                    <Check size={18} />
                    Οι ρυθμίσεις αποθηκεύτηκαν.
                </div>
            )}

            {/* --- Στοιχεία επιχείρησης --- */}
            <div className="bg-white border border-slate/10 rounded-2xl p-6 mb-6">
                <h2 className="text-base font-semibold text-slate mb-1">Στοιχεία επιχείρησης</h2>
                <p className="text-slate/40 text-xs mb-4">
                    Το όνομα εμφανίζεται στο μενού και στην αρχική σελίδα· διεύθυνση και τηλέφωνο στο κάτω μέρος κάθε σελίδας για τους πελάτες.
                </p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-slate/60 text-xs mb-1.5">Όνομα επιχείρησης</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                        />
                    </div>
                    <div>
                        <label className="block text-slate/60 text-xs mb-1.5">Διεύθυνση</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                        />
                    </div>
                    <div>
                        <label className="block text-slate/60 text-xs mb-1.5">Τηλέφωνο</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                        />
                    </div>
                </div>
            </div>

            {/* --- Ρυθμίσεις κρατήσεων --- */}
            <div className="bg-white border border-slate/10 rounded-2xl p-6 mb-6">
                <h2 className="text-base font-semibold text-slate mb-4">Ρυθμίσεις κρατήσεων</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-slate/60 text-xs mb-1.5">Βήμα διαθεσιμότητας (λεπτά)</label>
                        <select
                            value={granularity}
                            onChange={(e) => setGranularity(Number(e.target.value))}
                            className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate bg-white focus:outline-none focus:border-blue"
                        >
                            {GRANULARITY_OPTIONS.map((v) => (
                                <option key={v} value={v}>{v} λεπτά</option>
                            ))}
                        </select>
                        <p className="text-slate/40 text-xs mt-1">Ανά πόσα λεπτά ξεκινούν τα ραντεβού.</p>
                    </div>
                    <div>
                        <label className="block text-slate/60 text-xs mb-1.5">Ελάχιστος χρόνος προκράτησης (λεπτά)</label>
                        <input
                            type="number"
                            min="0"
                            value={leadTime}
                            onChange={(e) => setLeadTime(e.target.value)}
                            className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                        />
                        <p className="text-slate/40 text-xs mt-1">Πόσο πριν επιτρέπεται κράτηση.</p>
                    </div>
                </div>
            </div>

            {/* Save (στοιχεία + κρατήσεις) — ΑΜΕΣΩΣ κάτω από τις 2 ενότητες που αποθηκεύει */}
            <div className="flex justify-end mb-8">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 rounded-lg bg-blue text-white text-sm font-medium hover:bg-blue-soft transition-colors disabled:opacity-50"
                >
                    {saving ? 'Αποθήκευση...' : 'Αποθήκευση αλλαγών'}
                </button>
            </div>

            {/* --- ΝΕΟ (2f-2): Πρόγραμμα επιβράβευσης — δικό του κουμπί --- */}
            <div className="bg-white border border-slate/10 rounded-2xl p-6 mb-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-tint text-blue flex items-center justify-center">
                            <Gift size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-slate">Πρόγραμμα επιβράβευσης</h2>
                            <p className="text-slate/50 text-xs">
                                {loyaltyEnabled ? 'Ενεργό' : 'Ανενεργό'}
                            </p>
                        </div>
                    </div>
                    <Toggle checked={loyaltyEnabled} onChange={setLoyaltyEnabled} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-slate/60 text-xs mb-1.5">Ολοκληρωμένα ραντεβού ανά επιβράβευση</label>
                        <input
                            type="number"
                            min="2"
                            step="1"
                            value={visitsRequired}
                            onChange={(e) => setVisitsRequired(e.target.value)}
                            className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                        />
                        <p className="text-slate/40 text-xs mt-1">Τουλάχιστον 2.</p>
                    </div>
                    <div>
                        <label className="block text-slate/60 text-xs mb-1.5">Έκπτωση (%)</label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            value={discountPercent}
                            onChange={(e) => setDiscountPercent(e.target.value)}
                            className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                        />
                        <p className="text-slate/40 text-xs mt-1">Από 1 έως 100.</p>
                    </div>
                </div>

                {/* Preview σε ανθρώπινη γλώσσα */}
                <div className="bg-page rounded-xl px-4 py-3 mt-4 text-sm text-slate/70">
                    {!loyaltyValid
                        ? 'Συμπλήρωσε έγκυρες τιμές για να δεις την περιγραφή.'
                        : loyaltyEnabled
                            ? `Κάθε ${visitsRequired} ολοκληρωμένα ραντεβού, ο πελάτης κερδίζει έκπτωση ${discountPercent}% στο επόμενο ραντεβού του. Η έκπτωση εφαρμόζεται αυτόματα. Μετράνε μόνο τα ραντεβού που ολοκληρώνονται όσο το πρόγραμμα είναι ενεργό.`
                            : 'Το πρόγραμμα είναι ανενεργό: τα ραντεβού που ολοκληρώνονται δεν μετράνε και δεν εφαρμόζεται έκπτωση. Ό,τι έχουν ήδη μαζέψει οι πελάτες (πρόοδος και κερδισμένες εκπτώσεις) δεν χάνεται — επανέρχεται αν το ενεργοποιήσεις ξανά.'}
                </div>

                {loyaltyValid && visitsDecreased && (
                    <p className="text-xs text-danger mt-3">
                        Προσοχή: όσοι πελάτες έχουν ήδη {newVisits} ή περισσότερα ραντεβού στην τρέχουσα
                        κάρτα θα κερδίσουν έκπτωση {loyaltyEnabled ? 'αμέσως με την αποθήκευση' : 'μόλις ενεργοποιηθεί το πρόγραμμα'}.
                        Αυτό δεν αναιρείται.
                    </p>
                )}
                {loyaltyValid && visitsIncreased && (
                    <p className="text-xs text-slate/60 mt-3">
                        Οι εκπτώσεις που έχουν ήδη κερδηθεί δεν επηρεάζονται. Η πρόοδος των πελατών μένει·
                        απλώς η τρέχουσα κάρτα θα χρειάζεται {newVisits} ραντεβού.
                    </p>
                )}
                {loyaltyValid && percentChanged && (
                    <p className="text-xs text-slate/60 mt-3">
                        Το νέο ποσοστό ισχύει για εκπτώσεις που θα κερδηθούν από εδώ και πέρα.
                        Όσες έχουν ήδη κερδηθεί κρατούν το ποσοστό τους.
                    </p>
                )}

                {loyaltyError && (
                    <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 mt-4 text-sm">{loyaltyError}</div>
                )}
                {loyaltySuccess && (
                    <div className="flex items-center gap-2 bg-success-tint text-success rounded-xl px-4 py-3 mt-4 text-sm">
                        <Check size={16} />
                        Το πρόγραμμα επιβράβευσης αποθηκεύτηκε.
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 mt-4">
                    {loyaltyDirty && (
                        <span className="text-xs text-slate/50">Μη αποθηκευμένες αλλαγές</span>
                    )}
                    <button
                        onClick={handleSaveLoyalty}
                        disabled={loyaltySaving || !loyaltyDirty}
                        className="px-5 py-2 rounded-lg bg-blue text-white text-sm font-medium hover:bg-blue-soft transition-colors disabled:opacity-50"
                    >
                        {loyaltySaving ? 'Αποθήκευση...' : 'Αποθήκευση επιβράβευσης'}
                    </button>
                </div>
            </div>

            {/* --- Πληροφορίες (read-only) --- */}
            <div className="bg-white border border-slate/10 rounded-2xl p-6 mb-6">
                <h2 className="text-base font-semibold text-slate mb-4">Πληροφορίες συστήματος</h2>
                <p className="text-slate/40 text-xs mb-4">Αυτά τα πεδία δεν αλλάζουν από εδώ.</p>
                <div className="space-y-3">
                    <ReadOnlyRow label="Email" value={settings.email} />
                    <ReadOnlyRow label="Ζώνη ώρας" value={settings.timezone} />
                    <ReadOnlyRow label="Τύπος επιχείρησης" value={settings.businessType} />
                </div>
            </div>
        </div>
    );
}

// Top-level helper (ΟΧΙ φωλιασμένο).
function ReadOnlyRow({ label, value }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-slate/50 text-sm">{label}</span>
            <span className="text-slate text-sm font-medium">{value || '—'}</span>
        </div>
    );
}

// ΝΕΟ (2f-2): διακόπτης on/off. role="switch" + aria-checked → προσβάσιμο.
function Toggle({ checked, onChange }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                checked ? 'bg-blue' : 'bg-slate/20'
            }`}
        >
            <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    checked ? 'translate-x-5' : 'translate-x-0.5'
                }`}
            />
        </button>
    );
}