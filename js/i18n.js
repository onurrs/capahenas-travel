// Dinamik dil menüsü ve metin seçimi
function renderLangMenu() {
  const menu = document.getElementById('lang-menu');
  if (!menu) {
    return;
  }
  menu.innerHTML = '';
  supportedLangs.forEach(l => {
    const langItem = document.createElement('div');
    langItem.className = 'lang-item px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors duration-200 rounded';
    langItem.dataset.lang = l.code;
    langItem.textContent = l.name;
    
    if (l.code === currentLang) {
      langItem.classList.add('bg-accent1', 'bg-opacity-10', 'text-accent1', 'font-semibold');
    } else {
      langItem.classList.add('text-gray-700');
    }
    
    menu.appendChild(langItem);
  });
  
  // Update current language display
  updateCurrentLangText();
}

function updateCurrentLangText() {
  const currentLangText = document.getElementById('current-lang-text');
  if (currentLangText) {
    const lang = supportedLangs.find(l => l.code === currentLang);
    if (lang) {
      currentLangText.textContent = lang.name;
    }
  }
}

function toggleLangMenu() {
  const menu = document.getElementById('lang-menu');
  if (!menu) {
    return;
  }
  menu.classList.toggle('hidden');
  menu.style.background = '#fff';
  menu.style.border = '1px solid #DCA47C';
  menu.style.padding = '4px';
  menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
}

document.addEventListener('click', function(e) {
  // Menü açma/kapatma
  if (e.target && e.target.id === 'lang-switch') {
    toggleLangMenu();
  }
  // Menü dışına tıklanınca kapat
  if (!e.target.closest('#lang-menu') && !e.target.closest('#lang-switch')) {
    const menu = document.getElementById('lang-menu');
    if (menu) menu.classList.add('hidden');
  }
  // Dil seçimi (metin item'lara tıklandığında)
  if (e.target && e.target.classList.contains('lang-item')) {
    setLang(e.target.dataset.lang);
    const menu = document.getElementById('lang-menu');
    if (menu) menu.classList.add('hidden');
  }
});

window.addEventListener('DOMContentLoaded', () => {
  renderLangMenu();
  var langSwitchBtn = document.getElementById('lang-switch');
  if (langSwitchBtn) {
    langSwitchBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleLangMenu();
    });
  }
});
// Simple i18n implementation for static HTML
const supportedLangs = [
  { code: 'en', name: 'English', flag: 'gb' },
  { code: 'tr', name: 'Türkçe', flag: 'tr' },
  { code: 'de', name: 'Deutsch', flag: 'de' },
  { code: 'es', name: 'Español', flag: 'es' },
  { code: 'fr', name: 'Français', flag: 'fr' },
  { code: 'ru', name: 'Русский', flag: 'ru' },
  { code: 'jp', name: '日本語', flag: 'jp' },
  { code: 'kr', name: '한국어', flag: 'kr' },
  { code: 'cn', name: '简体中文', flag: 'cn' }  
];
const langCodes = supportedLangs.map(l => l.code);
const defaultLang = 'en';
let currentLang = localStorage.getItem('lang') || defaultLang;
let translationRequestId = 0;

function setLang(lang) {
  if (!langCodes.includes(lang)) lang = defaultLang;
  currentLang = lang;
  localStorage.setItem('lang', lang);
  loadTranslations(lang);
  renderLangMenu();
  
  // Reload booking translations and calendar if available
  if (typeof loadBookingTranslations === 'function') {
    loadBookingTranslations();
  }
}

function deepMerge(target, source) {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target))
          Object.assign(output, { [key]: source[key] });
        else
          output[key] = deepMerge(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function renderInternationalDescription(element, value) {
  const lines = String(value || '').split(/\r?\n/);
  if (lines.length === 1) {
    element.textContent = lines[0];
    return;
  }

  element.replaceChildren();
  const introduction = document.createElement('span');
  introduction.textContent = lines.shift();
  element.appendChild(introduction);

  lines.forEach(line => {
    const route = document.createElement('span');
    route.className = 'international-tour-route';
    route.textContent = line;
    element.appendChild(route);
  });
}

function loadTranslations(lang) {
  const requestId = ++translationRequestId;
  const translationFiles = [
    'common.json',
    'index.json',
    'balloon-tours.json',
    'cappadocia-tours.json',
    'destinations.json',
    'turkiye-tours.json',
    'international-tours.json'
  ];
  const base = (window.I18N_BASE_PATH || 'locales/') + `${lang}/`;
  Promise.all(
    translationFiles.map(file => fetch(`${base}${file}?lang=${lang}&v=${requestId}`, { cache: 'no-store' })
      .then(res => res.json()).catch(() => ({})))
  ).then(jsons => {
    if (requestId !== translationRequestId) return;

    // Deep merge all translation objects (later files don't override nested objects)
    const merged = jsons.reduce((acc, json) => deepMerge(acc, json), {});
    applyTranslations(merged);
    document.body?.classList.remove('i18n-pending');
  });
}

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => {
    if (acc === undefined || acc === null) return undefined;
    return acc[key];
  }, obj);
}

