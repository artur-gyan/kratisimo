import { useState } from 'react';
import { X } from 'lucide-react';
import { catalogService } from '../services/catalogService';

// mode: 'create' | 'edit'. Στο edit, το `category` έχει τα τρέχοντα δεδομένα.
export default function CategoryModal({ mode, category, onClose, onSaved }) {
    const [name, setName] = useState(category?.name || '');
    const [displayOrder, setDisplayOrder] = useState(category?.displayOrder ?? 0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function handleSave() {
        if (!name.trim()) {
            setError('Το όνομα είναι υποχρεωτικό.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const body = { name: name.trim(), displayOrder: Number(displayOrder) || 0 };
            if (mode === 'create') {
                await catalogService.createCategory(body);
            } else {
                await catalogService.updateCategory(category.id, body);
            }
            onSaved();
        } catch (err) {
            // 409 = duplicate όνομα (backend IllegalStateException).
            setError(err.status === 409 ? 'Υπάρχει ήδη κατηγορία με αυτό το όνομα.' : err.message);
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate/10">
                    <h2 className="text-lg font-semibold text-slate">
                        {mode === 'create' ? 'Νέα κατηγορία' : 'Επεξεργασία κατηγορίας'}
                    </h2>
                    <button onClick={onClose} className="text-slate/40 hover:text-slate transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="bg-danger-tint text-danger rounded-lg px-3 py-2 text-sm">{error}</div>
                    )}

                    <div>
                        <label className="block text-slate/60 text-xs mb-1.5">Όνομα κατηγορίας</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                            placeholder="π.χ. Κουρέματα"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-slate/60 text-xs mb-1.5">Σειρά εμφάνισης</label>
                        <input
                            type="number"
                            min="0"
                            value={displayOrder}
                            onChange={(e) => setDisplayOrder(e.target.value)}
                            className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate/10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-slate/15 text-slate text-sm font-medium hover:bg-page transition-colors"
                    >
                        Ακύρωση
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-blue text-white text-sm font-medium hover:bg-blue-soft transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
                    </button>
                </div>
            </div>
        </div>
    );
}