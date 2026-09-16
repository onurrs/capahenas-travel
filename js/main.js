// Main initialization for Capahenas Travel
(function () {
  function initializeApp() {
    const mainNav = document.getElementById('main-nav')
    mainNav?.classList.add('whitespace-nowrap', 'gap-5')
    if (mainNav && !mainNav.querySelector('[data-international-nav]')) {
      const navItem = document.createElement('li')
      const homePath = window.location.pathname.endsWith('/index.html') || window.location.pathname.endsWith('/public_html/')
        ? 'index.html'
        : '../index.html'
      navItem.dataset.internationalNav = 'true'
      navItem.innerHTML = `<a href="${homePath}#international-tours" class="relative text-text hover:text-accent1 transition-colors duration-300 py-2 group" data-i18n="header.internationalTours">International Tours<span class="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-accent1 to-accent2 group-hover:w-full transition-all duration-300"></span></a>`
      const galleryLink = Array.from(mainNav.querySelectorAll('a')).find(link => link.getAttribute('href')?.endsWith('#gallery'))
      galleryLink?.closest('li')?.before(navItem)
    }

    // Mobile menu toggle
    const menuBtn = document.getElementById('mobile-menu-btn')
    if (menuBtn && mainNav) {
      menuBtn.addEventListener('click', () => {
        // On small screens, toggle visibility
        if (window.matchMedia('(max-width: 767px)').matches) {
          mainNav.classList.toggle('hidden')
          // Basic slide-in feel using Tailwind utilities if available
          mainNav.classList.toggle('flex')
          mainNav.classList.toggle('flex-col')
          mainNav.classList.toggle('absolute')
          mainNav.classList.toggle('top-16')
          mainNav.classList.toggle('left-0')
          mainNav.classList.toggle('right-0')
          mainNav.classList.toggle('bg-white')
          mainNav.classList.toggle('p-4')
          mainNav.classList.toggle('shadow-card')
          mainNav.classList.toggle('gap-4')
        }
      })
    }
    const $ = (sel) => document.querySelector(sel)
    const $$ = (sel) => document.querySelectorAll(sel)

    // Year
    const y = $('#y'); if (y) y.textContent = new Date().getFullYear()


    // GLightbox
    if (window.GLightbox) {
      const lb = GLightbox({ selector: '.glightbox', touchNavigation: true, loop: true, openEffect: 'none', closeEffect: 'none', slideEffect: 'none' })
      lb.on('open', () => { const g = document.getElementById('gallery'); if (g) g.removeAttribute('aria-hidden') })
    }

    // Instagram-like card navigation: click outside images -> open profile
    const instaCard = document.getElementById('insta-card')
    if (instaCard) {
      instaCard.addEventListener('click', (e) => {
        // If clicked element or its parents have data-no-nav or is inside a .glightbox link, do nothing
        const target = e.target
        const isControl = target.closest('[data-no-nav]')
        const isLightboxLink = target.closest('a.glightbox')
        if (isControl || isLightboxLink) return
        const url = instaCard.getAttribute('data-url') || 'https://www.instagram.com/'
        window.open(url, '_blank', 'noopener')
      })
    }

    // Image fallback
    const placeholder = 'data:image/svg+xml;utf8,\
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">\
        <rect width="100%" height="100%" fill="%23E8F9FF"/>\
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236B7280" font-family="Inter, Arial" font-size="18">Görsel yüklenemedi</text>\
      </svg>'
    $$('.w-full img, img').forEach(img => {
      img.addEventListener('error', () => {
        if (!img.dataset.fallback) {
          img.dataset.fallback = '1'
          img.src = placeholder
          img.classList.add('object-contain', 'bg-sky1/50')
        }
      }, { once: true })
    })

    // Mailto helpers
    const buildMailto = (subject, body) => `mailto:info@capahenas.travel?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    const quickBtn = document.getElementById('quick-mail')
    if (quickBtn) {
      quickBtn.addEventListener('click', () => {
        const date = (document.querySelector('input[type="date"]') || {}).value || '-'
        const pax = (document.querySelector('input[type="number"]') || {}).value || '-'
        const subject = window.CapahenasI18N.i18nText('mail.quick.subject')
        const body = window.CapahenasI18N.i18nText('mail.quick.body').replace('{date}', date).replace('{pax}', pax)
        window.location.href = buildMailto(subject, body)
      })
    }
    const ctaBtn = document.getElementById('contact-mail')
    if (ctaBtn) {
      ctaBtn.addEventListener('click', () => {
        const name = (document.getElementById('f-name') || {}).value || ''
        const email = (document.getElementById('f-email') || {}).value || ''
        const msg = (document.getElementById('f-message') || {}).value || ''
        const subject = window.CapahenasI18N.i18nText('mail.form.subject')
        const body = window.CapahenasI18N.i18nText('mail.form.body').replace('{name}', name).replace('{email}', email).replace('{msg}', msg)
        window.location.href = buildMailto(subject, body)
      })
    }



    // Scroll reveal animations
    const animated = document.querySelectorAll('[data-anim]')
    if (animated.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
            entry.target.classList.remove('animate-init')
            // Stagger children if any
            const kids = entry.target.querySelectorAll('[data-anim-child]')
            kids.forEach((el, idx) => {
              el.style.setProperty('--d', `${120 + idx * 60}ms`)
              el.classList.add('animate-in')
              el.classList.remove('animate-init')
            })
            io.unobserve(entry.target)
          }
        })
      }, { threshold: 0.12 })
      animated.forEach(el => io.observe(el))
    }
  }

  // Initialize reviews swiper
  function initReviewsSwiper() {
    // Wait for data to load
    if (typeof data_reviews === 'undefined') {
      setTimeout(initReviewsSwiper, 100);
      return;
    }

    const reviewsWrapper = document.getElementById('reviews-wrapper');
    if (!reviewsWrapper) return;

    // Generate review cards
    reviewsWrapper.innerHTML = '';
    
    data_reviews.forEach((review, index) => {
      const reviewCard = document.createElement('div');
      reviewCard.className = 'swiper-slide';
      
      // Format date
      const formatDate = (date) => {
        const now = new Date();
        const reviewDate = new Date(date);
        const diffTime = Math.abs(now - reviewDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'today';
        if (diffDays === 1) return 'a day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        
        const diffWeeks = Math.floor(diffDays / 7);
        if (diffWeeks === 1) return 'a week ago';
        if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
        
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths === 1) return 'a month ago';
        if (diffMonths < 12) return `${diffMonths} months ago`;
        
        const diffYears = Math.floor(diffDays / 365);
        if (diffYears === 1) return 'a year ago';
        return `${diffYears} years ago`;
      };

      // Generate stars
      const generateStars = (rating) => {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
          if (i <= rating) {
            stars += '<svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>';
          } else {
            stars += '<svg class="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>';
          }
        }
        return stars;
      };

      reviewCard.innerHTML = `
        <div class="bg-white rounded-soft shadow-card p-6 mx-2 h-full flex flex-col">
          <!-- Header -->
          <div class="flex items-center gap-4 mb-4">
            <img src="${review.profile_photo}" alt="${review.author_name}" 
                 class="w-12 h-12 rounded-full object-cover ring-2 ring-accent1/20" 
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiNGM0Y0RjYiLz4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyMCIgcj0iOCIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNOCAzNy43QzEwLjIgMzQuMSAxNi4yIDMyIDI0IDMyUzM3LjggMzQuMSA0MCAzNy43IiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo='"/>
            <div class="flex-1">
              <h4 class="font-semibold text-gray-900">${review.author_name}</h4>
              <div class="flex items-center gap-2 mt-1">
                <div class="flex">${generateStars(review.rating)}</div>
                <span class="text-sm text-gray-500">${formatDate(review.date)}</span>
              </div>
            </div>
          </div>
          
          <!-- Review Text -->
          <div class="flex-1 min-h-0">
            <div class="review-text-container h-32 overflow-y-auto pr-2">
              <p class="text-gray-700 text-sm leading-relaxed">
                ${review.text}
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="mt-4 pt-4 border-t border-gray-100">
            <div class="flex items-center justify-between text-xs text-gray-500">
              <a href="https://www.google.com/maps/place/?q=place_id:ChIJow0JH_1nKhURtw1i-Y_6eik&lrd=ChIJow0JH_1nKhURtw1i-Y_6eik,1" target="_blank" rel="noopener noreferrer" 
                class="hover:text-accent1 transition-colors duration-300 relative group">
                <span class="relative">
                  Google Reviews
                  <span class="absolute bottom-0 left-0 w-0 h-0.5 bg-accent1 transition-all duration-300 group-hover:w-full"></span>
                </span>
              </a>
              <span class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                Verified
              </span>
            </div>
          </div>
        </div>
      `;
      
      reviewsWrapper.appendChild(reviewCard);
    });

    // Initialize Swiper
    const swiper = new Swiper('.reviews-swiper', {
      slidesPerView: 1,
      spaceBetween: 20,
      autoplay: false,
      loop: false,
      grabCursor: true,
      keyboard: {
        enabled: true,
      },
      navigation: {
        nextEl: '.reviews-next-external',
        prevEl: '.reviews-prev-external',
      },
      pagination: {
        el: '.reviews-pagination',
        clickable: true,
        dynamicBullets: true,
      },
      breakpoints: {
        640: {
          slidesPerView: 2,
          spaceBetween: 20,
        },
        1024: {
          slidesPerView: 3,
          spaceBetween: 30,
        },
      },
    });

    // Hide swipe hint after first interaction
    const swipeHint = document.getElementById('swipe-hint');
    if (swipeHint) {
      swiper.on('slideChange', () => {
        swipeHint.style.opacity = '0';
        setTimeout(() => swipeHint.style.display = 'none', 300);
      });
    }

    // Handle external navigation button states
    const prevBtn = document.querySelector('.reviews-prev-external');
    const nextBtn = document.querySelector('.reviews-next-external');
    
    const updateButtonStates = () => {
      if (prevBtn) {
        prevBtn.disabled = swiper.isBeginning;
      }
      if (nextBtn) {
        nextBtn.disabled = swiper.isEnd;
      }
    };

    // Initial state
    updateButtonStates();

    // Update on slide change
    swiper.on('slideChange', updateButtonStates);
    swiper.on('reachBeginning', updateButtonStates);
    swiper.on('reachEnd', updateButtonStates);
  }

  // Initialize on DOM load and make available globally
  document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    initReviewsSwiper();
    initBalloonToursSwiper();
    initShowMoreButtons();
  });
  window.initializeApp = initializeApp;

  // Show More/Less functionality for mobile
  function initShowMoreButtons() {
    // Check if mobile
    const isMobile = () => window.innerWidth < 768;
    
    // Cappadocia Tours Show More/Less
    const cappadociaGrid = document.getElementById('cappadocia-tours-grid');
    const cappadociaBtn = document.getElementById('cappadocia-show-more');
    const cappadociaBtnText = document.getElementById('cappadocia-btn-text');
    const cappadociaChevron = document.getElementById('cappadocia-chevron');
    
    if (cappadociaGrid && cappadociaBtn) {
      let cappadociaExpanded = false;
      const cappadociaCards = Array.from(cappadociaGrid.children);
      
      const updateCappadociaVisibility = () => {
        if (isMobile()) {
          // Hide cards after 4th on mobile
          cappadociaCards.forEach((card, index) => {
            if (index >= 4) {
              card.style.display = cappadociaExpanded ? 'flex' : 'none';
            }
          });
        } else {
          // Show all cards on desktop
          cappadociaCards.forEach((card) => {
            card.style.display = 'flex';
          });
        }
      };
      
      // Initialize
      updateCappadociaVisibility();
      
      cappadociaBtn.addEventListener('click', () => {
        cappadociaExpanded = !cappadociaExpanded;
        updateCappadociaVisibility();
        
        cappadociaBtnText.textContent = cappadociaExpanded ? 'Show Less' : 'Show More';
        cappadociaChevron.style.transform = cappadociaExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
        
        // Smooth scroll to button if collapsing
        if (!cappadociaExpanded) {
          cappadociaBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
      
      // Update on resize
      window.addEventListener('resize', updateCappadociaVisibility);
    }
    
    // Turkey Tours Show More/Less
    const turkeyGrid = document.getElementById('turkey-tours-grid');
    const turkeyBtn = document.getElementById('turkey-show-more');
    const turkeyBtnText = document.getElementById('turkey-btn-text');
    const turkeyChevron = document.getElementById('turkey-chevron');
    
    if (turkeyGrid && turkeyBtn) {
      let turkeyExpanded = false;
      const turkeyCards = Array.from(turkeyGrid.children);
      
      const updateTurkeyVisibility = () => {
        if (isMobile()) {
          // Hide cards after 2nd on mobile
          turkeyCards.forEach((card, index) => {
            if (index >= 2) {
              card.style.display = turkeyExpanded ? 'block' : 'none';
            }
          });
        } else {
          // Show all cards on desktop
          turkeyCards.forEach((card) => {
            card.style.display = 'block';
          });
        }
      };
      
      // Initialize
      updateTurkeyVisibility();
      
      turkeyBtn.addEventListener('click', () => {
        turkeyExpanded = !turkeyExpanded;
        updateTurkeyVisibility();
        
        turkeyBtnText.textContent = turkeyExpanded ? 'Show Less' : 'Show More';
        turkeyChevron.style.transform = turkeyExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
        
        if (!turkeyExpanded) {
          turkeyBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
      
      // Update on resize
      window.addEventListener('resize', updateTurkeyVisibility);
    }
    
    // Destinations Show More/Less
    const destinationsGrid = document.getElementById('destinations-grid');
    const destinationsBtn = document.getElementById('destinations-show-more');
    const destinationsBtnText = document.getElementById('destinations-btn-text');
    const destinationsChevron = document.getElementById('destinations-chevron');
    
    if (destinationsGrid && destinationsBtn) {
      let destinationsExpanded = false;
      const destinationsCards = Array.from(destinationsGrid.children);
      
      const updateDestinationsVisibility = () => {
        if (isMobile()) {
          // Hide cards after 4th on mobile
          destinationsCards.forEach((card, index) => {
            if (index >= 4) {
              card.style.display = destinationsExpanded ? 'block' : 'none';
            }
          });
        } else {
          // Show all cards on desktop
          destinationsCards.forEach((card) => {
            card.style.display = 'block';
          });
        }
      };
      
      // Initialize
      updateDestinationsVisibility();
      
      destinationsBtn.addEventListener('click', () => {
        destinationsExpanded = !destinationsExpanded;
        updateDestinationsVisibility();
        
        destinationsBtnText.textContent = destinationsExpanded ? 'Show Less' : 'Show More';
        destinationsChevron.style.transform = destinationsExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
        
        if (!destinationsExpanded) {
          destinationsBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
      
      // Update on resize
      window.addEventListener('resize', updateDestinationsVisibility);
    }
  }

  // Balloon Tours Swiper for Mobile
  function initBalloonToursSwiper() {
    if (window.Swiper && document.querySelector('.balloonToursSwiper')) {
      new Swiper('.balloonToursSwiper', {
        slidesPerView: 1.15,
        spaceBetween: 16,
        centeredSlides: true,
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        breakpoints: {
          768: {
            enabled: false
          }
        }
      });
    }
  }
})()