function applyTranslations(translations) {
  window.__latestTranslations = translations;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const i18nAttr = el.getAttribute('data-i18n');
    const value = getNestedValue(translations, i18nAttr);
    if (value !== undefined && value !== null) {
      if (i18nAttr.startsWith('international.') && i18nAttr.endsWith('.desc')) {
        renderInternationalDescription(el, value);
      } else {
        el.textContent = value;
      }
    } else {
      console.warn('Translation not found for:', i18nAttr);
    }
  });

  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    const mapping = el.getAttribute('data-i18n-attr');
    if (!mapping || !mapping.includes(':')) return;
    const [attrName, keyPath] = mapping.split(':');
    const value = getNestedValue(translations, keyPath.trim());
    if (value) {
      el.setAttribute(attrName.trim(), value);
    }
  });

  applyJapanTourContent();
}

const jpnPageKeyMap = {
  'japan-express': 'japan-express',
  '7-day-8-night-japan': '7-day-8-night-japan',
  '6-day-7-night-japan': '6-day-7-night-japan',
  'japan-big-tokyo': 'japan-big-tokyo',
  'japan-big-osaka': 'japan-big-osaka',
  japan: '7-day-8-night-japan',
  japanExpress: 'japan-express',
  japanDiscovery: '6-day-7-night-japan',
  japanBigTokyo: 'japan-big-tokyo',
  japanBigOsaka: 'japan-big-osaka'
};

const japanLegacyPageKeyMap = {
  'japan-big-tokyo': '8-day-9-night-japan',
  'japan-big-osaka': '9-day-10-night-japan'
};

function bindJapanAccordion(items) {
  items.forEach(item => {
    item.addEventListener('toggle', function() {
      if (this.open) {
        items.forEach(otherItem => {
          if (otherItem !== this && otherItem.open) {
            otherItem.open = false;
          }
        });
      }
    });
  });
}

function renderJapanItinerary(itinerary) {
  const container = document.getElementById('itineraryContainer');
  if (!container) {
    itinerary.forEach((item, index) => {
      const dayNumber = index + 1;
      const dayKey = `turkeyTours.package8days.itinerary.day${dayNumber}`;
      document.querySelectorAll(`[data-i18n="${dayKey}.title"]`).forEach(el => {
        el.textContent = item.title || '';
      });
      document.querySelectorAll(`[data-i18n="${dayKey}.content"]`).forEach(el => {
        el.textContent = item.content || '';
      });
    });
    return;
  }

  container.innerHTML = '';
  itinerary.forEach(item => {
    const details = document.createElement('details');
    details.className = 'group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all';
    details.innerHTML = `
      <summary class="cursor-pointer p-6 font-semibold text-lg flex items-center justify-between bg-gradient-to-r from-accent1/5 to-transparent hover:from-accent1/10 transition-all">
        <span>${item.title || ''}</span>
        <svg class="w-5 h-5 transform group-open:rotate-180 transition-transform text-accent1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </summary>
      <div class="px-6 pb-6 text-gray-700 leading-relaxed">
        <p class="mb-3">${item.content || ''}</p>
      </div>
    `;
    container.appendChild(details);
  });

  bindJapanAccordion(container.querySelectorAll('details'));
}

function renderJapanListContainer(containerId, items, type) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  const isInclude = type === 'include';
  container.innerHTML = '';
  items.forEach(text => {
    const div = document.createElement('div');
    div.className = isInclude
      ? 'flex items-center gap-3 p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100'
      : 'flex items-center gap-3 p-4 bg-gradient-to-br from-red-50 to-white rounded-xl border border-red-100';
    div.innerHTML = `
      <div class="w-8 h-8 ${isInclude ? 'bg-accent1' : 'bg-red-500'} rounded-full flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          ${isInclude
            ? '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>'
            : '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>'}
        </svg>
      </div>
      <span class="font-medium text-gray-900">${text || ''}</span>
    `;
    container.appendChild(div);
  });
}

