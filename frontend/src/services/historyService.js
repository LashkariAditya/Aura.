import api from './api';

const historyService = {
    recordPlay: async (data) => {
        const response = await api.post('/history', data);
        return response.data;
    },

    getRecent: async (limit = 50) => {
        const response = await api.get('/history/recent', { params: { limit } });
        return response.data;
    },

    getTop: async (limit = 10, days = 30) => {
        const response = await api.get('/history/top', { params: { limit, days } });
        return response.data;
    }
};

export default historyService;
