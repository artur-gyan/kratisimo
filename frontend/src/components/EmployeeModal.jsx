import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../services/api';

// mode: 'create' | 'edit'.
// employee = υπάρχων (edit)· services = λίστα ενεργών υπηρεσιών για επιλογή.
export default function EmployeeModal({ mode, employee, services, onClose, onSaved }) {
    const [fullName, setFullName] = useState(employee?.fullName || '');
    const [email, setEmail] = useState(employee?.email || '');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState(employee?.phone || '');
    const [bio, setBio] = useState(employee?.bio || '');
    // Οι ήδη επιλεγμένες υπηρεσίες (edit): Set από τα ids.
    const [selectedIds, setSelectedIds] = useState(
        new Set(employee?.services?.map((s) => s.id) || [])
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function toggleService(id) {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    }

    async function handleSave() {
        if (!fullName.trim()) return setError('Το ονοματεπώνυμο είναι υποχρεωτικό.');
        if (mode === 'create') {
            if (!email.trim()) return setError('Το email είναι υποχρεωτικό.');
            if (password.length < 8) return setError('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.');
        }
        if (selectedIds.size === 0) return setError('Επίλεξε τουλάχιστον μία υπηρεσία.');

        setSaving(true);
        setError('');
        try {
            const serviceIds = Array.from(selectedIds);
            if (mode === 'create') {
                await api.post('/admin/employees', {
                    fullName: fullName.trim(),
                    email: email.trim(),
                    password,
                    phone: phone.trim() || null,
                    bio: bio.trim() || null,
                    photoUrl: null,
                    serviceIds,
                });
            } else {
                await api.put(`/admin/employees/${employee.employeeProfileId}`, {
                    fullName: fullName.trim(),
                    phone: phone.trim() || null,
                    bio: bio.trim() || null,
                    photoUrl: employee.photoUrl || null,
                    serviceIds,
                });
            }
            onSaved();
        } catch (err) {
            // 409 = duplicate email (backend EmailAlreadyExistsException, D127).
            setError(err.status === 409 ? 'Υπάρχει ήδη χρήστης με αυτό το email.' : err.message);
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate/10 sticky top-0 bg-white">
                    <h2 className="text-lg font-semibold text-slate">
                        {mode === 'create' ? 'Νέος υπάλληλος' : 'Επεξεργασία υπαλλήλου'}
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
                        <label className="block text-slate/60 text-xs mb-1.5">Ονοματεπώνυμο</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                            autoFocus
                        />
                    </div>

                    {/* Email + password ΜΟΝΟ στο create (D99: δεν αλλάζουν στο update) */}
                    {mode === 'create' && (
                        <>
                            <div>
                                <label className="block text-slate/60 text-xs mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                                />
                            </div>
                            <div>
                                <label className="block text-slate/60 text-xs mb-1.5">Αρχικός κωδικός</label>
                                <input
                                    type="text"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                                    placeholder="Τουλάχιστον 8 χαρακτήρες"
                                />
                                <p className="text-slate/40 text-xs mt-1">Ο υπάλληλος θα συνδέεται με αυτόν τον κωδικό.</p>
                            </div>
                        </>
                    )}

                    {mode === 'edit' && (
                        <div>
                            <label className="block text-slate/60 text-xs mb-1.5">Email</label>
                            <input
                                type="email"
                                value={employee.email}
                                disabled
                                className="w-full border border-slate/10 rounded-lg px-3 py-2 text-sm text-slate/50 bg-page cursor-not-allowed"
                            />
                            <p className="text-slate/40 text-xs mt-1">Το email δεν αλλάζει από εδώ.</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-slate/60 text-xs mb-1.5">Τηλέφωνο (προαιρετικό)</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue"
                        />
                    </div>

                    <div>
                        <label className="block text-slate/60 text-xs mb-1.5">Βιογραφικό (προαιρετικό)</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={2}
                            className="w-full border border-slate/15 rounded-lg px-3 py-2 text-sm text-slate focus:outline-none focus:border-blue resize-none"
                        />
                    </div>

                    {/* Υπηρεσίες — checkboxes */}
                    <div>
                        <label className="block text-slate/60 text-xs mb-2">Υπηρεσίες που προσφέρει</label>
                        <div className="border border-slate/15 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate/5">
                            {services.length === 0 ? (
                                <p className="px-3 py-3 text-slate/40 text-sm">Δεν υπάρχουν υπηρεσίες.</p>
                            ) : (
                                services.map((svc) => (
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
                                ))
                            )}
                        </div>
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