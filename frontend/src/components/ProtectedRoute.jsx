import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Τυλίγει μια σελίδα και αποφασίζει: μπαίνεις ή redirect;
// requiredRole: προαιρετικό. Αν δοθεί (π.χ. "ADMIN"),
// ελέγχει και ρόλο, όχι μόνο "είναι logged in;".
export default function ProtectedRoute({ children, requiredRole }) {
    const { user, loading } = useAuth();

    // ΒΗΜΑ 1 — το loading gate.
    // Όσο ελέγχουμε το token (πρώτο mount / μετά από refresh),
    // ΔΕΝ αποφασίζουμε τίποτα. Αν αποφασίζαμε τώρα, ο user είναι
    // στιγμιαία null => λάθος redirect σε /login σε κάθε F5.
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-page">
                <p className="text-slate">Loading...</p>
            </div>
        );
    }

    // ΒΗΜΑ 2 — δεν είναι logged in => στείλε στο login.
    // replace: αντικαθιστά το ιστορικό αντί να προσθέτει,
    // ώστε το "πίσω" του browser να μη γυρίζει στη μπλοκαρισμένη σελίδα.
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // ΒΗΜΑ 3 — role check (αν ζητήθηκε).
    // Είναι logged in αλλά ΔΕΝ έχει τον απαιτούμενο ρόλο
    // (π.χ. customer προσπαθεί να δει /admin/dashboard).
    // Στέλνουμε στην αρχική, όχι στο login (είναι ΗΔΗ συνδεδεμένος).
    if (requiredRole && !user.roles.includes(requiredRole)) {
        return <Navigate to="/" replace />;
    }

    // Πέρασε όλους τους ελέγχους => δείξε τη σελίδα.
    return children;
}