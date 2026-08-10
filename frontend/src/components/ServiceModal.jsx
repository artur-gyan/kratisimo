import { useState } from 'react';
import { X } from 'lucide-react';
import { catalogService } from '../services/catalogService';

const AUDIENCE_OPTIONS = [
    { value: 'MAN', label: 'Άνδρες' },
    { value: 'WOMAN', label: 'Γυναίκες' },
    { value: 'UNISEX', label: 'Unisex' },
];

// mode: 'create' | 'edit'. categories = λίστα ενεργών κατηγοριών για το dropdown.
export default function ServiceModal({ mode, service, categories, onClose, onSaved }) {
    const [name, setName] = useState(service?.name || '');
    const [description, setDescription] = useState(service?.description || '');
    const [durationMinutes, setDurationMinutes] = useState(service?.durationMinutes ?? 30);
    const [price, setPrice] = useState(service?.price ?? '');
    const [targetAudience, setTargetAudience] = useState(service?.targetAudience || 'UNISEX');
    const [categoryId, setCategoryId] = useState(service?.categoryId ?? (categories[0]?.id ?? ''));

    // "Νέα κατηγορία inline": αν true, δείχνουμε text input αντί για dropdown value.
    const [newCategoryMode, setNewCategoryMode] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Το dropdown έχει ειδική τιμή "__new__" που ενεργοποιεί το inline input.
    function handleCategoryChange(value) {
        if (value === '__new__') {
            setNewCategoryMode(true);
            setNewCategoryName('');
        } else {
            setNewCategoryMode(false);
            setCategoryId(Number(value));
        }
    }

    async function handleSave() {
        // Validation (καθρέφτης του backend ServiceOfferingRequest).
        if (!name.trim()) return setError('Το όνομα είναι υποχρεωτικό.');
        if (!durationMinutes || durationMinutes <= 0) return setError('Η διάρκεια πρέπει να είναι θετική.');
        if (!price || Number(price) <= 0) return setError('Η τιμή πρέπει να είναι μεγαλύτερη του 0.');
        if (newCategoryMode && !newCategoryName.trim()) return setError('Δώσε όνομα για τη νέα κατηγορία.');
        if (!newCategoryMode && !categoryId) return setError('Επίλεξε κατηγορία.');

        setSaving(true);
        setError('');
        try {
            // Αν "νέα κατηγορία": πρώτα τη δημιουργούμε, παίρνουμε το id της.
            let finalCategoryId = categoryId;
            if (newCategoryMode) {
                const created = await catalogService.createCategory({
                    name: newCategoryName.trim(),
                    displayOrder: 0,
                });
                finalCategoryId = created.id;
            }

            const body = {
                name: name.trim(),
                description: description.trim() || null,
                durationMinutes: Number(durationMinutes),
                price: Number(price),
                targetAudience,
                categoryId: finalCategoryId,
            };

            if (mode === 'create') {
                await catalogService.createService(body);
            } else {
                await catalogService.updateService(service.id, body);
            }
            onSaved();
        } catch (err) {
            setError(err.status === 409 ? 'Υπάρχει ήδη κατηγορία με αυτό το όνομα.' : err.message);
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate/10 sticky top-0 bg-white">
                    <h2 className="text-lg font-semibold text-slate">
                        {mode === 'create' ? 'Νέα υπηρεσία' : 'Επεξεργασία υπηρεσίας'}
                    </h2>
                    <button onClick={onClose} className="text-slate/40 hover:text-slate transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {error && (
                        <div className="bg-danger-tint text-danger rounded-lg px-3 py-2 text-sm">{error}</div>
                    )}

                    {/* Όνομα */}
                    <div>
                        <label className="block text-slate/60 text-xs mb-1.5">Όνομα υπηρεσίας</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                            placeholder="π.χ. Ανδρικό κούρεμα"
                            autoFocus
                        />
                    </div>

                    {/* Περιγραφή */}
                    <div>
                        <label className="block text-slate/60 text-xs mb-1.5">Περιγραφή (προαιρετικό)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue resize-none"
                        />
                    </div>

                    {/* Διάρκεια + Τιμή σε δύο στήλες */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-slate/60 text-xs mb-1.5">Διάρκεια (λεπτά)</label>
                            <input
                                type="number"
                                min="1"
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(e.target.value)}
                                className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                            />
                        </div>
                        <div>
                            <label className="block text-slate/60 text-xs mb-1.5">Τιμή (€)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                            />
                        </div>
                    </div>

                    {/* Κοινό */}
                    <div>
                        <label className="block text-slate/60 text-xs mb-1.5">Κοινό</label>
                        <div className="flex gap-2">
                            {AUDIENCE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setTargetAudience(opt.value)}
                                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                        targetAudience === opt.value
                                            ? 'bg-blue text-white border-blue'
                                            : 'border-slate/15 text-slate/70 hover:bg-page'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Κατηγορία */}
                    <div>
                        <label className="block text-slate/60 text-xs mb-1.5">Κατηγορία</label>
                        {!newCategoryMode ? (
                            <select
                                value={categoryId}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate bg-white focus:outline-none focus:border-blue"
                            >
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                                <option value="__new__">＋ Νέα κατηγορία...</option>
                            </select>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="flex-1 border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                                    placeholder="Όνομα νέας κατηγορίας"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setNewCategoryMode(false)}
                                    className="px-3 py-2 rounded-lg border border-slate/15 text-slate/70 text-sm hover:bg-page transition-colors"
                                >
                                    Άκυρο
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate/10 sticky bottom-0 bg-white">
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