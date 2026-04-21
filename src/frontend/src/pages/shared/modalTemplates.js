/**
 * 파일 역할: 반복되는 모달 마크업 구조를 재사용 가능한 템플릿으로 생성하는 헬퍼 파일.
 */
export function createModalTemplate({ id, titleHtml, body, actions, panelClass = 'modal-content' }) {
  return `
    <div class="modal hidden" id="${id}">
        <div class="${panelClass}">
            <div class="modal-header">${titleHtml}</div>
            <div class="modal-body">${body}</div>
            <div class="modal-footer">${actions}</div>
        </div>
    </div>
  `;
}
