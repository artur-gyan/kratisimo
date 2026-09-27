import { api } from './api';

export const settingsService = {
    get() {
        return api.get('/admin/settings');
    },
    update(body) {
        return api.put('/admin/settings', body);
    },
    // ΝΕΟ (2f-2): ξεχωριστό endpoint για το πρόγραμμα επιβράβευσης.
    // body = { enabled, visitsRequired, discountPercent } → επιστρέφει ολόκληρο SettingsResponse.
    updateLoyalty(body) {
        return api.put('/admin/settings/loyalty', body);
    },
};