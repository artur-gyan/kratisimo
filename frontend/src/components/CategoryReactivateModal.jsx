import { useState } from 'react';
import { X } from 'lucide-react';
import { catalogService } from '../services/catalogService';

// Reactivation κατηγορίας + επιλεκτικά των υπηρεσιών της.
// archivedServices = οι inactive υπηρεσίες ΑΥΤΗΣ της κατηγορίας.
export default function CategoryReactivateModal({ category, archivedServices, onClose, onSaved }) {
    // Ποιες υπηρεσίες θα ενεργοποιηθούν μαζί (Set από ids). Default: καμία.
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const allSelected = archivedServices.length > 0 && selectedIds.size === archivedServices.length;

    function toggleService(id) {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    }

    function toggleAll() {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(archivedServices.map((s) => s.id)));
        }
    }

    async function handleConfirm() {
        setSaving(true);
        setError('');
        try {
            // 1. Ενεργοποίησε την κατηγορία ΠΡΩΤΑ (αλλιώς το service activate σκάει:
            //    το backend απαγορεύει ενεργή υπηρεσία σε inactive κατηγορία, D98).
            await catalogService.activateCategory(category.id);

            // 2. Μετά τις επιλεγμένες υπηρεσίες, μία-μία.
            for (const id of selectedIds) {
                await catalogService.activateService(id);
            }
            onSaved();
        } catch (err) {
            setError(err.message);
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate/10 sticky top-0 bg-white">
                    <h2 className="text-lg font-semibold text-slate">Επαναφορά κατηγορίας</h2>
                    <button onClick={onClose} className="text-slate/40 hover:text-slate transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="bg-danger-tint text-danger rounded-lg px-3 py-2 text-sm">{error}</div>
                    )}

                    <p className="text-slate/60 text-sm">
                        Η κατηγορία <strong className="text-slate">«{category.name}»</strong> θα επαναφερθεί.
                        {archivedServices.length > 0
                            ? ' Επίλεξε ποιες αρχειοθετημένες υπηρεσίες της να ενεργοποιηθούν επίσης:'
                            : ' Δεν υπάρχουν αρχειοθετημένες υπηρεσίες σε αυτή την κατηγορία.'}
                    </p>

                    {archivedServices.length > 0 && (
                        <>
                            {/* Επιλογή όλων */}
                            <label className="flex items-center gap-3 px-3 py-2 rounded-lg bg-page cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleAll}
                                    className="w-4 h-4 accent-blue"
                                />
                                <span className="text-slate text-sm font-medium">Επιλογή όλων</span>
                            </label>

                            {/* Λίστα υπηρεσιών */}
                            <div className="border border-slate/15 rounded-lg divide-y divide-slate/5 max-h-56 overflow-y-auto">
                                {archivedServices.map((svc) => (
                                    <label
                                        key={svc.id}
                                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-page cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(svc.id)}
                                            onChange={() => toggleService(svc.id)}
                                            className="w-4 h-4 accent-blue"
                                        />
                                        <span className="text-slate text-sm">{svc.name}</span>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate/10 sticky bottom-0 bg-white">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-slate/15 text-slate text-sm font-medium hover:bg-page transition-colors"
                    >
                        Ακύρωση
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-blue text-white text-sm font-medium hover:bg-blue-soft transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Επαναφορά...' : 'Επαναφορά'}
                    </button>
                </div>
            </div>
        </div>
    );
}