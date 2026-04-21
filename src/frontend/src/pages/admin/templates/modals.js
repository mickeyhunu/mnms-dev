/**
 * 파일 역할: 관리자 페이지에서 사용하는 모달 템플릿을 한곳에 모아 관리하는 파일.
 */
import { createModalTemplate } from '../../shared/modalTemplates.js';

const supportModalBody = `
                <div class="form-group"><label class="form-label" for="support-form-category">구분</label><select id="support-form-category" class="form-control"><option value="NOTICE">공지사항</option><option value="FAQ">FAQ</option></select></div>
                <div class="form-group" id="support-notice-options"><label class="form-label" for="support-form-notice-type">공지 옵션</label><div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;"><select id="support-form-notice-type" class="form-control" style="max-width:200px;"><option value="NOTICE">공지</option><option value="IMPORTANT">필독</option></select><label><input type="checkbox" id="support-form-is-pinned"> 커뮤니티 상단 고정</label></div></div>
                <div class="form-group"><label class="form-label" for="support-form-title">제목</label><input id="support-form-title" class="form-control" maxlength="255"></div>
                <div class="form-group"><label class="form-label" for="support-form-content">내용</label><textarea id="support-form-content" class="form-control" rows="8"></textarea></div>
`;

const inquiryAnswerModalBody = `
                <p id="inquiry-answer-target" class="text-muted"></p>
                <div class="form-group"><label class="form-label" for="inquiry-answer-content">답변 내용</label><textarea id="inquiry-answer-content" class="form-control" rows="8"></textarea></div>
`;

const deleteModalBody = `<p id="delete-modal-message">정말로 삭제하시겠습니까?</p><p class="text-muted text-sm">삭제된 내용은 복구할 수 없습니다.</p>`;

export const adminModalTemplates = [
  createModalTemplate({
    id: 'support-modal',
    titleHtml: '<h3 id="support-modal-title">공지/FAQ 작성</h3>',
    body: supportModalBody,
    actions: '<button class="btn btn-secondary" id="support-cancel-btn">취소</button><button class="btn btn-primary" id="support-save-btn">저장</button>'
  }),
  createModalTemplate({
    id: 'inquiry-answer-modal',
    titleHtml: '<h3 id="inquiry-answer-modal-title">문의 답변</h3>',
    body: inquiryAnswerModalBody,
    actions: '<button class="btn btn-secondary" id="inquiry-answer-cancel-btn">취소</button><button class="btn btn-primary" id="inquiry-answer-save-btn">답변 저장</button>'
  }),
  createModalTemplate({
    id: 'delete-modal',
    titleHtml: '<h3 id="delete-modal-title">삭제 확인</h3>',
    body: deleteModalBody,
    actions: '<button class="btn btn-secondary" id="delete-cancel-btn">취소</button><button class="btn btn-danger" id="delete-confirm-btn">삭제</button>'
  })
].join('\n\n');
