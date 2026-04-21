const PostAPI = {
    async getPosts(params = {}) {
        try {
            const page = params.page !== undefined ? params.page : 0;
            const size = params.size || 10;
            return await APIClient.get(`/api/posts?page=${page}&size=${size}`);
        } catch (error) {
            throw error;
        }
    },

    async getPost(postId) {
        try {
            return await APIClient.get(`/api/posts/${postId}`);
        } catch (error) {
            throw error;
        }
    },

    async createPost(postData) {
        try {
            return await APIClient.post(`/api/posts`, postData);
        } catch (error) {
            throw error;
        }
    },

    async updatePost(postId, postData) {
        try {
            return await APIClient.put(`/api/posts/${postId}`, postData);
        } catch (error) {
            throw error;
        }
    },

    async deletePost(postId) {
        try {
            return await APIClient.delete(`/api/posts/${postId}`);
        } catch (error) {
            throw error;
        }
    },

    async toggleLike(postId) {
        try {
            return await APIClient.post(`/api/posts/${postId}/like`);
        } catch (error) {
            throw error;
        }
    },

    async toggleBookmark(postId) {
        try {
            return await APIClient.post(`/api/posts/${postId}/bookmark`);
        } catch (error) {
            throw error;
        }
    }
};

console.log('PostAPI loaded');