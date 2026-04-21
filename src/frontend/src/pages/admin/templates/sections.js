/**
 * 파일 역할: 관리자 페이지의 주요 섹션 템플릿을 분리해 관리하는 파일.
 */
export const userEditPanelTemplate = `
<section class="admin-user-detail-panel hidden" id="user-edit-modal">
                        <div class="admin-user-detail-header">
                            <div>
                                <p class="admin-user-detail-eyebrow">회원 관리</p>
                                <h3 id="user-edit-modal-title">회원 정보 수정</h3>
                                <p class="admin-user-detail-description">선택한 회원의 정보를 확인하고 수정할 수 있습니다.</p>
                            </div>
                            <button class="btn btn-outline btn-sm" id="user-edit-cancel-btn" type="button">닫기</button>
                        </div>
                        <form id="user-edit-form" class="admin-user-detail-form">
                            <div class="profile-form-grid admin-user-form-grid">
                                <label>아이디
                                    <input type="text" id="admin-user-email" name="email" readonly>
                                </label>
                                <label>비밀번호
                                    <input type="password" id="admin-user-password" name="password" minlength="4" placeholder="변경 시 입력">
                                </label>
                                <label>비밀번호 확인
                                    <input type="password" id="admin-user-password-confirm" name="passwordConfirm" minlength="4" placeholder="비밀번호 재입력">
                                    <small id="admin-user-password-match-result" class="help-text" role="status"></small>
                                </label>
                                <label>이름
                                    <input type="text" id="admin-user-name" name="name" readonly>
                                </label>
                                <label>
                                    <span class="profile-field-title">닉네임</span>
                                    <input type="text" id="admin-user-nickname" name="nickname" minlength="2" maxlength="8" required>
                                </label>
                                <label>생년월일
                                    <input type="text" id="admin-user-birth" name="birthDate" readonly>
                                </label>
                                <label>이메일
                                    <input type="email" id="admin-user-email-display" name="emailDisplay" readonly>
                                </label>
                                <label>연락처
                                    <input type="text" id="admin-user-phone" name="phone" placeholder="010-0000-0000">
                                    <span class="profile-consent-inline"><input type="checkbox" id="admin-user-sms-consent" name="smsConsent"><span class="profile-consent-text">SMS 수신 동의</span></span>
                                </label>
                                <label>포인트
                                    <input type="number" id="admin-user-total-points" name="totalPoints" min="0" step="1">
                                </label>
                                <label>권한
                                    <select id="admin-user-role" name="role" class="form-control">
                                        <option value="MEMBER">MEMBER</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </label>
                                <label>회원 구분
                                    <select id="admin-user-member-type" name="memberType" class="form-control">
                                        <option value="MEMBER">일반 회원</option>
                                        <option value="BUSINESS">기업 회원</option>
                                    </select>
                                </label>
                                <label>계정 상태
                                    <select id="admin-user-account-status" name="accountStatus" class="form-control">
                                        <option value="ACTIVE">정상</option>
                                        <option value="SUSPENDED">정지</option>
                                    </select>
                                </label>
                                <label>로그인 제한 일수
                                    <input type="number" id="admin-user-login-restriction-days" name="loginRestrictionDays" min="1" step="1" placeholder="예: 1, 7, 30">
                                    <span class="profile-consent-inline"><input type="checkbox" id="admin-user-login-restriction-permanent" name="isLoginRestrictionPermanent"><span class="profile-consent-text">영구 제한</span></span>
                                </label>
                                <label>제한 만료일
                                    <input type="text" id="admin-user-login-restricted-until" name="loginRestrictedUntil" readonly>
                                </label>
                                <label>가입일
                                    <input type="text" id="admin-user-created-at" name="createdAt" readonly>
                                </label>
                            </div>
                            <section class="admin-user-activity" aria-labelledby="admin-user-activity-title">
                                <div class="admin-user-activity__header">
                                    <div>
                                        <p class="admin-user-detail-eyebrow">회원 활동 내역</p>
                                        <h4 id="admin-user-activity-title">최근 활동 및 접속 기록</h4>
                                    </div>
                                    <p class="admin-user-activity__caption">최근 10건 기준으로 관리자에게 표시됩니다.</p>
                                </div>
                                <div class="admin-user-activity-stats" id="admin-user-activity-stats">
                                    <div class="admin-user-activity-empty">회원 활동 데이터를 불러오는 중...</div>
                                </div>
                                <div class="admin-user-activity-grid">
                                    <section class="admin-user-activity-card">
                                        <h5>최근 게시글</h5>
                                        <div id="admin-user-activity-posts" class="admin-user-activity-list"></div>
                                    </section>
                                    <section class="admin-user-activity-card">
                                        <h5>최근 댓글</h5>
                                        <div id="admin-user-activity-comments" class="admin-user-activity-list"></div>
                                    </section>
                                    <section class="admin-user-activity-card">
                                        <h5>최근 좋아요</h5>
                                        <div id="admin-user-activity-likes" class="admin-user-activity-list"></div>
                                    </section>
                                    <section class="admin-user-activity-card">
                                        <h5>접속 IP 기록</h5>
                                        <div id="admin-user-login-history" class="admin-user-activity-list"></div>
                                    </section>
                                </div>
                            </section>
                            <p id="admin-user-save-result" class="help-text admin-user-save-result" role="status"></p>
                            <div class="admin-user-detail-actions">
                                <button class="btn btn-secondary" id="user-edit-cancel-btn-secondary" type="button">취소</button>
                                <button class="btn btn-primary" id="user-edit-save-btn" type="button">저장</button>
                            </div>
                        </form>
                    </section>

`;
