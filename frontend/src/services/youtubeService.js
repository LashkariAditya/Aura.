import api from './api';

const youtubeService = {
    search: async (query) => {
        const response = await api.get(`/youtube/search?q=${encodeURIComponent(query)}`);
        return response.data;
    },
    getPlaylist: async (listId) => {
        const response = await api.get(`/youtube/playlist?listId=${encodeURIComponent(listId)}`);
        return response.data;
    },
    searchMatch: async (query) => {
        const response = await api.get(`/youtube/match?q=${encodeURIComponent(query)}`);
        return response.data;
    }
};

export default youtubeService;
