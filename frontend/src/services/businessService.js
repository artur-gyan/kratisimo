import { api } from './api';

export function getBusinessInfo() {
    return api.get('/business-info');
}