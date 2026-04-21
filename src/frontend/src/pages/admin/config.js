/**
 * 파일 역할: 관리자 페이지의 렌더링 설정을 정의하는 파일.
 */
import { createPageConfig } from '../shared/createPageConfig.js';
import { adminTemplate } from './templates/index.js';

export const adminPageConfig = createPageConfig({
  template: adminTemplate,
  styles: ['styles/common.css', 'styles/layout.css', 'styles/components.css', 'styles/pages.css'],
  scripts: ['scripts/js/utils/constants.js', 'scripts/js/utils/helpers.js', 'scripts/js/utils/auth.js', 'scripts/js/api/apiClient.js', 'scripts/js/pages/admin.js', 'scripts/js/pages/businessInfo.js', 'scripts/js/components/footerNav.js']
});
