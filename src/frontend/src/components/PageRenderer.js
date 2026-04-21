/**
 * 파일 역할: PageRenderer UI 조합 및 페이지 렌더링을 담당하는 프론트엔드 컴포넌트 파일.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue';
import { pageRegistry } from '../pageRegistry.js';
import { GLOBAL_HEADER_TEMPLATE } from './GLOBAL_HEADER_TEMPLATE.js';
import { BRAND_ASSETS, createBrandLogoMarkup } from '../brandAssets.js';

const LINK_MAP = {
  'index.html': '/',
  'login.html': '/login',
  'register.html': '/register',
  'create-post.html': '/create',
  'post-detail.html': '/post-detail',
  'bookmarks.html': '/bookmarks',
  'community.html': '/community',
  'my-page.html': '/my-page',
  'admin.html': '/admin',
  'find-account.html': '/find-account',
  'business-info.html': '/business-info',
  'live.html': '/live'
};

const GLOBAL_STYLES = [
  'styles/common.css',
  'styles/layout.css',
  'styles/components.css'
];

const GLOBAL_SCRIPTS = [
  'scripts/js/utils/constants.js',
  'scripts/js/utils/helpers.js',
  'scripts/js/utils/auth.js',
  'scripts/js/api/apiClient.js',
  'scripts/js/api/authAPI.js',
  'scripts/js/components/header.js'
];

const PAGES_WITHOUT_GLOBAL_HEADER = new Set(['live']);
const PAGES_WITHOUT_BOTTOM_NAV = new Set(['live']);

const persistentStyleNodes = new Map();
const persistentScriptNodes = new Map();
const persistentScriptPromises = new Map();

function mapHtmlPath(rawPath) {
  const normalizedPath = rawPath.replace(/^\.\//, '');
  const [file, suffix = ''] = normalizedPath.split(/(?=[?#])/);
  const mapped = LINK_MAP[file.toLowerCase()] || `/${file.replace(/\.html$/i, '')}`;
  return `${mapped}${suffix}`;
}

function normalizeTemplateLinks(template) {
  return template.replace(/href=(['"])([^'"]+\.html(?:[?#][^'"]*)?)\1/gi, (_, quote, fileWithSuffix) => {
    return `href=${quote}${mapHtmlPath(fileWithSuffix)}${quote}`;
  });
}

function stripLegacyHeader(template) {
  return template.replace(/^\s*<header class="header">[\s\S]*?<\/header>\s*/i, '');
}

function stripTemplateScripts(template) {
  return template.replace(/<script\b[^>]*>[\s\S]*?<\/script>\s*/gi, '');
}

function toPublicAssetPath(assetPath) {
  if (!assetPath) return assetPath;
  if (assetPath.startsWith('http') || assetPath.startsWith('/')) return assetPath;
  return `/src/${assetPath.replace(/^\.\//, '')}`;
}

function syncBrandAssets(root = document) {
  const faviconLink = document.head.querySelector('link[rel="icon"]') || document.createElement('link');
  faviconLink.rel = 'icon';
  faviconLink.type = 'image/png';
  faviconLink.href = BRAND_ASSETS.faviconPath;

  if (!faviconLink.parentNode) {
    document.head.appendChild(faviconLink);
  }

  root.querySelectorAll('.logo').forEach((logoNode) => {
    const href = logoNode.getAttribute('href') || '/';
    logoNode.outerHTML = createBrandLogoMarkup({ homePath: href });
  });
}

