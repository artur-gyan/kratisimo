import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function RegisterPage() {
    // Τοπική κατάσταση της φόρμας — καθρέφτης του RegisterRequest (backend)
    // + confirmPassword που ζει ΜΟΝΟ frontend (το backend δεν το ξέρει).
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // user: αν είναι ήδη logged in. register: το action από το context
    // (register + /me + setUser — single source of truth, D115).
    const { user, register } = useAuth();
    const navigate = useNavigate();

    // Ήδη logged in → φύγε στην αρχική (ίδια λογική με LoginPage).
    useEffect(() => {
        if (user) {
            if (sessionStorage.getItem('pendingBooking')) {
                navigate('/book', { replace: true });
            } else {
                navigate('/', { replace: true });
            }
        }
    }, [user, navigate]);

    async function handleSubmit() {
        setError('');

        // ── Client-side validation: καθρέφτης του backend ──
        // Το backend τα επιβάλλει (RegisterRequest), αλλά τα ελέγχουμε ΚΑΙ εδώ
        // ώστε ο χρήστης να μη μαθαίνει για το σφάλμα μόνο μέσω 400 (καλύτερο UX).
        if (!fullName.trim()) {
            setError('Το ονοματεπώνυμο είναι υποχρεωτικό.');
            return;
        }
        if (!email.trim()) {
            setError('Το email είναι υποχρεωτικό.');
            return;
        }
        if (password.length < 8) {
            setError('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.');
            return;
        }
        // confirmPassword: υπάρχει ΜΟΝΟ frontend — αποτρέπει typo στον κωδικό.
        // Ο έλεγχος ζει εδώ, το backend δεν το γνωρίζει καν.
        if (password !== confirmPassword) {
            setError('Οι κωδικοί δεν ταιριάζουν.');
            return;
        }

        setLoading(true);
        try {
            // phone προαιρετικό: κενό → null (το backend το δέχεται nullable).
            const me = await register({
                fullName: fullName.trim(),
                email: email.trim(),
                phone: phone.trim() || null,
                password,
            });

            // Guest flow: εκκρεμεί κράτηση → γύρνα στο /book (D51).
            if (sessionStorage.getItem('pendingBooking')) {
                navigate('/book');
            } else {
                navigate('/');
            }
        } catch (err) {
            // Δείχνουμε το message του backend ErrorResponse (D71). Αν το
            // duplicate email δίνει καθαρό μήνυμα, ο χρήστης το βλέπει άμεσα.
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-page flex items-center justify-center px-4 py-8">
            <div className="bg-white border border-slate/10 rounded-2xl p-8 w-full max-w-sm">
                <h1 className="text-2xl font-medium text-slate mb-1">Kratisimo</h1>
                <p className="text-slate/60 mb-6">Δημιουργία λογαριασμού</p>

                {error && (
                    <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 mb-4 text-sm">
                        {error}
                    </div>
                )}

                <label className="block text-sm text-slate/70 mb-1">Ονοματεπώνυμο</label>
                <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Γιώργος Παπαδόπουλος"
                    className="w-full border border-slate/20 rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                />

                <label className="block text-sm text-slate/70 mb-1">Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full border border-slate/20 rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                />

                <label className="block text-sm text-slate/70 mb-1">
                    Τηλέφωνο <span className="text-slate/40">(προαιρετικό)</span>
                </label>
                <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="69XXXXXXXX"
                    className="w-full border border-slate/20 rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                />

                <label className="block text-sm text-slate/70 mb-1">Κωδικός</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="τουλάχιστον 8 χαρακτήρες"
                    className="w-full border border-slate/20 rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                />

                <label className="block text-sm text-slate/70 mb-1">Επιβεβαίωση κωδικού</label>
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="••••••••"
                    className="w-full border border-slate/20 rounded-xl px-3 py-2.5 mb-6 focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                />

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-blue text-white rounded-xl py-3 font-medium hover:bg-blue-soft transition-colors disabled:opacity-50"
                >
                    {loading ? 'Δημιουργία...' : 'Δημιουργία λογαριασμού'}
                </button>

                <p className="text-sm text-slate/60 text-center mt-5">
                    Έχεις ήδη λογαριασμό;{' '}
                    <Link to="/login" className="text-blue font-medium hover:underline">
                        Σύνδεση
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default RegisterPage;
