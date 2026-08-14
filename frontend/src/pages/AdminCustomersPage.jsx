import { useState, useEffect } from 'react';
import { Search, Pencil, Clock, UserCheck, UserX } from 'lucide-react';
import { adminCustomerService } from '../services/adminCustomerService';
import CustomerEditModal from '../components/CustomerEditModal';
import CustomerHistoryModal from '../components/CustomerHistoryModal';

export default function AdminCustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [query, setQuery] = useState('');
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
            // Ενημέρωσε τοπικά χωρίς πλήρες reload.
            setCustomers((prev) =>
                prev.map((c) =>
                    c.id === customer.id ? { ...c, active: !c.active } : c
                )
            );
        } catch {
            setError('Η αλλαγή κατάστασης απέτυχε.');
        }
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-2xl font-semibold text-slate mb-6">Πελάτες</h1>

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

            {error && (
                <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 mb-4">{error}</div>
            )}

            {loading && <p className="text-slate/60 text-center py-8">Φόρτωση...</p>}

            {!loading && customers.length === 0 && (
                <p className="text-slate/60 text-center py-8">Δεν βρέθηκαν πελάτες.</p>
            )}

            {!loading && customers.length > 0 && (
                <div className="space-y-2">
                    {customers.map((c) => (
                        <div
                            key={c.id}
                            className={`bg-white border rounded-xl p-4 flex items-center justify-between ${
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