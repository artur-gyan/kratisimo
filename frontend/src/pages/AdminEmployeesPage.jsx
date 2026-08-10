import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Archive, RotateCcw } from 'lucide-react';
import { adminEmployeeService } from '../services/adminEmployeeService';
import { catalogService } from '../services/catalogService';
import EmployeeModal from '../components/EmployeeModal';

export default function AdminEmployeesPage() {
    const [employees, setEmployees] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showArchived, setShowArchived] = useState(false);

    const [modal, setModal] = useState(null);           // { mode, employee }
    const [deleteTarget, setDeleteTarget] = useState(null);

    async function load() {
        setLoading(true);
        setError('');
        try {
            const [emps, svcs] = await Promise.all([
                adminEmployeeService.getAll(),
                catalogService.getServices(),
            ]);
            setEmployees(emps);
            setServices(svcs.filter((s) => s.active)); // μόνο ενεργές για επιλογή
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    const activeEmployees = employees.filter((e) => e.active);
    const archivedEmployees = employees.filter((e) => !e.active);

    function handleSaved() {
        setModal(null);
        load();
    }

    async function handleConfirmDelete() {
        try {
            await adminEmployeeService.delete(deleteTarget.employeeProfileId);
            setDeleteTarget(null);
            load();
        } catch (err) {
            setError(err.message);
            setDeleteTarget(null);
        }
    }

    async function handleActivate(id) {
        try {
            await adminEmployeeService.activate(id);
            load();
        } catch (err) {
            setError(err.message);
        }
    }

    if (loading) {
        return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate/60">Φόρτωση...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-slate">Υπάλληλοι</h1>
                <button
                    onClick={() => setModal({ mode: 'create', employee: null })}
                    className="flex items-center gap-2 bg-blue text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-soft transition-colors"
                >
                    <Plus size={18} />
                    Προσθήκη
                </button>
            </div>

            {error && (
                <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 mb-4">{error}</div>
            )}

            {activeEmployees.length === 0 ? (
                <div className="bg-white border border-slate/10 rounded-2xl py-16 text-center text-slate/50">
                    Δεν υπάρχουν υπάλληλοι ακόμα.
                </div>
            ) : (
                <div className="bg-white border border-slate/10 rounded-2xl overflow-hidden divide-y divide-slate/5">
                    {activeEmployees.map((emp) => (
                        <div key={emp.employeeProfileId} className="flex items-center gap-4 px-5 py-4">
                            <div className="w-11 h-11 rounded-full bg-blue-tint text-blue flex items-center justify-center flex-shrink-0 font-semibold">
                                {emp.fullName.charAt(0)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-slate text-sm font-medium truncate">{emp.fullName}</p>
                                <p className="text-slate/50 text-xs truncate">{emp.email}</p>
                                <p className="text-slate/40 text-xs mt-0.5">
                                    {emp.services.length} {emp.services.length === 1 ? 'υπηρεσία' : 'υπηρεσίες'}
                                </p>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    onClick={() => setModal({ mode: 'edit', employee: emp })}
                                    className="p-2 rounded-lg text-slate/50 hover:bg-page hover:text-blue transition-colors"
                                    title="Επεξεργασία"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    onClick={() => setDeleteTarget(emp)}
                                    className="p-2 rounded-lg text-slate/50 hover:bg-page hover:text-danger transition-colors"
                                    title="Απενεργοποίηση"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ============ ΑΡΧΕΙΟΘΕΤΗΜΕΝΟΙ ============ */}
            {archivedEmployees.length > 0 && (
                <div className="mt-10">
                    <button
                        onClick={() => setShowArchived((v) => !v)}
                        className="flex items-center gap-2 text-slate/60 text-sm font-medium hover:text-slate transition-colors"
                    >
                        <Archive size={16} />
                        {showArchived ? 'Απόκρυψη αρχειοθετημένων' : 'Εμφάνιση αρχειοθετημένων'}
                    </button>

                    {showArchived && (
                        <div className="mt-4 bg-white border border-slate/10 rounded-2xl overflow-hidden divide-y divide-slate/5">
                            {archivedEmployees.map((emp) => (
                                <div key={emp.employeeProfileId} className="flex items-center gap-4 px-5 py-4">
                                    <div className="w-11 h-11 rounded-full bg-page text-slate/50 flex items-center justify-center flex-shrink-0 font-semibold">
                                        {emp.fullName.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate/60 text-sm font-medium truncate">{emp.fullName}</p>
                                        <p className="text-slate/40 text-xs truncate">{emp.email}</p>
                                    </div>
                                    <button
                                        onClick={() => handleActivate(emp.employeeProfileId)}
                                        className="flex items-center gap-1.5 text-blue text-sm font-medium hover:bg-blue-tint rounded-lg px-3 py-1.5 transition-colors flex-shrink-0"
                                    >
                                        <RotateCcw size={14} />
                                        Επαναφορά
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Employee modal */}
            {modal && (
                <EmployeeModal
                    mode={modal.mode}
                    employee={modal.employee}
                    services={services}
                    onClose={() => setModal(null)}
                    onSaved={handleSaved}
                />
            )}

            {/* Delete confirmation */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-50" onClick={() => setDeleteTarget(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-5">
                            <h2 className="text-lg font-semibold text-slate mb-2">Απενεργοποίηση υπαλλήλου;</h2>
                            <p className="text-slate/60 text-sm">
                                Ο υπάλληλος <strong className="text-slate">«{deleteTarget.fullName}»</strong> θα βγει από τις κρατήσεις.
                                Τα ραντεβού του διατηρούνται. Μπορείς να τον επαναφέρεις αργότερα. Είσαι σίγουρος;
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate/10">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="px-4 py-2 rounded-lg border border-slate/15 text-slate text-sm font-medium hover:bg-page transition-colors"
                            >
                                Ακύρωση
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:opacity-90 transition-colors"
                            >
                                Απενεργοποίηση
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
