/**
 * 파일 역할: PageView 화면의 구조/렌더링 규칙을 정의하는 뷰 파일.
 */
import PageRenderer from '../components/PageRenderer.js';

export default {
  components: { PageRenderer },
  computed: {
    pageKey() {
      return this.$route.meta.pageKey;
    }
  },
  template: `<PageRenderer :page="pageKey" />`
};
