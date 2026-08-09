import { api } from './api';

export const settingsService = {
    get() {
        return api.get('/admin/settings');
    },
};