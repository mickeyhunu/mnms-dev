const APIClient = {
    async get(endpoint, params = {}) {
        let url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
        
        if (Object.keys(params).length > 0) {
            const urlParams = new URLSearchParams(params);
            url += '?' + urlParams.toString();
        }
        
        console.log('API GET Request:', url);
        
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
            
            console.log('API Response status:', response.status);
            
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
            console.log('API Response data:', responseData);
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
        console.log('API POST Request:', url, data);
        
        try {
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
            
            console.log('API Response status:', response.status);
            
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
            console.log('API Response data:', responseData);
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
        console.log('API PUT Request:', url, data);
        
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
            
            console.log('API Response status:', response.status);
            
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
            console.log('API Response data:', responseData);
            return responseData;
            
        } catch (error) {
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                error.message = '네트워크 연결에 문제가 발생했습니다.';
            }
            console.error('API Client error:', error);
            throw error;
        }
    },

    async delete(endpoint) {
        const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
        console.log('API DELETE Request:', url);
        
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
            });
            
            console.log('API Response status:', response.status);
            
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
            console.log('API Response data:', responseData);
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

console.log('APIClient loaded');