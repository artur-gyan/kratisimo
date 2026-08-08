import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
    // Τοπική κατάσταση της φόρμας.
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Το login action από το context. Κάνει login + /me + γεμίζει
    // το global user state (ώστε η Navbar να ενημερωθεί ταυτόχρονα).
    const { login } = useAuth();

    // Το router μας αφήνει να αλλάξουμε σελίδα προγραμματιστικά.
    const navigate = useNavigate();

    async function handleSubmit() {
        setError('');
        setLoading(true);

        try {
            // Μία κλήση αντί για δύο: το context κάνει login → /me
            // → setUser εσωτερικά. Επιστρέφει το me για άμεσο routing.
            const me = await login(email, password);

            // Στείλε τον στη σωστή σελίδα ανάλογα με τον ρόλο.
            if (me.roles.includes('ADMIN')) {
                navigate('/admin/dashboard');
            } else {
                navigate('/');
            }
        } catch (err) {
            // Το api.js πέταξε το μήνυμα του backend (π.χ. "Λάθος στοιχεία").
            // ΑΜΕΤΑΒΛΗΤΟ — το D114 fix ζει εδώ και δουλεύει.
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

                {/* Μήνυμα λάθους — εμφανίζεται μόνο αν υπάρχει */}
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
            </div>
        </div>
    );
}

export default LoginPage;