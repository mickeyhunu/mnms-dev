/**
 * 파일 역할: LIVE 페이지의 렌더링 설정을 정의하는 파일.
 */
import { createPageConfig } from '../shared/createPageConfig.js';
import { liveStickyHeaderTemplate, liveScrollBottomButtonTemplate } from './templates/index.js';
import { shareSheetTemplate } from '../post-detail/templates/shareSheet.js';

const liveTemplate = `
<main class="main-content live-main-content">
        <div class="container live-page">
            ${liveStickyHeaderTemplate}


            <div class="live-loading-overlay hidden" id="live-loading" aria-live="polite" aria-busy="true">
                <div class="live-loading-overlay__content">
                    <div class="spinner" aria-hidden="true"></div>
                    <p>Loading...</p>
                </div>
            </div>
            <div class="live-feedback live-feedback--error hidden" id="live-error"></div>
            <div class="live-feedback hidden" id="live-empty">선택한 조건에 해당하는 데이터가 없습니다.</div>

            <div class="live-content">
                <section class="live-entry-list" id="live-entry-list" aria-label="LIVE 데이터 목록"></section>
            </div>
            <div class="live-ads-wrap">
                <section class="live-ads hidden" id="live-ads-container" aria-label="LIVE 하단 광고 배너"></section>
            </div>

            ${liveScrollBottomButtonTemplate}
            ${shareSheetTemplate}
        </div>
    </main>
`;

export const livePageConfig = createPageConfig({
  template: liveTemplate,
  styles: ['styles/common.css', 'styles/layout.css', 'styles/components.css', 'styles/section-header.css', 'styles/live.css'],
  scripts: ['scripts/js/utils/constants.js', 'scripts/js/utils/helpers.js', 'scripts/js/utils/auth.js', 'scripts/js/api/apiClient.js', 'scripts/js/api/authAPI.js', 'scripts/js/components/header.js', 'scripts/js/components/sectionHeader.js', 'scripts/js/pages/live.js']
});
