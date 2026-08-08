import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

// Το Context είναι ο "αγωγός" που μεταφέρει την κατάσταση auth
// σε ΟΛΟ το component tree, χωρίς να περνάμε props χειροκίνητα
// από γονιό σε παιδί σε παιδί (prop drilling).
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // user: null = δεν είναι logged in (ή δεν ξέρουμε ακόμα).
    //       object = {id, email, fullName, roles} από το /me.
    const [user, setUser] = useState(null);

    // loading: ΚΡΙΣΙΜΟ. true όσο ελέγχουμε το token στο πρώτο mount.
    // Χωρίς αυτό, τα protected routes θα έκαναν redirect σε /login
    // για ένα κλάσμα δευτερολέπτου σε κάθε refresh, ακόμα κι όταν
    // ο χρήστης είναι κανονικά συνδεδεμένος (το /me δεν έχει απαντήσει ακόμα).
    const [loading, setLoading] = useState(true);

    // useEffect με [] dependency array => τρέχει ΜΙΑ φορά στο mount.
    // Εδώ γίνεται το "session restore": αν υπάρχει token στο localStorage,
    // ρωτάμε το backend "ποιος είμαι;" για να ξαναγεμίσουμε το user state
    // μετά από F5/refresh (όπου το React state χάνεται αλλά το token μένει).
    useEffect(() => {
        async function restoreSession() {
            const token = localStorage.getItem('token');

            // Κανένα token => σίγουρα μη συνδεδεμένος. Δεν χτυπάμε καν το API.
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                // Token υπάρχει, αλλά μπορεί να έχει λήξει ή να είναι άκυρο.
                // Το /me είναι authenticated: αν το token δεν ισχύει, γυρνάει 401.
                const me = await authService.getCurrentUser();
                setUser(me);
            } catch {
                // 401/άλλο σφάλμα => το token δεν ισχύει πια. Καθάρισέ το.
                // Δεν κάνουμε redirect εδώ — απλά "δεν είσαι logged in".
                localStorage.removeItem('token');
                setUser(null);
            } finally {
                // Είτε πέτυχε είτε απέτυχε, ο έλεγχος τελείωσε.
                // Τώρα τα protected routes μπορούν να αποφασίσουν με ασφάλεια.
                setLoading(false);
            }
        }

        restoreSession();
    }, []);

    // login action: orchestration πάνω από το authService.
    // Το context δεν ξέρει από endpoints — το authService τα ξέρει.
    // Εδώ απλά συντονίζουμε: login -> me -> γέμισε το state.
    async function login(email, password) {
        // Βήμα 1: POST /auth/login. Αποθηκεύει το token (μέσα στο authService).
        await authService.login(email, password);

        // Βήμα 2: GET /auth/me. Τώρα που υπάρχει token, ρωτάμε ποιοι είμαστε
        // (roles για routing κ.λπ. — D112, roles ΠΟΤΕ στο token).
        const me = await authService.getCurrentUser();

        // Βήμα 3: γέμισε το state => όλο το tree ενημερώνεται ταυτόχρονα.
        setUser(me);

        // Επιστρέφουμε το me ώστε η LoginPage να αποφασίσει το redirect
        // (π.χ. admin -> /admin/dashboard) χωρίς να περιμένει re-render.
        return me;
    }

    // logout: stateless (D54). Σβήνουμε το token, μηδενίζουμε το state.
    // Καμία ειδοποίηση στον server — το JWT απλά "ξεχνιέται" client-side.
    function logout() {
        authService.logout();
        setUser(null);
    }

    // Το value είναι ό,τι βλέπουν τα children μέσω useAuth().
    const value = { user, loading, login, logout };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook: αντί κάθε component να κάνει useContext(AuthContext),
// καλεί useAuth(). Καθαρότερο + πιάνουμε το λάθος "ξέχασες τον Provider".
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}