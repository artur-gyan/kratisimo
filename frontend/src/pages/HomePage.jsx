import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Star, ArrowRight } from 'lucide-react';
import { getBusinessInfo } from '../services/businessService';
import { api } from '../services/api';

function Avatar({ name, photoUrl }) {
    if (photoUrl) {
        return <img src={photoUrl} alt={name} className="w-16 h-16 rounded-full object-cover" />;
    }
    const initials = (name || '')
        .split(' ').filter((w) => w.length > 0).slice(0, 2)
        .map((w) => w[0]).join('').toUpperCase();
    return (
        <div className="w-16 h-16 rounded-full bg-blue-tint text-blue font-semibold text-xl flex items-center justify-center">
            {initials}
        </div>
    );
}

function RatingBadge({ average, count }) {
    if (average === null || average === undefined) {
        return <p className="text-slate/40 text-sm">Χωρίς κριτικές</p>;
    }
    return (
        <p className="text-slate/60 text-sm flex items-center gap-1">
            <Star size={13} className="fill-blue text-blue" />
            <span className="font-medium text-slate">{average.toFixed(1)}</span>
            <span>({count})</span>
        </p>
    );
}

export default function HomePage() {
    const navigate = useNavigate();
    const [business, setBusiness] = useState(null);
    const [services, setServices] = useState([]);
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        async function load() {
            const [info, svc] = await Promise.all([
                getBusinessInfo().catch(() => null),
                api.get('/services').catch(() => []),
            ]);
            setBusiness(info);
            setServices(svc);
        }
        load();
    }, []);

    useEffect(() => {
        if (services.length === 0) return;
        async function loadEmployees() {
            try {
                const firstServiceId = services[0].id;
                const data = await api.get(`/employees/available?serviceIds=${firstServiceId}`);
                setEmployees(data);
            } catch {
                setEmployees([]);
            }
        }
        loadEmployees();
    }, [services]);

    const businessName = business?.name || 'Kratisimo';

    const grouped = services.reduce((acc, s) => {
        const cat = s.categoryName;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(s);
        return acc;
    }, {});

    return (
        <div className="bg-page overflow-hidden">
            {/* ═══ HERO ═══ */}
            <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
                {/* Animated warm gradient — βασισμένο στα theme tokens */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(135deg, var(--color-slate) 0%, #4a2138 35%, var(--color-blue) 70%, var(--color-blue-soft) 100%)',
                        backgroundSize: '200% 200%',
                        animation: 'gradientShift 14s ease infinite',
                    }}
                />

                {/* Floating blobs */}
                <motion.div
                    className="absolute rounded-full"
                    style={{
                        width: 420, height: 420, top: '-8%', right: '-6%',
                        background: 'radial-gradient(circle, rgba(201,122,154,0.45), transparent 70%)',
                        filter: 'blur(40px)',
                    }}
                    animate={{ y: [0, 40, 0], x: [0, -30, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute rounded-full"
                    style={{
                        width: 360, height: 360, bottom: '-10%', left: '-8%',
                        background: 'radial-gradient(circle, rgba(122,58,82,0.5), transparent 70%)',
                        filter: 'blur(40px)',
                    }}
                    animate={{ y: [0, -30, 0], x: [0, 25, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Content */}
                <div className="relative z-10 text-center px-4 max-w-3xl">
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7 }}
                        className="text-white/70 text-sm uppercase tracking-[0.3em] mb-6"
                    >
                        Καλώς ήρθατε
                    </motion.p>

                    <motion.h1
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        className="text-5xl sm:text-7xl font-bold text-white tracking-tight leading-tight"
                        style={{ textShadow: '0 2px 30px rgba(0,0,0,0.3)' }}
                    >
                        {businessName}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.3 }}
                        className="mt-6 text-lg sm:text-xl text-white/85 max-w-xl mx-auto font-light"
                    >
                        Κλείσε το ραντεβού σου online — απλά, γρήγορα, όποτε σε βολεύει.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.5 }}
                        className="mt-10"
                    >
                        <button
                            onClick={() => navigate('/book')}
                            className="group inline-flex items-center gap-3 bg-white text-slate rounded-full px-9 py-4 text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300"
                        >
                            <Calendar size={20} />
                            Κλείσε ραντεβού
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                </div>

                {/* Scroll hint */}
                <motion.div
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50"
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <div className="w-6 h-10 rounded-full border-2 border-white/40 flex items-start justify-center p-1.5">
                        <div className="w-1 h-2 rounded-full bg-white/60" />
                    </div>
                </motion.div>
            </section>

            {/* ═══ FEATURES ═══ */}
            <section className="max-w-5xl mx-auto px-4 py-20">
                <div className="grid sm:grid-cols-3 gap-6">
                    {[
                        { icon: Clock, title: 'Γρήγορη κράτηση', text: 'Διάλεξε υπηρεσία, ώρα και επαγγελματία σε λίγα κλικ.' },
                        { icon: Calendar, title: 'Σε πραγματικό χρόνο', text: 'Δες μόνο τις ελεύθερες ώρες, χωρίς τηλέφωνα.' },
                        { icon: Star, title: 'Αξιολογήσεις', text: 'Διάλεξε με βάση τις κριτικές άλλων πελατών.' },
                    ].map((f, i) => (
                        <motion.div
                            key={f.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.12 }}
                            className="bg-white border border-slate/10 rounded-2xl p-7 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-blue-tint text-blue flex items-center justify-center mx-auto mb-4">
                                <f.icon size={26} />
                            </div>
                            <h3 className="text-slate font-semibold mb-2">{f.title}</h3>
                            <p className="text-slate/60 text-sm leading-relaxed">{f.text}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ═══ ΥΠΗΡΕΣΙΕΣ ═══ */}
            {Object.keys(grouped).length > 0 && (
                <section className="max-w-5xl mx-auto px-4 py-16">
                    <motion.h2
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-4xl font-bold text-slate text-center mb-3"
                    >
                        Οι υπηρεσίες μας
                    </motion.h2>
                    <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: 60 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="h-1 bg-blue rounded-full mx-auto mb-14"
                    />

                    <div className="space-y-12">
                        {Object.keys(grouped).map((category, ci) => (
                            <motion.div
                                key={category}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: ci * 0.05 }}
                            >
                                <h3 className="text-sm font-semibold text-blue uppercase tracking-wider mb-5">
                                    {category}
                                </h3>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {grouped[category].map((s) => (
                                        <div
                                            key={s.id}
                                            onClick={() => navigate(`/book?service=${s.id}`)}
                                            className="group bg-white border border-slate/10 rounded-2xl p-5 flex items-center justify-between hover:border-blue/40 hover:shadow-md cursor-pointer transition-all duration-300"
                                        >
                                            <div>
                                                <p className="text-slate font-medium group-hover:text-blue transition-colors">{s.name}</p>
                                                <p className="text-slate/50 text-sm flex items-center gap-1 mt-1">
                                                    <Clock size={13} /> {s.durationMinutes} λεπτά
                                                </p>
                                            </div>
                                            <span className="text-slate font-semibold text-lg">
                                                {Number(s.price).toFixed(2)} €
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* ═══ ΟΜΑΔΑ ═══ */}
            {employees.length > 0 && (
                <section className="max-w-5xl mx-auto px-4 py-16">
                    <motion.h2
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-4xl font-bold text-slate text-center mb-3"
                    >
                        Η ομάδα μας
                    </motion.h2>
                    <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: 60 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="h-1 bg-blue rounded-full mx-auto mb-14"
                    />

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {employees.map((emp, i) => (
                            <motion.div
                                key={emp.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: i * 0.08 }}
                                className="bg-white border border-slate/10 rounded-2xl p-6 flex items-center gap-4 hover:shadow-lg transition-all duration-300"
                            >
                                <Avatar name={emp.fullName} photoUrl={emp.photoUrl} />
                                <div>
                                    <p className="text-slate font-semibold">{emp.fullName}</p>
                                    <RatingBadge average={emp.averageRating} count={emp.reviewCount} />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* ═══ CTA ΤΕΛΟΥΣ ═══ */}
            <section className="max-w-5xl mx-auto px-4 py-24">
                <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="relative rounded-3xl p-14 text-center overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #4a2138 0%, var(--color-blue) 100%)' }}
                >
                    <h2 className="text-4xl font-bold text-white mb-3">Έτοιμος να κλείσεις;</h2>
                    <p className="text-white/85 mb-8 text-lg font-light">Διάλεξε την ώρα που σε βολεύει.</p>
                    <button
                        onClick={() => navigate('/book')}
                        className="inline-flex items-center gap-2 bg-white text-slate rounded-full px-8 py-4 text-lg font-semibold hover:scale-105 transition-transform duration-300"
                    >
                        Κλείσε ραντεβού <ArrowRight size={20} />
                    </button>
                </motion.div>
            </section>

            <style>{`
                @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>
        </div>
    );
}