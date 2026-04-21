class MessageAPI {

    static async sendMessage(recipientId, content) {
        console.log('MessageAPI.sendMessage 호출됨');
        console.log('recipientId:', recipientId);
        console.log('content:', content);

        try {
            const messageData = {
                receiverId: recipientId,
                title: "쪽지",
                content: content
            };

            console.log('전송할 데이터:', messageData);

            const token = Auth.getToken();
            if (!token) {
                throw new Error('로그인이 필요합니다.');
            }

            const url = `${API_BASE_URL}/posts/messages`;
            console.log('요청 URL:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(messageData)
            });

            console.log('응답 상태:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('서버 에러 응답:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('성공 응답:', result);

            if (result.success) {
                if (typeof loadSentMessages === 'function') {
                    console.log('보낸쪽지함 새로고침 중...');
                    setTimeout(() => {
                        loadSentMessages();
                    }, 500);
                }

                if (typeof currentMessageTab !== 'undefined' && currentMessageTab === 'sent') {
                    console.log('마이페이지 보낸쪽지 탭 새로고침 중...');
                    setTimeout(() => {
                        if (typeof loadSentMessages === 'function') {
                            loadSentMessages();
                        }
                    }, 500);
                }
            } else {
                throw new Error(result.message || '알 수 없는 오류');
            }

            return result;

        } catch (error) {
            console.error('쪽지 전송 실패:', error);
            throw error;
        }
    }

    static async getReceivedMessages(page = 0, size = 10) {
        try {
            const token = Auth.getToken();
            if (!token) {
                throw new Error('로그인이 필요합니다.');
            }

            const url = `${API_BASE_URL}/posts/messages/received`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('받은 쪽지 조회 실패:', error);
            throw error;
        }
    }

    static async getSentMessages(page = 0, size = 10) {
        try {
            const token = Auth.getToken();
            if (!token) {
                throw new Error('로그인이 필요합니다.');
            }

            const url = `${API_BASE_URL}/posts/messages/sent`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('보낸 쪽지 조회 실패:', error);
            throw error;
        }
    }

    static async markAsRead(messageId) {
        try {
            const token = Auth.getToken();
            if (!token) {
                throw new Error('로그인이 필요합니다.');
            }

            const url = `${API_BASE_URL}/posts/messages/${messageId}/read`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('읽음 처리 실패:', error);
            throw error;
        }
    }

    static async deleteMessage(messageId, deleteType) {
        try {
            const token = Auth.getToken();
            if (!token) {
                throw new Error('로그인이 필요합니다.');
            }

            const url = `${API_BASE_URL}/posts/messages/${messageId}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ deleteType: deleteType })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('쪽지 삭제 실패:', error);
            throw error;
        }
    }

    static async getUnreadCount() {
        try {
            const token = Auth.getToken();
            if (!token) {
                throw new Error('로그인이 필요합니다.');
            }

            const url = `${API_BASE_URL}/posts/messages/unread-count`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('읽지 않은 쪽지 수 조회 실패:', error);
            throw error;
        }
    }
}

console.log('MessageAPI loaded - debug version');