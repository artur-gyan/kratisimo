import { useState } from 'react';
import { X } from 'lucide-react';
import { adminCustomerService } from '../services/adminCustomerService';

export default function CustomerEditModal({ customer, onClose, onSaved }) {
    const [fullName, setFullName] = useState(customer.fullName);
    const [phone, setPhone] = useState(customer.phone || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function handleSave() {
        if (!fullName.trim()) {
            setError('Το ονοματεπώνυμο είναι υποχρεωτικό.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const updated = await adminCustomerService.update(customer.id, {
                fullName: fullName.trim(),
                phone: phone.trim() || null,
            });
            onSaved(updated);
        } catch (err) {
            setError(err.message || 'Η αποθήκευση απέτυχε.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-slate/10">
                    <h2 className="text-lg font-semibold text-slate">Επεξεργασία πελάτη</h2>
                    <button onClick={onClose} className="text-slate/40 hover:text-slate transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5">
                    {error && (
                        <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>
                    )}

                    <label className="block text-sm text-slate/70 mb-1">Ονοματεπώνυμο</label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full border border-slate/20 rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                    />

                    <label className="block text-sm text-slate/70 mb-1">Τηλέφωνο</label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="69XXXXXXXX"
                        className="w-full border border-slate/20 rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                    />

                    {/* Email read-only — login credential, δεν αλλάζει από admin */}
                    <label className="block text-sm text-slate/70 mb-1">Email (μη επεξεργάσιμο)</label>
                    <input
                        type="email"
                        value={customer.email}
                        disabled
                        className="w-full border border-slate/15 bg-page rounded-xl px-3 py-2.5 mb-6 text-slate/50"
                    />

                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={saving}
                            className="text-slate/60 hover:text-slate transition-colors px-4 py-2 disabled:opacity-50"
                        >
                            Άκυρο
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-blue text-white rounded-xl px-6 py-2.5 font-medium hover:bg-blue-soft transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}