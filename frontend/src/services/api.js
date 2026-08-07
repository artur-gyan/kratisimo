// Κεντρικό σημείο επικοινωνίας με το backend.
// Κάθε request περνάει από εδώ — ένα σημείο για token, headers, errors.

const BASE_URL = '/api';

// Η "καρδιά": ένα request με auto-attach του token + auto error handling.
async function request(path, options = {}) {
    // 1. Πάρε το token από το localStorage (αν υπάρχει logged-in χρήστης).
    const token = localStorage.getItem('token');

    // 2. Φτιάξε τα headers.
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // 3. Αν έχουμε token, βάλ' το στο Authorization header.
    //    Το backend (JwtAuthenticationFilter) περιμένει "Bearer <token>".
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // 4. Κάνε το request.
    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
    });

    // 5. Αν το token έληξε/είναι άκυρο → 401. Καθάρισε & στείλε στο login.
    //    ΕΞΑΙΡΕΣΗ: στο login/register, ένα 401/403 σημαίνει "λάθος στοιχεία" —
    //    ΟΧΙ ληγμένο token. Δεν κάνουμε redirect· αφήνουμε το error να φτάσει
    //    στη σελίδα ώστε να δείξει το μήνυμα του backend.
    const isAuthAttempt = path.includes('/auth/login') || path.includes('/auth/register');

    if (response.status === 401 && !isAuthAttempt) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Μη εξουσιοδοτημένη πρόσβαση');
    }

    // 6. Αν το backend γύρισε error (4xx/5xx), διάβασε το μήνυμα και πέτα το.
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Κάτι πήγε στραβά');
    }

    // 7. Μερικά endpoints (π.χ. DELETE → 204) δεν έχουν body. Μην σκάσεις.
    if (response.status === 204) {
        return null;
    }

    // 8. Αλλιώς, γύρνα το JSON.
    return response.json();
}

// Βοηθητικές μέθοδοι ανά HTTP verb — καθαρότερο call site στις σελίδες.
export const api = {
    get: (path) => request(path, { method: 'GET' }),

    post: (path, body) =>
        request(path, { method: 'POST', body: JSON.stringify(body) }),

    put: (path, body) =>
        request(path, { method: 'PUT', body: JSON.stringify(body) }),

    delete: (path) => request(path, { method: 'DELETE' }),
};