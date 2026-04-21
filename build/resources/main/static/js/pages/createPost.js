let isSubmitting = false;

function initCreatePost() {
    if (!Auth.isAuthenticated()) {
        alert('로그인이 필요합니다.');
        window.location.href = '/login';
        return;
    }

    setupEventListeners();
    setupImageUpload();
}

function setupEventListeners() {
    const submitBtn = document.getElementById('submit-btn');
    const cancelBtn = document.querySelector('a[href="/index"]');
    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');

    if (submitBtn) {
        submitBtn.addEventListener('click', handleSubmit);
    }

    if (titleInput) {
        titleInput.addEventListener('input', function() {
            updateCharCount('title', 100);
            validateForm();
        });
    }

    if (contentInput) {
        contentInput.addEventListener('input', function() {
            updateCharCount('content', 1000);
            validateForm();
        });
    }
}

function setupImageUpload() {
    const imageInput = document.getElementById('image-files');
    const imagePreview = document.getElementById('image-preview');

    if (imageInput) {
        imageInput.addEventListener('change', function(event) {
            const files = event.target.files;
            console.log('선택된 파일 개수:', files.length);
            displayImagePreview(files);
        });
    }
}

function displayImagePreview(files) {
    const previewContainer = document.getElementById('image-preview');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    Array.from(files).forEach((file, index) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'image-preview-item';
                previewDiv.style.cssText = `
                    position: relative;
                    display: inline-block;
                    margin: 5px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    overflow: hidden;
                `;
                previewDiv.innerHTML = `
                    <img src="${e.target.result}" alt="미리보기 ${index + 1}" style="
                        width: 150px;
                        height: 150px;
                        object-fit: cover;
                        display: block;
                    ">
                    <button type="button" onclick="removeImage(${index})" class="remove-image-btn" style="
                        position: absolute;
                        top: 5px;
                        right: 5px;
                        width: 25px;
                        height: 25px;
                        border: none;
                        background: rgba(255,255,255,0.8);
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 16px;
                        font-weight: bold;
                    ">×</button>
                `;
                previewContainer.appendChild(previewDiv);
            };
            reader.readAsDataURL(file);
        }
    });
}

function removeImage(index) {
    const imageInput = document.getElementById('image-files');
    if (!imageInput || !imageInput.files) return;

    const dt = new DataTransfer();
    const files = Array.from(imageInput.files);
    
    files.forEach((file, i) => {
        if (i !== index) {
            dt.items.add(file);
        }
    });
    
    imageInput.files = dt.files;
    displayImagePreview(imageInput.files);
    
    console.log('이미지 제거 후 파일 개수:', imageInput.files.length);
}

function updateCharCount(fieldId, maxLength) {
    const field = document.getElementById(fieldId);
    const counter = document.getElementById(`${fieldId}-count`);
    
    if (field && counter) {
        const currentLength = field.value.length;
        counter.textContent = `${currentLength}/${maxLength}`;
        
        if (currentLength > maxLength) {
            counter.style.color = '#dc3545';
        } else {
            counter.style.color = '#6c757d';
        }
    }
}

function validateForm() {
    const title = document.getElementById('title');
    const content = document.getElementById('content');
    const submitBtn = document.getElementById('submit-btn');

    if (!title || !content || !submitBtn) return;

    const isValid = title.value.trim().length > 0 && 
                   content.value.trim().length >= 10 &&
                   title.value.length <= 255 &&
                   content.value.length <= 1000;

    submitBtn.disabled = !isValid || isSubmitting;
}

async function handleSubmit(event) {
    event.preventDefault();
    
    if (isSubmitting) return;

    const title = document.getElementById('title');
    const content = document.getElementById('content');
    const imageInput = document.getElementById('image-files');
    const submitBtn = document.getElementById('submit-btn');

    if (!title || !content) {
        alert('필수 입력 필드를 찾을 수 없습니다.');
        return;
    }

    const titleValue = title.value.trim();
    const contentValue = content.value.trim();

    if (!titleValue || !contentValue) {
        alert('제목과 내용을 모두 입력해주세요.');
        return;
    }

    if (contentValue.length < 10) {
        alert('내용은 최소 10자 이상 입력해주세요.');
        return;
    }

    if (titleValue.length > 255) {
        alert('제목은 255자 이하로 입력해주세요.');
        return;
    }

    if (contentValue.length > 1000) {
        alert('내용은 1000자 이하로 입력해주세요.');
        return;
    }

    isSubmitting = true;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '작성 중...';
    }

    try {
        const formData = new FormData();
        formData.append('title', titleValue);
        formData.append('content', contentValue);

        console.log('FormData 생성 완료');
        console.log('제목:', titleValue);
        console.log('내용:', contentValue);

        if (imageInput && imageInput.files && imageInput.files.length > 0) {
            console.log('이미지 파일 개수:', imageInput.files.length);
            
            for (let i = 0; i < imageInput.files.length; i++) {
                const file = imageInput.files[i];
                console.log(`이미지 ${i + 1}:`, file.name, file.size, file.type);
                formData.append('files', file);
            }
        } else {
            console.log('선택된 이미지 파일이 없습니다.');
        }

        console.log('FormData 내용:');
        for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
                console.log(key + ':', value.name, value.size, value.type);
            } else {
                console.log(key + ':', value);
            }
        }

        console.log('글 작성 요청 전송 중...');

        const token = Auth.getToken();
        if (!token) {
            throw new Error('로그인 토큰이 없습니다. 다시 로그인해주세요.');
        }

        const headers = {
            'Authorization': 'Bearer ' + token
        };

        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: headers,
            body: formData,
            credentials: 'same-origin'
        });

        console.log('응답 상태:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('서버 응답 오류:', errorText);
            throw new Error('글 작성에 실패했습니다: ' + errorText);
        }

        const result = await response.json();
        
        console.log('글 작성 응답:', result);

        if (result && result.success) {
            alert('글이 작성되었습니다!');
            window.location.href = '/';
        } else {
            throw new Error('글 작성에 실패했습니다.');
        }

    } catch (error) {
        console.error('글 작성 에러:', error);
        
        let errorMessage = '글 작성 중 오류가 발생했습니다.';
        
        if (error.status === 401) {
            errorMessage = '로그인이 필요합니다. 다시 로그인해주세요.';
            setTimeout(() => {
                window.location.href = '/login';
            }, 1000);
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        alert(errorMessage);
        
    } finally {
        isSubmitting = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '작성하기';
        }
        validateForm();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCreatePost);
} else {
    initCreatePost();
}