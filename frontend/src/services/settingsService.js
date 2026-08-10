import { api } from './api';

export const settingsService = {
    get() {
        return api.get('/admin/settings');
    },
    update(body) {
        return api.put('/admin/settings', body);
    },
};