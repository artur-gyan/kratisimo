import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, FolderPlus, Scissors, X, Archive, RotateCcw } from 'lucide-react';
import { catalogService } from '../services/catalogService';
import CategoryModal from '../components/CategoryModal';
import ServiceModal from '../components/ServiceModal';
import CategoryReactivateModal from '../components/CategoryReactivateModal';

function formatDuration(minutes) {
    if (minutes < 60) return `${minutes} λεπτά`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h} ώρα` : `${h}ω ${m}λ`;
}

function formatMoney(value) {
    return (Number(value) || 0).toFixed(2) + ' €';
}

const AUDIENCE_LABEL = { MAN: 'Άνδρες', WOMAN: 'Γυναίκες', UNISEX: 'Unisex' };

export default function AdminCatalogPage() {
    const [categories, setCategories] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showArchived, setShowArchived] = useState(false);

    // Modal state (page-level, top-level components).
    const [showTypeChooser, setShowTypeChooser] = useState(false);
    const [categoryModal, setCategoryModal] = useState(null);   // { mode, category }
    const [serviceModal, setServiceModal] = useState(null);     // { mode, service }
    const [deleteTarget, setDeleteTarget] = useState(null);     // { type, entity }
    const [reactivateCategory, setReactivateCategory] = useState(null); // category object

    async function load() {
        setLoading(true);
        setError('');
        try {
            const [cats, svcs] = await Promise.all([
                catalogService.getCategories(),
                catalogService.getServices(),
            ]);
            setCategories(cats);
            setServices(svcs);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    // --- Ενεργά ---
    const activeCategories = categories
        .filter((c) => c.active)
        .sort((a, b) => a.displayOrder - b.displayOrder);

    function activeServicesFor(categoryId) {
        return services.filter((s) => s.active && s.categoryId === categoryId);
    }

    // --- Αρχειοθετημένα, ομαδοποιημένα ανά κατηγορία (σαν τα ενεργά) ---
    // Κάθε κατηγορία που ΕΙΤΕ είναι αρχειοθετημένη ΕΙΤΕ έχει αρχειοθετημένες υπηρεσίες
    // εμφανίζεται ΜΙΑ φορά, με τις σβηστές υπηρεσίες της μέσα.
    const archivedServices = services.filter((s) => !s.active);

    function archivedServicesFor(categoryId) {
        return archivedServices.filter((s) => s.categoryId === categoryId);
    }

    // Οι κατηγορίες που πρέπει να εμφανιστούν στην ενότητα «Αρχειοθετημένα»:
    // - αρχειοθετημένες κατηγορίες (ό,τι κι αν έχουν μέσα)
    // - ενεργές κατηγορίες που ΕΧΟΥΝ αρχειοθετημένες υπηρεσίες
    const archivedGroups = categories
        .filter((c) => !c.active || archivedServicesFor(c.id).length > 0)
        .sort((a, b) => a.displayOrder - b.displayOrder);

    const hasArchived = archivedGroups.length > 0;

    // --- Handlers ---
    function handleSaved() {
        setCategoryModal(null);
        setServiceModal(null);
        setReactivateCategory(null);
        load();
    }

    async function handleConfirmDelete() {
        try {
            if (deleteTarget.type === 'category') {
                await catalogService.deleteCategory(deleteTarget.entity.id);
            } else {
                await catalogService.deleteService(deleteTarget.entity.id);
            }
            setDeleteTarget(null);
            load();
        } catch (err) {
            setError(err.message);
            setDeleteTarget(null);
        }
    }

    // Reactivation μεμονωμένης υπηρεσίας (όταν η κατηγορία είναι ήδη ενεργή).
    async function handleActivateService(id) {
        try {
            await catalogService.activateService(id);
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

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-slate">Υπηρεσίες</h1>
                <button
                    onClick={() => setShowTypeChooser(true)}
                    className="flex items-center gap-2 bg-blue text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-soft transition-colors"
                >
                    <Plus size={18} />
                    Προσθήκη
                </button>
            </div>

            {error && (
                <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 mb-4">{error}</div>
            )}

            {/* Κενή κατάσταση */}
            {activeCategories.length === 0 ? (
                <div className="bg-white border border-slate/10 rounded-2xl py-16 text-center text-slate/50">
                    Δεν υπάρχουν κατηγορίες ακόμα. Πάτησε «Προσθήκη» για να ξεκινήσεις.
                </div>
            ) : (
                <div className="space-y-6">
                    {activeCategories.map((cat) => {
                        const catServices = activeServicesFor(cat.id);
                        return (
                            <div key={cat.id} className="bg-white border border-slate/10 rounded-2xl overflow-hidden">
                                {/* Κεφαλίδα κατηγορίας */}
                                <div className="flex items-center justify-between px-5 py-3.5 bg-page border-b border-slate/10">
                                    <h2 className="text-base font-semibold text-slate">{cat.name}</h2>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setCategoryModal({ mode: 'edit', category: cat })}
                                            className="p-1.5 rounded-lg text-slate/50 hover:bg-white hover:text-blue transition-colors"
                                            title="Επεξεργασία κατηγορίας"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget({ type: 'category', entity: cat })}
                                            className="p-1.5 rounded-lg text-slate/50 hover:bg-white hover:text-danger transition-colors"
                                            title="Διαγραφή κατηγορίας"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Υπηρεσίες */}
                                {catServices.length === 0 ? (
                                    <p className="px-5 py-4 text-slate/40 text-sm">Καμία υπηρεσία σε αυτή την κατηγορία.</p>
                                ) : (
                                    <div className="divide-y divide-slate/5">
                                        {catServices.map((svc) => (
                                            <button
                                                key={svc.id}
                                                onClick={() => setServiceModal({ mode: 'edit', service: svc })}
                                                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-page transition-colors group"
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate text-sm font-medium truncate">{svc.name}</span>
                                                        <span className="text-slate/40 text-xs bg-page group-hover:bg-white rounded px-1.5 py-0.5 flex-shrink-0">
                                                            {AUDIENCE_LABEL[svc.targetAudience]}
                                                        </span>
                                                    </div>
                                                    {svc.description && (
                                                        <p className="text-slate/50 text-xs mt-0.5 truncate">{svc.description}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                                                    <span className="text-slate/50 text-sm">{formatDuration(svc.durationMinutes)}</span>
                                                    <span className="text-slate text-sm font-semibold w-16 text-right">{formatMoney(svc.price)}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ============ ΑΡΧΕΙΟΘΕΤΗΜΕΝΑ ============ */}
            {hasArchived && (
                <div className="mt-10">
                    <button
                        onClick={() => setShowArchived((v) => !v)}
                        className="flex items-center gap-2 border border-slate/20 text-slate/70 text-sm font-medium rounded-lg px-4 py-2 hover:bg-page hover:text-slate transition-colors"
                    >
                        <Archive size={16} />
                        {showArchived ? 'Απόκρυψη αρχειοθετημένων' : 'Εμφάνιση αρχειοθετημένων'}
                    </button>

                    {showArchived && (
                        <div className="mt-5 space-y-6">
                            {archivedGroups.map((cat) => {
                                const isCategoryArchived = !cat.active;
                                const catArchivedServices = archivedServicesFor(cat.id);
                                return (
                                    <div
                                        key={cat.id}
                                        className="bg-white border border-slate/10 rounded-2xl overflow-hidden opacity-75"
                                    >
                                        {/* Κεφαλίδα κατηγορίας */}
                                        <div className="flex items-center justify-between px-5 py-3.5 bg-page border-b border-slate/10">
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-base font-semibold text-slate/70">{cat.name}</h2>
                                                {isCategoryArchived && (
                                                    <span className="text-slate/40 text-xs bg-white border border-slate/15 rounded px-1.5 py-0.5">
                                                        αρχειοθετημένη
                                                    </span>
                                                )}
                                            </div>
                                            {/* Κουμπί επαναφοράς ΜΟΝΟ αν η κατηγορία είναι αρχειοθετημένη */}
                                            {isCategoryArchived && (
                                                <button
                                                    onClick={() => setReactivateCategory(cat)}
                                                    className="flex items-center gap-1.5 text-blue text-sm font-medium hover:bg-blue-tint rounded-lg px-3 py-1.5 transition-colors"
                                                >
                                                    <RotateCcw size={14} />
                                                    Επαναφορά
                                                </button>
                                            )}
                                        </div>

                                        {/* Αρχειοθετημένες υπηρεσίες μέσα */}
                                        {catArchivedServices.length === 0 ? (
                                            <p className="px-5 py-4 text-slate/40 text-sm">Καμία αρχειοθετημένη υπηρεσία.</p>
                                        ) : (
                                            <div className="divide-y divide-slate/5">
                                                {catArchivedServices.map((svc) => (
                                                    <div
                                                        key={svc.id}
                                                        className="flex items-center justify-between px-5 py-3.5"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate/60 text-sm font-medium truncate">{svc.name}</span>
                                                                <span className="text-slate/40 text-xs bg-page rounded px-1.5 py-0.5 flex-shrink-0">
                                                                    {AUDIENCE_LABEL[svc.targetAudience]}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-0.5">
                                                                <span className="text-slate/40 text-xs">{formatDuration(svc.durationMinutes)}</span>
                                                                <span className="text-slate/40 text-xs">{formatMoney(svc.price)}</span>
                                                            </div>
                                                        </div>
                                                        {/* Επαναφορά μεμονωμένης υπηρεσίας ΜΟΝΟ αν η κατηγορία είναι ενεργή
                                                            (αλλιώς μπλοκάρεται από backend D98 — γίνεται μέσω του modal κατηγορίας) */}
                                                        {!isCategoryArchived && (
                                                            <button
                                                                onClick={() => handleActivateService(svc.id)}
                                                                className="flex items-center gap-1.5 text-blue text-sm font-medium hover:bg-blue-tint rounded-lg px-3 py-1.5 transition-colors flex-shrink-0 ml-4"
                                                            >
                                                                <RotateCcw size={14} />
                                                                Επαναφορά
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* --- Type chooser modal --- */}
            {showTypeChooser && (
                <div className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-50" onClick={() => setShowTypeChooser(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate/10">
                            <h2 className="text-lg font-semibold text-slate">Τι θέλεις να προσθέσεις;</h2>
                            <button onClick={() => setShowTypeChooser(false)} className="text-slate/40 hover:text-slate transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 space-y-2">
                            <button
                                onClick={() => {
                                    setShowTypeChooser(false);
                                    setServiceModal({ mode: 'create', service: null });
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate/15 hover:border-blue hover:bg-blue-tint transition-colors text-left"
                            >
                                <div className="w-10 h-10 rounded-lg bg-blue-tint text-blue flex items-center justify-center flex-shrink-0">
                                    <Scissors size={18} />
                                </div>
                                <div>
                                    <p className="text-slate text-sm font-semibold">Υπηρεσία</p>
                                    <p className="text-slate/50 text-xs">Νέα υπηρεσία σε κατηγορία</p>
                                </div>
                            </button>
                            <button
                                onClick={() => {
                                    setShowTypeChooser(false);
                                    setCategoryModal({ mode: 'create', category: null });
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate/15 hover:border-blue hover:bg-blue-tint transition-colors text-left"
                            >
                                <div className="w-10 h-10 rounded-lg bg-page text-slate/70 flex items-center justify-center flex-shrink-0">
                                    <FolderPlus size={18} />
                                </div>
                                <div>
                                    <p className="text-slate text-sm font-semibold">Κατηγορία</p>
                                    <p className="text-slate/50 text-xs">Νέα ομάδα υπηρεσιών</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Category modal --- */}
            {categoryModal && (
                <CategoryModal
                    mode={categoryModal.mode}
                    category={categoryModal.category}
                    onClose={() => setCategoryModal(null)}
                    onSaved={handleSaved}
                />
            )}

            {/* --- Service modal --- */}
            {serviceModal && (
                <ServiceModal
                    mode={serviceModal.mode}
                    service={serviceModal.service}
                    categories={activeCategories}
                    onClose={() => setServiceModal(null)}
                    onSaved={handleSaved}
                />
            )}

            {/* --- Category reactivation modal --- */}
            {reactivateCategory && (
                <CategoryReactivateModal
                    category={reactivateCategory}
                    archivedServices={archivedServicesFor(reactivateCategory.id)}
                    onClose={() => setReactivateCategory(null)}
                    onSaved={handleSaved}
                />
            )}

            {/* --- Delete confirmation --- */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-slate/40 flex items-center justify-center p-4 z-50" onClick={() => setDeleteTarget(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-5">
                            <h2 className="text-lg font-semibold text-slate mb-2">
                                {deleteTarget.type === 'category' ? 'Διαγραφή κατηγορίας;' : 'Διαγραφή υπηρεσίας;'}
                            </h2>
                            <p className="text-slate/60 text-sm">
                                {deleteTarget.type === 'category' ? (
                                    <>
                                        Η κατηγορία <strong className="text-slate">«{deleteTarget.entity.name}»</strong> και{' '}
                                        <strong className="text-danger">όλες οι υπηρεσίες της</strong> θα διαγραφούν. Μπορείς να τις επαναφέρεις αργότερα. Είσαι σίγουρος;
                                    </>
                                ) : (
                                    <>
                                        Η υπηρεσία <strong className="text-slate">«{deleteTarget.entity.name}»</strong> θα διαγραφεί. Μπορείς να την επαναφέρεις αργότερα. Είσαι σίγουρος;
                                    </>
                                )}
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
                                Διαγραφή
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
