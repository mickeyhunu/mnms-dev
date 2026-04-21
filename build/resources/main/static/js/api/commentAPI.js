const CommentAPI = {
    async getComments(postId, page = 1, size = 10) {
        try {
            const response = await APIClient.get(`/posts/${postId}/comments`, {
                page: page,
                size: size
            });
            return response;
        } catch (error) {
            throw error;
        }
    },

    async createComment(postId, commentData) {
        try {
            const response = await APIClient.post(`/posts/${postId}/comments`, commentData);
            return response;
        } catch (error) {
            throw error;
        }
    },

    async updateComment(commentId, commentData) {
        try {
            const response = await APIClient.put(`/comments/${commentId}`, commentData);
            return response;
        } catch (error) {
            throw error;
        }
    },

    async deleteComment(commentId) {
        try {
            const response = await APIClient.delete(`/comments/${commentId}`);
            return response;
        } catch (error) {
            throw error;
        }
    }
};