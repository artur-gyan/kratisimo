import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { settingsService } from '../services/settingsService';

// Επιτρεπτές τιμές granularity: μόνο διαιρέτες του 60 (backend rule 60 % g == 0, D102).
// Dropdown αντί για ελεύθερο input → αδύνατο να σταλεί μη έγκυρη τιμή.
const GRANULARITY_OPTIONS = [5, 10, 15, 20, 30, 60];

export default function AdminSettingsPage() {
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
            setSuccess(true);
            // Το success μήνυμα εξαφανίζεται μετά από 3 δευτερόλεπτα.
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-slate/60">Φόρτωση...</div>;
    }

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
                <h2 className="text-base font-semibold text-slate mb-4">Στοιχεία επιχείρησης</h2>
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

            {/* Save */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 rounded-lg bg-blue text-white text-sm font-medium hover:bg-blue-soft transition-colors disabled:opacity-50"
                >
                    {saving ? 'Αποθήκευση...' : 'Αποθήκευση αλλαγών'}
                </button>
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