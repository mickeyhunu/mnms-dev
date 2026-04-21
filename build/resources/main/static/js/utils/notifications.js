class NotificationSettings {
    static getSettings() {
        const settings = localStorage.getItem('notificationSettings');
        return settings ? JSON.parse(settings) : {
            messageNotifications: true,
            commentNotifications: true,
            likeNotifications: true
        };
    }
    
    static saveSettings(settings) {
        localStorage.setItem('notificationSettings', JSON.stringify(settings));
    }
    
    static isMessageNotificationEnabled() {
        return this.getSettings().messageNotifications;
    }
    
    static isCommentNotificationEnabled() {
        return this.getSettings().commentNotifications;
    }
    
    static isLikeNotificationEnabled() {
        return this.getSettings().likeNotifications;
    }
    
    static toggleMessageNotification() {
        const settings = this.getSettings();
        settings.messageNotifications = !settings.messageNotifications;
        this.saveSettings(settings);
        return settings.messageNotifications;
    }
    
    static toggleCommentNotification() {
        const settings = this.getSettings();
        settings.commentNotifications = !settings.commentNotifications;
        this.saveSettings(settings);
        return settings.commentNotifications;
    }
    
    static toggleLikeNotification() {
        const settings = this.getSettings();
        settings.likeNotifications = !settings.likeNotifications;
        this.saveSettings(settings);
        return settings.likeNotifications;
    }
}

function showNotification(message, type = 'info') {
    if (type === 'comment' && !NotificationSettings.isCommentNotificationEnabled()) {
        return;
    }
    
    if (type === 'message' && !NotificationSettings.isMessageNotificationEnabled()) {
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        background-color: ${type === 'success' ? '#28a745' : 
                          type === 'error' ? '#dc3545' : 
                          type === 'comment' ? '#17a2b8' :
                          type === 'message' ? '#6f42c1' : '#007bff'};
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 3000);
}

function createNotificationToggle() {
    const settings = NotificationSettings.getSettings();
    
    return `
        <div class="notification-settings">
            <h4>알림 설정</h4>
            <div class="toggle-group">
                <div class="toggle-item">
                    <span>쪽지 알림</span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="message-toggle" ${settings.messageNotifications ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="toggle-item">
                    <span>댓글 알림</span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="comment-toggle" ${settings.commentNotifications ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>
    `;
}

const notificationToggleCSS = `
.notification-settings {
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
}

.notification-settings h4 {
    margin-bottom: 16px;
    color: #2c3e50;
    font-weight: 600;
}

.toggle-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.toggle-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.toggle-switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 24px;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.3s;
    border-radius: 24px;
}

.toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
}

input:checked + .toggle-slider {
    background-color: #007bff;
}

input:checked + .toggle-slider:before {
    transform: translateX(26px);
}

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
`;

if (!document.querySelector('#notification-toggle-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-toggle-styles';
    style.textContent = notificationToggleCSS;
    document.head.appendChild(style);
}

function setupNotificationToggles() {
    const messageToggle = document.getElementById('message-toggle');
    const commentToggle = document.getElementById('comment-toggle');
    
    if (messageToggle) {
        messageToggle.addEventListener('change', function() {
            const enabled = NotificationSettings.toggleMessageNotification();
            showNotification(`쪽지 알림이 ${enabled ? '켜졌습니다' : '꺼졌습니다'}`, 'info');
        });
    }
    
    if (commentToggle) {
        commentToggle.addEventListener('change', function() {
            const enabled = NotificationSettings.toggleCommentNotification();
            showNotification(`댓글 알림이 ${enabled ? '켜졌습니다' : '꺼졌습니다'}`, 'info');
        });
    }
}

console.log('NotificationSettings loaded');