function applyJapanTourContent() {
  const page = document.body?.dataset?.tourPage;
  const normalizedPage = jpnPageKeyMap[page] || page;
  if (!normalizedPage) return;

  const translations = window.__latestTranslations || {};
  const localeEntry = translations?.international?.[normalizedPage]
    || translations?.international?.[japanLegacyPageKeyMap[normalizedPage]];
  if (!localeEntry) return;

  const localeData = localeEntry;

  if (localeData.metaTitle) {
    document.title = localeData.metaTitle;
  }

  if (localeData.metaDescription) {
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', localeData.metaDescription);
    }
  }

  document.querySelectorAll(`[data-i18n="international.${normalizedPage}.title"]`).forEach(el => {
    el.textContent = localeData.title || '';
  });
  document.querySelectorAll(`[data-i18n="international.${normalizedPage}.desc"]`).forEach(el => {
    renderInternationalDescription(el, localeData.desc);
  });

  const badge = document.querySelector('[data-i18n="turkeyTours.package8days.badge"]');
  if (badge && localeData.badge) {
    badge.textContent = localeData.badge;
  }

  const aboutTitle = document.querySelector('[data-i18n="turkeyTours.package8days.about.title"]');
  if (aboutTitle && localeData.aboutTitle) {
    aboutTitle.textContent = localeData.aboutTitle;
  }
  const aboutSubtitle = document.querySelector('[data-i18n="turkeyTours.package8days.about.subtitle"]');
  if (aboutSubtitle && localeData.aboutSubtitle) {
    aboutSubtitle.textContent = localeData.aboutSubtitle;
  }
  const aboutDuration = document.querySelector('[data-i18n="turkeyTours.package8days.about.duration"]');
  if (aboutDuration && localeData.aboutDuration) {
    aboutDuration.textContent = localeData.aboutDuration;
  }
  const aboutDestinations = document.querySelector('[data-i18n="turkeyTours.package8days.about.destinations"]');
  if (aboutDestinations && localeData.aboutDestinations) {
    aboutDestinations.textContent = localeData.aboutDestinations;
  }

  const cancellationPolicyTitle = document.querySelector(`[data-i18n="international.${normalizedPage}.cancellationPolicyTitle"]`);
  if (cancellationPolicyTitle && localeData.cancellationPolicyTitle) {
    cancellationPolicyTitle.textContent = localeData.cancellationPolicyTitle;
  }

  const visaInfoTitle = document.querySelector(`[data-i18n="international.${normalizedPage}.visaInfoTitle"]`);
  if (visaInfoTitle && localeData.visaInfoTitle) {
    visaInfoTitle.textContent = localeData.visaInfoTitle;
  }

  const galleryTitle = document.querySelector('[data-i18n="turkeyTours.package8days.gallery.title"]');
  if (galleryTitle && localeData.galleryTitle) {
    galleryTitle.textContent = localeData.galleryTitle;
  }
  const gallerySubtitle = document.querySelector('[data-i18n="turkeyTours.package8days.gallery.subtitle"]');
  if (gallerySubtitle && localeData.gallerySubtitle) {
    gallerySubtitle.textContent = localeData.gallerySubtitle;
  }

  const introText = document.querySelector('[data-i18n="turkeyTours.package8days.about.intro"]');
  if (introText && localeData.introText) {
    introText.innerHTML = localeData.introText;
  }

  const highlightItems = localeData.highlights || [];
  highlightItems.forEach((text, index) => {
    document.querySelectorAll(`[data-i18n="turkeyTours.package8days.about.highlight${index + 1}"]`).forEach(el => {
      el.textContent = text || '';
    });
  });

  const itinerary = localeData.itinerary || localeData.days || [];
  renderJapanItinerary(itinerary);

  const galleryImages = document.querySelectorAll('.tourGallerySwiper .swiper-slide img');
  const gallery = localeData.gallery || [];
  gallery.forEach((src, index) => {
    if (galleryImages[index]) {
      galleryImages[index].src = src;
      galleryImages[index].alt = localeData.title || '';
    }
  });

  const heroImage = document.querySelector('section.relative img') || document.querySelector('img');
  if (heroImage && localeData.hero) {
    heroImage.src = localeData.hero;
    heroImage.alt = localeData.title || '';
  }

  const inclusions = localeData.inclusions || [];
  const exclusions = localeData.exclusions || [];
  renderJapanListContainer('inclusionsContainer', inclusions, 'include');
  renderJapanListContainer('exclusionsContainer', exclusions, 'exclude');

  // Handle cancellation policy
  const cancellationPolicy = localeData.cancellationPolicy || [];
  const cancellationContainer = document.getElementById('cancellationPolicyContainer');
  if (cancellationContainer) {
    cancellationContainer.innerHTML = '';
    cancellationPolicy.forEach(item => {
      const div = document.createElement('div');
      div.className = 'p-4 bg-orange-50 rounded-lg border border-orange-100';
      div.innerHTML = `
        <h4 class="font-semibold text-gray-900 mb-2">${item.title || ''}</h4>
        <p class="text-gray-700 text-sm">${item.content || ''}</p>
      `;
      cancellationContainer.appendChild(div);
    });
  }

  // Handle visa information
  const visaInfo = localeData.visaInfo || [];
  const visaContainer = document.getElementById('visaInfoContainer');
  if (visaContainer) {
    visaContainer.innerHTML = '';
    visaInfo.forEach(item => {
      const div = document.createElement('div');
      div.className = 'p-4 bg-green-50 rounded-lg border border-green-100';
      div.innerHTML = `
        <h4 class="font-semibold text-gray-900 mb-2">${item.title || ''}</h4>
        <p class="text-gray-700 text-sm">${item.content || ''}</p>
      `;
      visaContainer.appendChild(div);
    });
  }

  // Handle cancellation policy and visa info by storing in window for custom rendering if needed
  window.__japanTourData = {
    inclusions: inclusions,
    exclusions: exclusions,
    cancellationPolicy: cancellationPolicy,
    visaInfo: visaInfo
  };
}

// On page load
window.addEventListener('DOMContentLoaded', () => {
  setLang(currentLang);
});

// Expose for language switch
window.setLang = setLang;
