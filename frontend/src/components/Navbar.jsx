import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate('/');
    }

    const isAdmin = user?.roles.includes('ADMIN');

    // Μόνο το μικρό όνομα: "Admin User" -> "Admin".
    const firstName = user?.fullName.split(' ')[0];

    return (
        <nav className="bg-white border-b border-slate/10 px-4 sm:px-6 py-3">
            <div className="max-w-5xl mx-auto flex items-center justify-between">

                {/* Λογότυπο */}
                <Link to="/" className="text-xl font-semibold text-slate tracking-tight">
                    Kratisimo
                </Link>

                {/* Δεξιά πλευρά */}
                <div className="flex items-center gap-2 sm:gap-3">

                    {/* --- ΜΗ ΣΥΝΔΕΔΕΜΕΝΟΣ --- */}
                    {!user && (
                        <Link
                            to="/login"
                            className="bg-blue text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-soft transition-colors"
                        >
                            Σύνδεση
                        </Link>
                    )}

                    {/* --- ΠΕΛΑΤΗΣ --- */}
                    {user && !isAdmin && (
                        <>
                            <Link
                                to="/appointments"
                                className="text-slate/70 text-sm font-medium px-3 py-2 rounded-lg hover:bg-page hover:text-slate transition-colors"
                            >
                                Τα ραντεβού μου
                            </Link>
                            <Link
                                to="/book"
                                className="bg-blue text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-soft transition-colors"
                            >
                                Κράτηση
                            </Link>
                        </>
                    )}

                    {/* --- ADMIN --- */}
                    {user && isAdmin && (
                        <>
                            <Link
                                to="/admin/dashboard"
                                className="text-slate/70 text-sm font-medium px-3 py-2 rounded-lg hover:bg-page hover:text-slate transition-colors"
                            >
                                Dashboard
                            </Link>
                            <Link
                                to="/admin/appointments"
                                className="text-slate/70 text-sm font-medium px-3 py-2 rounded-lg hover:bg-page hover:text-slate transition-colors"
                            >
                                Ραντεβού
                            </Link>
                        </>
                    )}

                    {/* --- ΚΟΙΝΑ ΓΙΑ ΣΥΝΔΕΔΕΜΕΝΟ --- */}
                    {/* --- ΚΟΙΝΑ ΓΙΑ ΣΥΝΔΕΔΕΜΕΝΟ --- */}
                    {user && (
                        <>
                            {/* Χωρίστρα: τέλος πλοήγησης, αρχή προφίλ */}
                            <span className="h-6 w-px bg-slate/15 mx-1 hidden sm:inline-block" />

                            {/* Προφίλ: όνομα + Έξοδος ομαδοποιημένα σε ένα "chip" */}
                            <div className="flex items-center gap-2">
                                <span className="text-slate text-sm font-medium hidden sm:inline">
                                    {firstName}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="text-slate/70 text-sm font-medium border border-slate/20 rounded-lg px-3 py-1.5 hover:bg-danger-tint hover:text-danger hover:border-danger/30 transition-colors"
                                >
                                    Έξοδος
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}