function ensureStyle(href, { persistent = false } = {}) {
  const publicHref = toPublicAssetPath(href);
  const registry = persistent ? persistentStyleNodes : null;

  if (registry?.has(publicHref)) {
    return registry.get(publicHref);
  }

  const existingNode = document.head.querySelector(`link[rel="stylesheet"][href="${publicHref}"]`);
  if (existingNode) {
    if (registry) registry.set(publicHref, existingNode);
    return existingNode;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = publicHref;
  link.dataset.assetType = persistent ? 'persistent-style' : 'page-style';
  document.head.appendChild(link);

  if (registry) registry.set(publicHref, link);
  return link;
}

function ensureScript(src, { persistent = false } = {}) {
  const publicSrc = toPublicAssetPath(src);

  if (persistent) {
    if (persistentScriptPromises.has(publicSrc)) {
      return persistentScriptPromises.get(publicSrc);
    }

    const existingNode = document.body.querySelector(`script[src="${publicSrc}"]`);
    if (existingNode?.dataset.loaded === 'true') {
      persistentScriptNodes.set(publicSrc, existingNode);
      const promise = Promise.resolve(existingNode);
      persistentScriptPromises.set(publicSrc, promise);
      return promise;
    }

    const script = existingNode || document.createElement('script');
    script.src = publicSrc;
    script.defer = true;
    script.dataset.assetType = 'persistent-script';

    const promise = new Promise((resolve) => {
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        resolve(script);
      }, { once: true });
      script.addEventListener('error', () => resolve(script), { once: true });
    });

    if (!existingNode) {
      document.body.appendChild(script);
    }

    persistentScriptNodes.set(publicSrc, script);
    persistentScriptPromises.set(publicSrc, promise);
    return promise;
  }

  const script = document.createElement('script');
  script.src = publicSrc;
  script.defer = true;
  script.dataset.assetType = 'page-script';

  const promise = new Promise((resolve) => {
    script.addEventListener('load', () => resolve(script), { once: true });
    script.addEventListener('error', () => resolve(script), { once: true });
  });

  document.body.appendChild(script);
  return promise.then(() => script);
}

export default {
  props: {
    page: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const injectedNodes = [];

    const pageConfig = computed(() => pageRegistry[props.page] || { template: '<div>페이지를 찾을 수 없습니다.</div>', styles: [], scripts: [] });
    const pageBodyContent = computed(() => normalizeTemplateLinks(stripTemplateScripts(stripLegacyHeader(pageConfig.value.template || ''))));
    const pageShellClass = computed(() => `page-shell page-shell--${props.page || 'unknown'}`);
    const shouldRenderGlobalHeader = computed(() => !PAGES_WITHOUT_GLOBAL_HEADER.has(props.page));

    const applyPageMarker = () => {
      document.body.dataset.page = props.page || '';
    };

    const clearInjectedNodes = () => {
      injectedNodes.forEach((node) => node.remove());
      injectedNodes.length = 0;
    };

    const syncBottomNavVisibility = () => {
      if (!PAGES_WITHOUT_BOTTOM_NAV.has(props.page)) {
        return;
      }

      const existingFooter = document.querySelector('.bottom-nav-footer');
      if (existingFooter) {
        existingFooter.remove();
      }

      document.body.classList.remove('has-bottom-nav');
    };

    const injectStyles = () => {
      GLOBAL_STYLES.forEach((href) => {
        ensureStyle(href, { persistent: true });
      });

      (pageConfig.value.styles || [])
        .filter((href) => !GLOBAL_STYLES.includes(href))
        .forEach((href) => {
          const link = ensureStyle(href);
          link.dataset.page = props.page;
          injectedNodes.push(link);
        });
    };

    const injectScripts = async () => {
      for (const src of GLOBAL_SCRIPTS) {
        await ensureScript(src, { persistent: true });
      }

      const pageScripts = (pageConfig.value.scripts || []).filter(
        (src) => !GLOBAL_SCRIPTS.includes(src)
      );

      for (const src of pageScripts) {
        const script = await ensureScript(src);
        script.dataset.page = props.page;
        injectedNodes.push(script);
      }
    };

    const runPersistentInitializers = () => {
      if (typeof window.initHeader === 'function') {
        window.initHeader();
      }
    };

    const loadPageAssets = async () => {
      clearInjectedNodes();
      applyPageMarker();
      syncBottomNavVisibility();
      await nextTick();
      injectStyles();
      await injectScripts();
      syncBrandAssets();
      runPersistentInitializers();
    };

    onMounted(async () => {
      await loadPageAssets();
    });

    watch(
      () => props.page,
      async () => {
        await loadPageAssets();
      },
      { flush: 'post' }
    );

    onBeforeUnmount(() => {
      clearInjectedNodes();
      delete document.body.dataset.page;
    });

    return {
      pageBodyContent,
      globalHeaderTemplate: GLOBAL_HEADER_TEMPLATE,
      pageShellClass,
      shouldRenderGlobalHeader
    };
  },
  template: `<div :class="pageShellClass"><div v-if="shouldRenderGlobalHeader" v-html="globalHeaderTemplate"></div><div v-html="pageBodyContent"></div></div>`
};
