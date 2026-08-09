// Λογική authentication: login, register, logout, me.
// Χτίζει πάνω στο api.js — δεν ξαναγράφει fetch/token/errors.

import { api } from './api';

export const authService = {
    // Στέλνει email+password στο backend. Αν πετύχει, αποθηκεύει το token.
    async login(email, password) {
        // Το backend περιμένει { email, password } (LoginRequest).
        const response = await api.post('/auth/login', { email, password });

        // Το backend γυρίζει { token, email, fullName } (AuthResponse).
        // Αποθηκεύουμε ΜΟΝΟ το token — τους ρόλους τους παίρνουμε από το /me.
        localStorage.setItem('token', response.token);

        return response;
    },

    // Εγγραφή νέου χρήστη. Το backend γυρίζει AuthResponse (ίδιο με login)
    // → auto-login: αποθηκεύουμε το token αμέσως, ίδια λογική με το login().
    async register(data) {
        // data = { email, password, fullName, phone } (RegisterRequest).
        const response = await api.post('/auth/register', data);

        // Ίδιο AuthResponse με το login → αποθήκευσε το token.
        // Τους ρόλους τους παίρνει το /me (D112), όχι από εδώ.
        localStorage.setItem('token', response.token);

        return response;
    },

    // Παίρνει τον τρέχοντα χρήστη (με roles), φρέσκα από τη βάση.
    // Το api.js βάζει αυτόματα το token στο header.
    async getCurrentUser() {
        // Γυρίζει { id, email, fullName, roles } (MeResponse).
        return api.get('/auth/me');
    },

    // Σβήνει το token — ο χρήστης αποσυνδέεται.
    logout() {
        localStorage.removeItem('token');
    },
};