/**
 * 파일 역할: apiClient 관련 서버 API 호출 로직을 캡슐화한 클라이언트 API 모듈.
 */
const APIClient = {
    async get(endpoint, params = {}) {
        let url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
        
        if (Object.keys(params).length > 0) {
            const urlParams = new URLSearchParams(params);
            url += '?' + urlParams.toString();
        }
        
        
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            const token = Auth.getToken();
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
                credentials: 'include'
            });
            
            
            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                
                const error = new Error(errorData.message || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            const responseData = await response.json();
            return responseData;
            
        } catch (error) {
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                error.message = '네트워크 연결에 문제가 발생했습니다.';
            }
            console.error('API Client error:', error);
            throw error;
        }
    },

    async post(endpoint, data = {}) {
        const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
        
        try {
            console.info('[APIClient.post] 요청 시작', { endpoint, url });
            const headers = {
                'Content-Type': 'application/json'
            };
            
            const token = Auth.getToken();
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                credentials: 'include',
                body: JSON.stringify(data)
            });
            console.info('[APIClient.post] 응답 수신', {
                endpoint,
                status: response.status,
                ok: response.ok
            });
            
            
            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                
                const error = new Error(errorData.message || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                error.status = response.status;
                error.data = errorData;
                console.error('[APIClient.post] 요청 실패', {
                    endpoint,
                    status: response.status,
                    errorData
                });
                throw error;
            }

            const responseData = await response.json();
            console.info('[APIClient.post] 요청 성공', { endpoint });
            return responseData;
            
        } catch (error) {
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                error.message = '네트워크 연결에 문제가 발생했습니다.';
            }
            console.error('API Client error:', error);
            throw error;
        }
    },

    async put(endpoint, data = {}) {
        const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
        
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            const token = Auth.getToken();
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: headers,
                credentials: 'include',
                body: JSON.stringify(data)
            });
            
            
            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                
                const error = new Error(errorData.message || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            const responseData = await response.json();
            return responseData;
            
        } catch (error) {
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                error.message = '네트워크 연결에 문제가 발생했습니다.';
            }
            console.error('API Client error:', error);
            throw error;
        }
    },

    async patch(endpoint, data = {}) {
        const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;

        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            const token = Auth.getToken();
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }

            const response = await fetch(url, {
                method: 'PATCH',
                headers: headers,
                credentials: 'include',
                body: JSON.stringify(data)
            });


            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }

                const error = new Error(errorData.message || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            const responseData = await response.json();
            return responseData;

        } catch (error) {
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                error.message = '네트워크 연결에 문제가 발생했습니다.';
            }
            console.error('API Client error:', error);
            throw error;
        }
    },

    async delete(endpoint, data = null) {
        const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
        
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            const token = Auth.getToken();
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: headers,
                credentials: 'include'
                ,
                body: data ? JSON.stringify(data) : undefined
            });
            
            
            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                
                const error = new Error(errorData.message || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
                error.status = response.status;
                error.data = errorData;
                throw error;
            }

            if (response.status === 204) {
                return null;
            }

            const responseData = await response.json();
            return responseData;
            
        } catch (error) {
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                error.message = '네트워크 연결에 문제가 발생했습니다.';
            }
            console.error('API Client error:', error);
            throw error;
        }
    }
};
