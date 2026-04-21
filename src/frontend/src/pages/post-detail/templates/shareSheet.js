/**
 * 파일 역할: 게시글 상세 페이지의 공유 시트를 분리해 관리하는 파일.
 */
export const shareSheetTemplate = `
<div class="share-sheet hidden" id="share-sheet" aria-hidden="true">
                <div class="share-sheet-overlay" id="share-sheet-overlay"></div>
                <div class="share-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="share-sheet-title">
                    <button type="button" class="share-sheet-handle" id="share-sheet-close" aria-label="공유하기 닫기"></button>
                    <div class="share-sheet-content">
                        <div class="share-sheet-title" id="share-sheet-title">공유하기</div>
                        <div class="share-sheet-actions">
                            <button type="button" class="share-action-btn" id="share-kakao-btn">
                                <span class="share-action-icon share-action-icon-kakao" aria-hidden="true">K</span>
                                <span class="share-action-label">카카오톡</span>
                            </button>
                            <button type="button" class="share-action-btn" id="share-sms-btn">
                                <span class="share-action-icon share-action-icon-sms" aria-hidden="true">
                                    <svg viewBox="0 0 24 24"><path d="M3 6.75A1.75 1.75 0 0 1 4.75 5h14.5A1.75 1.75 0 0 1 21 6.75v10.5A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25V6.75Z"></path><path d="m4 7 8 6 8-6"></path></svg>
                                </span>
                                <span class="share-action-label">문자공유</span>
                            </button>
                            <button type="button" class="share-action-btn" id="share-copy-btn">
                                <span class="share-action-icon share-action-icon-copy" aria-hidden="true">
                                    <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.071 0l2.829-2.828a5 5 0 1 0-7.071-7.071L11 4.929"></path><path d="M14 11a5 5 0 0 0-7.071 0L4.1 13.828a5 5 0 0 0 7.071 7.071L13 19.071"></path></svg>
                                </span>
                                <span class="share-action-label">링크공유</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
`;
