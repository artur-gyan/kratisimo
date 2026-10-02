import { useState, useEffect } from 'react';
import { Search, Pencil, Clock, UserCheck, UserX, Gift } from 'lucide-react';
import { adminCustomerService } from '../services/adminCustomerService';
import CustomerEditModal from '../components/CustomerEditModal';
import CustomerHistoryModal from '../components/CustomerHistoryModal';

// Φίλτρο κατάστασης. Client-side: η πλήρης λίστα έρχεται ήδη με ένα request (με το `active`
// κάθε πελάτη) → το φίλτρο δεν χρειάζεται νέο request σε κάθε κλικ και οι μετρητές βγαίνουν δωρεάν.
// (Με χιλιάδες πελάτες θα πηγαίναμε σε server-side pagination ΚΑΙ φίλτρο μαζί.)
const STATUS_FILTERS = [
    { value: 'ALL', label: 'Όλοι' },
    { value: 'ACTIVE', label: 'Ενεργοί' },
    { value: 'INACTIVE', label: 'Ανενεργοί' },
];

const EMPTY_MESSAGES = {
    ALL: 'Δεν βρέθηκαν πελάτες.',
    ACTIVE: 'Δεν υπάρχουν ενεργοί πελάτες εδώ.',
    INACTIVE: 'Δεν υπάρχουν ανενεργοί πελάτες εδώ.',
};

