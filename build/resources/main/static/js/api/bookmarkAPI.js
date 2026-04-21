const BookmarkAPI = {
    async getMyBookmarks(page = 0, size = 10) {
        try {
            const response = await APIClient.get(`/bookmarks/my?page=${page}&size=${size}`);
            return response;
        } catch (error) {
            console.error('북마크 목록 조회 실패:', error);
            throw new Error(error.message || '북마크 목록을 불러올 수 없습니다');
        }
    },

    async isBookmarked(postId) {
        try {
            const response = await APIClient.get(`/bookmarks/check/${postId}`);
            return response.isBookmarked;
        } catch (error) {
            console.error('북마크 상태 확인 실패:', error);
            return false;
        }
    },

    async toggleBookmark(postId) {
        try {
            const response = await APIClient.post(`/bookmarks/${postId}/toggle`);
            
            if (response.success) {
                if (typeof showNotification === 'function') {
                    showNotification(response.message, 'success');
                }
                return response.isBookmarked;
            } else {
                throw new Error(response.message || '북마크 처리에 실패했습니다');
            }
        } catch (error) {
            console.error('북마크 토글 실패:', error);
            
            if (typeof showNotification === 'function') {
                showNotification(error.message || '북마크 처리 중 오류가 발생했습니다', 'error');
            }
            
            throw error;
        }
    }
};