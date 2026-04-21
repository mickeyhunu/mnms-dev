const AuthAPI = {
    async login(credentials) {
        try {
            const response = await APIClient.post('/auth/login', credentials);

            console.log('=== AuthAPI.login 디버깅 ===');
            console.log('전체 응답:', response);
            console.log('response.token 존재?', !!response.token);
            console.log('토큰 값:', response.token);

            if (response.token) {
                console.log('토큰 저장 시도...');
                Auth.setToken(response.token);
                console.log('토큰 저장 후 확인:', Auth.getToken());

                const userData = {
                    id: response.id,
                    email: response.email,
                    nickname: response.nickname,
                    isAdmin: response.isAdmin
                };
                console.log('사용자 데이터 저장 시도:', userData);
                Auth.setUser(userData);
                console.log('사용자 저장 후 확인:', Auth.getUser());
            } else {
                console.error('응답에 토큰이 없습니다!');
            }

            return response;
        } catch (error) {
            console.error('AuthAPI.login 에러:', error);
            throw error;
        }
    },

    async register(userData) {
        try {
            const response = await APIClient.post('/auth/register', userData);
            return response;
        } catch (error) {
            throw error;
        }
    },

    async logout() {
        try {
            await APIClient.post('/auth/logout');
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            Auth.logout();
        }
    },

    async getCurrentUser() {
        try {
            const response = await APIClient.get('/auth/me');

            if (response) {
                Auth.setUser({
                    id: response.id,
                    email: response.email,
                    nickname: response.nickname,
                    isAdmin: response.isAdmin
                });
            }

            return response;
        } catch (error) {
            Auth.logout();
            throw error;
        }
    },

    async checkTokenValidity() {
        try {
            await this.getCurrentUser();
            return true;
        } catch (error) {
            return false;
        }
    }
};

console.log('AuthAPI loaded');