export default function AdminCustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [query, setQuery] = useState('');
    // Προεπιλογή: ενεργοί = η καθημερινή δουλειά. Οι ανενεργοί είναι η εξαίρεση, ένα κλικ μακριά.
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [editTarget, setEditTarget] = useState(null);
    const [historyTarget, setHistoryTarget] = useState(null);

    async function loadAll() {
        setLoading(true);
        setError('');
        try {
            const data = await adminCustomerService.getAll();
            setCustomers(data);
        } catch (err) {
            setError('Δεν ήταν δυνατή η φόρτωση των πελατών.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAll();
    }, []);

    // Search με debounce (300ms). < 3 chars → λίστα όλων.
    useEffect(() => {
        if (query.trim().length < 3) {
            if (query.trim().length === 0) loadAll();
            return;
        }
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await adminCustomerService.search(query);
                setCustomers(data);
            } catch {
                setError('Η αναζήτηση απέτυχε.');
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    async function toggleActive(customer) {
        try {
            if (customer.active) {
                await adminCustomerService.deactivate(customer.id);
            } else {
                await adminCustomerService.activate(customer.id);
            }
            // Ενημέρωσε τοπικά χωρίς πλήρες reload (το ...c κρατάει και το loyalty).
            setCustomers((prev) =>
                prev.map((c) =>
                    c.id === customer.id ? { ...c, active: !c.active } : c
                )
            );
        } catch {
            setError('Η αλλαγή κατάστασης απέτυχε.');
        }
    }

    // ΝΕΟ (2f-2): οι κανόνες του προγράμματος είναι ίδιοι για όλους τους πελάτες
    // (έρχονται μέσα σε κάθε loyalty) → τους παίρνουμε από τον πρώτο.
    const program = customers.find((c) => c.loyalty)?.loyalty;

    // Μετρητές + ορατή λίστα (derived — υπολογίζονται στο render, όχι ξεχωριστό state).
    // Ισχύουν και πάνω στα αποτελέσματα αναζήτησης.
    const activeCount = customers.filter((c) => c.active).length;
    const counts = {
        ALL: customers.length,
        ACTIVE: activeCount,
        INACTIVE: customers.length - activeCount,
    };
    const visible = customers.filter((c) =>
        statusFilter === 'ALL' ? true : statusFilter === 'ACTIVE' ? c.active : !c.active
    );

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-semibold text-slate mb-1">Πελάτες</h1>
            {program?.enabled ? (
                <p className="text-slate/50 text-sm mb-6 flex items-center gap-1.5">
                    <Gift size={14} />
                    Επιβράβευση: κάθε {program.visitsRequired} ολοκληρωμένα ραντεβού → έκπτωση {program.discountPercent}%
                </p>
            ) : (
                <div className="mb-5" />
            )}

            {/* Search */}
            <div className="relative mb-6">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate/40" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Αναζήτηση με όνομα ή τηλέφωνο (min 3 χαρακτήρες)..."
                    className="w-full border border-slate/20 rounded-xl pl-10 pr-3 py-2.5 focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                />
            </div>

            {/* Φίλτρο κατάστασης (ίδιο στυλ με το φίλτρο της σελίδας Υπηρεσιών) */}
            <div className="flex flex-wrap gap-2 mb-5">
                {STATUS_FILTERS.map((f) => {
                    const selected = statusFilter === f.value;
                    return (
                        <button
                            key={f.value}
                            onClick={() => setStatusFilter(f.value)}
                            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                selected
                                    ? 'bg-blue text-white border-blue'
                                    : 'bg-white text-slate/70 border-slate/15 hover:border-slate/30'
                            }`}
                        >
                            {f.label}
                            <span
                                className={`text-xs rounded-full px-1.5 min-w-[1.25rem] text-center ${
                                    selected
                                        ? 'bg-white/20'
                                        : f.value === 'INACTIVE' && counts.INACTIVE > 0
                                            ? 'bg-danger/10 text-danger'
                                            : 'bg-page text-slate/50'
                                }`}
                            >
                                {counts[f.value]}
                            </span>
                        </button>
                    );
                })}
            </div>

            {error && (
                <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 mb-4">{error}</div>
            )}

            {loading && <p className="text-slate/60 text-center py-8">Φόρτωση...</p>}

            {!loading && visible.length === 0 && (
                <p className="text-slate/60 text-center py-8">{EMPTY_MESSAGES[statusFilter]}</p>
            )}

            {!loading && visible.length > 0 && (
                <div className="space-y-2">
                    {visible.map((c) => (
                        <div
                            key={c.id}
                            className={`bg-white border rounded-xl p-4 flex items-center justify-between gap-3 ${
                                c.active ? 'border-slate/10' : 'border-danger/20 bg-danger-tint/30'
                            }`}
                        >
                            <div className="min-w-0">
                                <p className="text-slate font-medium flex items-center gap-2">
                                    {c.fullName}
                                    {!c.active && (
                                        <span className="text-xs bg-danger/10 text-danger px-2 py-0.5 rounded-full">
                                            Ανενεργός
                                        </span>
                                    )}
                                </p>
                                <p className="text-slate/60 text-sm">{c.email}</p>
                                {c.phone && <p className="text-slate/50 text-sm">{c.phone}</p>}

                                {/* ΝΕΟ (2f-2): πρόοδος επιβράβευσης */}
                                <LoyaltyProgress loyalty={c.loyalty} />
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={() => setHistoryTarget(c)}
                                    title="Ιστορικό ραντεβού"
                                    className="p-2 rounded-lg text-slate/60 hover:bg-page hover:text-slate transition-colors"
                                >
                                    <Clock size={18} />
                                </button>
                                <button
                                    onClick={() => setEditTarget(c)}
                                    title="Επεξεργασία"
                                    className="p-2 rounded-lg text-slate/60 hover:bg-page hover:text-slate transition-colors"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button
                                    onClick={() => toggleActive(c)}
                                    title={c.active ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}
                                    className={`p-2 rounded-lg transition-colors ${
                                        c.active
                                            ? 'text-slate/60 hover:bg-danger-tint hover:text-danger'
                                            : 'text-success hover:bg-success-tint'
                                    }`}
                                >
                                    {c.active ? <UserX size={18} /> : <UserCheck size={18} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editTarget && (
                <CustomerEditModal
                    customer={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSaved={(updated) => {
                        // Το updated (AdminCustomerResponse) περιέχει ήδη και το loyalty.
                        setCustomers((prev) =>
                            prev.map((c) => (c.id === updated.id ? updated : c))
                        );
                        setEditTarget(null);
                    }}
                />
            )}

            {historyTarget && (
                <CustomerHistoryModal
                    customer={historyTarget}
                    onClose={() => setHistoryTarget(null)}
                />
            )}
        </div>
    );
}

// ΝΕΟ (2f-2): συμπαγής μπάρα «4/7» + badge διαθέσιμης έκπτωσης.
// Συνεχής μπάρα (όχι κομμάτια) → δουλεύει ίδια για N=3 ή N=20.
// Το πλάτος είναι δυναμικό → inline style (το Tailwind δεν παράγει κλάσεις runtime).
// ΑΛΛΑΓΗ (D173): το badge δείχνει το % του ΔΩΡΟΥ (nextRewardPercent)· τα δώρα μπορεί
// να έχουν διαφορετικά % μεταξύ τους → με >1 δώρα δείχνουμε το % του επόμενου.
function LoyaltyProgress({ loyalty }) {
    if (!loyalty || !loyalty.enabled) return null;

    const { progress, visitsRequired, availableRewards, nextRewardPercent } = loyalty;
    const percentFilled = Math.min(100, (progress / visitsRequired) * 100);

    return (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
            <div className="w-24 h-1.5 bg-slate/10 rounded-full overflow-hidden">
                <div
                    className="h-full bg-blue rounded-full"
                    style={{ width: `${percentFilled}%` }}
                />
            </div>
            <span className="text-xs text-slate/60">
                <span className="font-medium text-slate">{progress}/{visitsRequired}</span>{' '}
                για {availableRewards > 0 ? 'την επόμενη ' : ''}έκπτωση
            </span>
            {availableRewards > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-success-tint text-success px-2 py-0.5 rounded-full">
                    <Gift size={12} />
                    {availableRewards === 1
                        ? `1 διαθέσιμη έκπτωση ${nextRewardPercent}%`
                        : `${availableRewards} διαθέσιμες εκπτώσεις · επόμενη ${nextRewardPercent}%`}
                </span>
            )}
        </div>
    );
}