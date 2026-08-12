import { api } from './api';

// Admin customer search (D141). Ελάχιστα 3 χαρακτήρες (backend guard) — κάτω από 3
// γυρνάει κενή λίστα. Ψάχνει σε όνομα Ή τηλέφωνο (accent+case insensitive).
export const customerSearchService = {
    search(q) {
        return api.get(`/admin/customers?q=${encodeURIComponent(q)}`);
    },
};