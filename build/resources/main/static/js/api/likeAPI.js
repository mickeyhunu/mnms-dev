// 좋아요 기능 API 호출 관련 함수들
// 좋아요 추가/제거, 좋아요 수 조회 등을 처리

class LikeAPI {
    
    // 좋아요 토글 (추가/제거)
    // postId: 좋아요를 누를 게시글 ID
    static async toggleLike(postId) {
        try {
            const url = buildURL(ENDPOINTS.POSTS.LIKE, { id: postId });
            const response = await APIClient.post(url);
            
            // 좋아요 상태에 따른 메시지 표시는 UI에서 처리하도록 함
            // API는 데이터만 반환
            return response;
            
        } catch (error) {
            console.error('좋아요 처리 실패:', error);
            showNotification(error.message, 'error');
            throw error;
        }
    }
    
    // 특정 게시글의 좋아요 수 조회
    // postId: 조회할 게시글 ID
    static async getLikeCount(postId) {
        try {
            // 게시글 상세 정보에서 좋아요 정보를 가져옴
            const url = buildURL(ENDPOINTS.POSTS.DETAIL, { id: postId });
            const response = await APIClient.get(url);
            
            return {
                likeCount: response.likeCount || 0,
                isLiked: response.isLiked || false
            };
        } catch (error) {
            console.error('좋아요 수 조회 실패:', error);
            throw error;
        }
    }
    
    // 좋아요한 게시글 목록 조회 (마이페이지용)
    // page: 페이지 번호
    // size: 한 페이지당 게시글 수
    static async getLikedPosts(page = 0, size = 10) {
        try {
            // 실제로는 별도 API가 있어야 하지만, 현재는 사용자 정보에서 가져옴
            const params = { page, size, liked: true };
            const url = buildURL(ENDPOINTS.USERS.POSTS);
            const response = await APIClient.get(url, params);
            
            return response;
        } catch (error) {
            console.error('좋아요한 게시글 조회 실패:', error);
            throw error;
        }
    }
}