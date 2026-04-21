/**
 * 파일 역할: commentAPI 관련 서버 API 호출 로직을 캡슐화한 클라이언트 API 모듈.
 */
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
            const response = await APIClient.put(`/posts/comments/${commentId}`, commentData);
            return response;
        } catch (error) {
            throw error;
        }
    },

    async deleteComment(commentId) {
        try {
            const response = await APIClient.delete(`/posts/comments/${commentId}`);
            return response;
        } catch (error) {
            throw error;
        }
    }
};