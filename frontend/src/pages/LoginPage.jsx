import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
    // Τοπική κατάσταση της φόρμας.
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // user: για να ξέρουμε αν είναι ήδη logged in.
    // login: το action από το context (login + /me + setUser).
    const { user, login } = useAuth();
    const navigate = useNavigate();

    // Αν είσαι ΗΔΗ logged in, μη δείχνεις τη φόρμα — φύγε στην αρχική.
    // useEffect γιατί το navigate είναι side effect (όχι κατά το render).
    useEffect(() => {
        if (user) {
            // Αν εκκρεμεί κράτηση, μη μας στείλει στην αρχική — το handleSubmit
            // (ή το BookingPage restore) θα μας πάει στο /book.
            if (sessionStorage.getItem('pendingBooking')) {
                navigate('/book', { replace: true });
            } else {
                navigate('/', { replace: true });
            }
        }
    }, [user, navigate]);

    async function handleSubmit() {
        setError('');
        setLoading(true);

        try {
            const me = await login(email, password);

            // Guest flow: εκκρεμεί κράτηση → γύρνα στο /book (D51).
            if (sessionStorage.getItem('pendingBooking')) {
                navigate('/book');
            } else if (me.roles.includes('ADMIN')) {
                navigate('/admin/dashboard');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-page flex items-center justify-center px-4">
            <div className="bg-white border border-slate/10 rounded-2xl p-8 w-full max-w-sm">
                <h1 className="text-2xl font-medium text-slate mb-1">Kratisimo</h1>
                <p className="text-slate/60 mb-6">Σύνδεση στον λογαριασμό σου</p>

                {error && (
                    <div className="bg-danger-tint text-danger rounded-xl px-4 py-3 mb-4 text-sm">
                        {error}
                    </div>
                )}

                <label className="block text-sm text-slate/70 mb-1">Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full border border-slate/20 rounded-xl px-3 py-2.5 mb-4 focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                />

                <label className="block text-sm text-slate/70 mb-1">Κωδικός</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="••••••••"
                    className="w-full border border-slate/20 rounded-xl px-3 py-2.5 mb-6 focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
                />

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-blue text-white rounded-xl py-3 font-medium hover:bg-blue-soft transition-colors disabled:opacity-50"
                >
                    {loading ? 'Σύνδεση...' : 'Σύνδεση'}
                </button>

                <p className="text-sm text-slate/60 text-center mt-5">
                    Δεν έχεις λογαριασμό;{' '}
                    <Link to="/register" className="text-blue font-medium hover:underline">
                        Εγγραφή
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default LoginPage;
