import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

const AUDIENCE_LABELS = { MAN: 'Ανδρικό', WOMAN: 'Γυναικείο', UNISEX: 'Unisex' };

const FILTERS = [
    { value: 'ALL', label: 'Όλες' },
    { value: 'WOMAN', label: 'Γυναικείες' },
    { value: 'MAN', label: 'Ανδρικές' },
];

export default function ServicesPage() {
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        api.get('/services')
            .then(setServices)
            .catch(() => setError('Δεν ήταν δυνατή η φόρτωση των υπηρεσιών.'))
            .finally(() => setLoading(false));
    }, []);

    // UNISEX εμφανίζεται σε κάθε φίλτρο.
    const visible = services.filter(
        (s) => filter === 'ALL' || s.targetAudience === filter || s.targetAudience === 'UNISEX'
    );

    const grouped = visible.reduce((acc, s) => {
        if (!acc[s.categoryName]) acc[s.categoryName] = [];
        acc[s.categoryName].push(s);
        return acc;
    }, {});

    return (
        <div className="max-w-5xl mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold text-slate">Υπηρεσίες</h1>
            <p className="text-slate/60 mt-1 mb-6">Όλες οι υπηρεσίες μας, με τιμές και διάρκεια.</p>

            {/* Φίλτρο κοινού */}
            <div className="flex flex-wrap gap-2 mb-8">
                {FILTERS.map((f) => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            filter === f.value
                                ? 'bg-blue text-white border-blue'
                                : 'bg-white text-slate/70 border-slate/15 hover:border-slate/30'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {loading && <p className="text-slate/60 text-center py-12">Φόρτωση...</p>}

            {error && <div className="bg-danger-tint text-danger rounded-xl px-4 py-3">{error}</div>}

            {!loading && !error && visible.length === 0 && (
                <p className="bg-white border border-slate/10 rounded-xl px-4 py-8 text-center text-slate/60">
                    Δεν υπάρχουν υπηρεσίες για αυτό το φίλτρο.
                </p>
            )}

            <div className="space-y-10">
                {Object.keys(grouped).map((category) => (
                    <section key={category}>
                        <h2 className="text-sm font-semibold text-blue uppercase tracking-wider mb-4">
                            {category}
                        </h2>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {grouped[category].map((s) => (
                                <div
                                    key={s.id}
                                    className="bg-white border border-slate/10 rounded-2xl p-5 flex flex-col hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-slate font-semibold">{s.name}</p>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-slate/50">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={13} /> {s.durationMinutes} λεπτά
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full bg-page text-xs">
                                                    {AUDIENCE_LABELS[s.targetAudience]}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-slate font-semibold text-lg whitespace-nowrap">
                                            {Number(s.price).toFixed(2)} €
                                        </span>
                                    </div>

                                    {s.description && (
                                        <p className="text-slate/60 text-sm mt-3 leading-relaxed">{s.description}</p>
                                    )}

                                    <button
                                        onClick={() => navigate(`/book?service=${s.id}`)}
                                        className="mt-4 self-start inline-flex items-center gap-1.5 text-sm font-medium text-blue hover:gap-2.5 transition-all"
                                    >
                                        Κλείσε ραντεβού <ArrowRight size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}