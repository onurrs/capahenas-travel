// ========================================
// SUPABASE INTEGRATION
// ========================================

// Supabase Configuration
// ⚠️ BURAYA SUPABASE BİLGİLERİNİZİ YAPIN (admin/index.html'deki ile aynı)
const SUPABASE_URL = 'https://efvxjsdprydyvmotmtem.supabase.co'; // https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdnhqc2RwcnlkeXZtb3RtdGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjQ2NzksImV4cCI6MjA3NzE0MDY3OX0.ZhBFbBZLXhAfFAsteVtULqoV9VB2b4Q1tMW8tRv6Fug'; // eyJhbGci...

emailjs.init("PEClTotPoJ13EalFm"); // Public key buraya

// ========================================
// I18N HELPER FOR BOOKING
// ========================================
let bookingTranslations = {};
let calendarTranslations = {};

// Expose to window for IIFE access
window.bookingTranslations = bookingTranslations;
window.calendarTranslations = calendarTranslations;

// Load translations for booking
async function loadBookingTranslations() {
  const currentLang = localStorage.getItem('lang') || 'en';
  const base = (window.I18N_BASE_PATH || 'locales/') + `${currentLang}/`;
  
  try {
    const response = await fetch(base + 'common.json');
    const data = await response.json();
    bookingTranslations = data.booking || {};
    calendarTranslations = data.calendar || {};
    window.bookingTranslations = bookingTranslations; // Update window reference
    window.calendarTranslations = calendarTranslations; // Update window reference
    
    // Destroy and recreate calendar if it exists
    const calendarContainer = document.getElementById('flight-calendar');
    if (calendarContainer && typeof window.recreateCalendar === 'function') {
      calendarContainer.innerHTML = ''; // Clear existing calendar
      window.recreateCalendar(); // Recreate with new translations
    }
  } catch (err) {
    console.warn('⚠️ Failed to load booking translations:', err);
    // Fallback to English defaults
    bookingTranslations = {
      confirmTitle: 'Confirm Booking Request',
      tourDetails: 'Tour Details',
      tour: 'Tour',
      date: 'Date',
      persons: 'Persons',
      hotel: 'Hotel',
      contactInfo: 'Contact Information',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      sendRequest: 'Send Request',
      cancel: 'Cancel'
    };
    calendarTranslations = {
      months: ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'],
      daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    };
  }
}

// Helper function to get translation
function t(key) {
  return window.bookingTranslations?.[key] || bookingTranslations[key] || key;
}

// Helper function to get calendar translation
function tCal(key, index) {
  if (index !== undefined) {
    return (calendarTranslations[key] && calendarTranslations[key][index]) || key;
  }
  return calendarTranslations[key] || key;
}

// Helper function to get Istanbul time (UTC+3)
function getIstanbulTime() {
  const now = new Date();
  // Convert to Istanbul timezone (UTC+3)
  const istanbulTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
  // Format as YYYY-MM-DD HH:MM:SS GMT+3
  const year = istanbulTime.getFullYear();
  const month = String(istanbulTime.getMonth() + 1).padStart(2, '0');
  const day = String(istanbulTime.getDate()).padStart(2, '0');
  const hours = String(istanbulTime.getHours()).padStart(2, '0');
  const minutes = String(istanbulTime.getMinutes()).padStart(2, '0');
  const seconds = String(istanbulTime.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} GMT+3`;
}

// Initialize translations on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadBookingTranslations);
} else {
  loadBookingTranslations();
}

// Initialize Supabase Client (check if supabase is loaded)
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
  const { createClient } = supabase;
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn('⚠️ Supabase library not loaded. Booking will use mailto only.');
}

/**
 * Save booking to Supabase
 */
async function saveBookingToSupabase(bookingData) {

  if (!supabaseClient) {
    console.warn('⚠️ Supabase client not available, skipping database save');
    return { success: false, error: 'Supabase not initialized' };
  }

  try {

    const insertData = {
      customer_name: bookingData.name,
      customer_email: bookingData.email,
      customer_phone: bookingData.phone,
      country_code: bookingData.countryCode,
      tour_type: bookingData.tourType,
      tour_date: bookingData.date,
      persons: parseInt(bookingData.persons),
      special_requests: bookingData.specialRequests || null,
      status: 'pending'
    };


    const { data, error } = await supabaseClient
      .from('bookings')
      .insert([insertData])
      .select();

    if (error) {
      console.error('❌ Supabase error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] };
  } catch (err) {
    console.error('❌ Exception saving booking:', err);
    console.error('❌ Exception details:', err.stack);
    return { success: false, error: err.message };
  }
}

// ========================================
// ORIGINAL BOOKING CODE
// ========================================

// Balloon booking functionality
(function () {
  let selectedDate = null;
  let adultsCount = 1;
  let childrenCount = 0;
  let currentMonth = null;
  let currentYear = null;

  function initBookingPage() {
    createCalendar();
    initPassengerControls();
    initBookingForm();
    initPhoneNumberHandler();
  }

  function initPhoneNumberHandler() {
    const countrySelect = $('#country-code');
    const phoneInput = document.getElementById('phone');

    // Country code mapping for options without data-country attribute
    const countryMapping = {
      '+1': 'us', // Default to US for +1
      '+86': 'cn', '+91': 'in', '+81': 'jp', '+82': 'kr', '+65': 'sg',
      '+60': 'my', '+62': 'id', '+66': 'th', '+63': 'ph', '+84': 'vn',
      '+92': 'pk', '+880': 'bd', '+94': 'lk', '+95': 'mm', '+855': 'kh', '+856': 'la',
      '+971': 'ae', '+966': 'sa', '+972': 'il', '+98': 'ir', '+964': 'iq',
      '+962': 'jo', '+961': 'lb', '+963': 'sy', '+968': 'om', '+974': 'qa',
      '+965': 'kw', '+973': 'bh', '+20': 'eg', '+27': 'za', '+234': 'ng',
      '+254': 'ke', '+256': 'ug', '+255': 'tz', '+233': 'gh', '+212': 'ma',
      '+213': 'dz', '+216': 'tn', '+218': 'ly', '+251': 'et', '+260': 'zm',
      '+263': 'zw', '+61': 'au', '+64': 'nz', '+679': 'fj', '+55': 'br',
      '+54': 'ar', '+56': 'cl', '+57': 'co', '+51': 'pe', '+58': 've',
      '+593': 'ec', '+598': 'uy', '+595': 'py', '+591': 'bo', '+52': 'mx',
      '+7': 'ru', '+380': 'ua', '+375': 'by', '+374': 'am', '+995': 'ge', '+994': 'az'
    };

    // Comprehensive phone formatting patterns for all countries
    const phonePatterns = {
      // Europe
      'tr': { pattern: '0### ### ## ##', blocks: [4, 3, 2, 2] },           // Turkey
      'gb': { pattern: '##### ######', blocks: [5, 6] },                    // United Kingdom
      'de': { pattern: '### #### ####', blocks: [3, 4, 4] },               // Germany
      'fr': { pattern: '# ## ## ## ##', blocks: [1, 2, 2, 2, 2] },         // France
      'it': { pattern: '### ### ####', blocks: [3, 3, 4] },                // Italy
      'es': { pattern: '### ### ###', blocks: [3, 3, 3] },                 // Spain
      'nl': { pattern: '# #### ####', blocks: [1, 4, 4] },                 // Netherlands
      'be': { pattern: '### ## ## ##', blocks: [3, 2, 2, 2] },             // Belgium
      'ch': { pattern: '## ### ## ##', blocks: [2, 3, 2, 2] },             // Switzerland
      'at': { pattern: '### #### ####', blocks: [3, 4, 4] },               // Austria
      'se': { pattern: '## ### ## ##', blocks: [2, 3, 2, 2] },             // Sweden
      'no': { pattern: '### ## ###', blocks: [3, 2, 3] },                  // Norway
      'dk': { pattern: '## ## ## ##', blocks: [2, 2, 2, 2] },              // Denmark
      'fi': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // Finland
      'gr': { pattern: '### ### ####', blocks: [3, 3, 4] },                // Greece
      'pt': { pattern: '### ### ###', blocks: [3, 3, 3] },                 // Portugal
      'ie': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // Ireland
      'pl': { pattern: '### ### ###', blocks: [3, 3, 3] },                 // Poland
      'cz': { pattern: '### ### ###', blocks: [3, 3, 3] },                 // Czech Republic
      'hu': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // Hungary
      'ro': { pattern: '### ### ###', blocks: [3, 3, 3] },                 // Romania
      'bg': { pattern: '### ### ###', blocks: [3, 3, 3] },                 // Bulgaria
      'hr': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // Croatia
      'si': { pattern: '## ### ###', blocks: [2, 3, 3] },                  // Slovenia
      'sk': { pattern: '### ### ###', blocks: [3, 3, 3] },                 // Slovakia
      'lt': { pattern: '### #####', blocks: [3, 5] },                      // Lithuania
      'lv': { pattern: '#### ####', blocks: [4, 4] },                      // Latvia
      'ee': { pattern: '#### ####', blocks: [4, 4] },                      // Estonia
      'is': { pattern: '### ####', blocks: [3, 4] },                       // Iceland
      'mt': { pattern: '#### ####', blocks: [4, 4] },                      // Malta
      'cy': { pattern: '## ######', blocks: [2, 6] },                      // Cyprus
      'ru': { pattern: '### ### ## ##', blocks: [3, 3, 2, 2] },           // Russia
      'ua': { pattern: '## ### ## ##', blocks: [2, 3, 2, 2] },            // Ukraine
      'by': { pattern: '## ### ## ##', blocks: [2, 3, 2, 2] },            // Belarus

      // North America
      'us': { pattern: '(###) ###-####', blocks: [3, 3, 4] },              // United States
      'ca': { pattern: '(###) ###-####', blocks: [3, 3, 4] },              // Canada
      'mx': { pattern: '## #### ####', blocks: [2, 4, 4] },                // Mexico

      // Asia
      'cn': { pattern: '### #### ####', blocks: [3, 4, 4] },               // China
      'in': { pattern: '##### #####', blocks: [5, 5] },                    // India
      'jp': { pattern: '## #### ####', blocks: [2, 4, 4] },                // Japan
      'kr': { pattern: '## #### ####', blocks: [2, 4, 4] },                // South Korea
      'sg': { pattern: '#### ####', blocks: [4, 4] },                      // Singapore
      'my': { pattern: '## #### ####', blocks: [2, 4, 4] },                // Malaysia
      'id': { pattern: '### #### ####', blocks: [3, 4, 4] },               // Indonesia
      'th': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // Thailand
      'ph': { pattern: '### ### ####', blocks: [3, 3, 4] },                // Philippines
      'vn': { pattern: '### ### ####', blocks: [3, 3, 4] },                // Vietnam
      'pk': { pattern: '### ### ####', blocks: [3, 3, 4] },                // Pakistan
      'bd': { pattern: '#### ######', blocks: [4, 6] },                    // Bangladesh
      'lk': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // Sri Lanka
      'mm': { pattern: '# ### ####', blocks: [1, 3, 4] },                  // Myanmar
      'kh': { pattern: '## ### ###', blocks: [2, 3, 3] },                  // Cambodia
      'la': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // Laos
      'am': { pattern: '## ######', blocks: [2, 6] },                      // Armenia
      'ge': { pattern: '### ### ###', blocks: [3, 3, 3] },                 // Georgia
      'az': { pattern: '## ### ## ##', blocks: [2, 3, 2, 2] },            // Azerbaijan

      // Middle East
      'ae': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // UAE
      'sa': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // Saudi Arabia
      'il': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // Israel
      'ir': { pattern: '### ### ####', blocks: [3, 3, 4] },                // Iran
      'iq': { pattern: '### ### ####', blocks: [3, 3, 4] },                // Iraq
      'jo': { pattern: '# #### ####', blocks: [1, 4, 4] },                 // Jordan
      'lb': { pattern: '## ### ###', blocks: [2, 3, 3] },                  // Lebanon
      'sy': { pattern: '## #### ####', blocks: [2, 4, 4] },                // Syria
      'om': { pattern: '#### ####', blocks: [4, 4] },                      // Oman
      'qa': { pattern: '#### ####', blocks: [4, 4] },                      // Qatar
      'kw': { pattern: '#### ####', blocks: [4, 4] },                      // Kuwait
      'bh': { pattern: '#### ####', blocks: [4, 4] },                      // Bahrain

      // Africa
      'eg': { pattern: '### ### ####', blocks: [3, 3, 4] },                // Egypt
      'za': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // South Africa
      'ng': { pattern: '### ### ####', blocks: [3, 3, 4] },                // Nigeria
      'ke': { pattern: '### ######', blocks: [3, 6] },                     // Kenya
      'ug': { pattern: '### ######', blocks: [3, 6] },                     // Uganda
      'tz': { pattern: '### ### ####', blocks: [3, 3, 4] },                // Tanzania
      'gh': { pattern: '### ### ####', blocks: [3, 3, 4] },                // Ghana
      'ma': { pattern: '### ######', blocks: [3, 6] },                     // Morocco
      'dz': { pattern: '### ## ## ##', blocks: [3, 2, 2, 2] },            // Algeria
      'tn': { pattern: '## ### ###', blocks: [2, 3, 3] },                  // Tunisia
      'ly': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // Libya
      'et': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // Ethiopia
      'zm': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // Zambia
      'zw': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // Zimbabwe

      // Oceania
      'au': { pattern: '### ### ###', blocks: [3, 3, 3] },                 // Australia
      'nz': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // New Zealand
      'fj': { pattern: '### ####', blocks: [3, 4] },                       // Fiji

      // South America
      'br': { pattern: '## ##### ####', blocks: [2, 5, 4] },               // Brazil
      'ar': { pattern: '## #### ####', blocks: [2, 4, 4] },                // Argentina
      'cl': { pattern: '# #### ####', blocks: [1, 4, 4] },                 // Chile
      'co': { pattern: '### ### ####', blocks: [3, 3, 4] },                // Colombia
      'pe': { pattern: '### ### ###', blocks: [3, 3, 3] },                 // Peru
      've': { pattern: '### ### ####', blocks: [3, 3, 4] },                // Venezuela
      'ec': { pattern: '## ### ####', blocks: [2, 3, 4] },                 // Ecuador
      'uy': { pattern: '#### ####', blocks: [4, 4] },                      // Uruguay
      'py': { pattern: '### ### ###', blocks: [3, 3, 3] },                 // Paraguay
      'bo': { pattern: '# ### ####', blocks: [1, 3, 4] },                  // Bolivia

      // Default fallback for unsupported countries
      'default': { pattern: '################', blocks: [16] }
    };

    let cleaveInstance = null;

    if (countrySelect.length && phoneInput) {
      // Initialize Select2 with enhanced options
      countrySelect.select2({
        placeholder: 'Select your country',
        allowClear: false,
        width: 'resolve',
        dropdownAutoWidth: true,
        templateResult: function (option) {
          // For dropdown menu - show CDN flag + country name + code
          if (!option.id) return option.text;

          let countryCode = $(option.element).data('country');
          const text = option.text;
          const phoneCode = option.id;

          // If no data-country attribute, try to get from mapping
          if (!countryCode) {
            countryCode = countryMapping[phoneCode];
          }

          if (countryCode) {
            // Use Flagpedia CDN for high-quality flags
            const flagUrl = `https://flagcdn.com/24x18/${countryCode}.png`;
            return $(`<span style="display: flex; align-items: center; gap: 8px;">
              <img src="${flagUrl}" style="width: 24px; height: 18px; object-fit: cover; border-radius: 2px;" onerror="this.style.display='none';" />
              <span>${text}</span>
            </span>`);
          }

          return $('<span>' + option.text + '</span>');
        },
        templateSelection: function (option) {
          // For selected display - show only CDN flag and code
          if (!option.id) return option.text;

          let countryCode = $(option.element).data('country');
          const phoneCode = option.id;

          // If no data-country attribute, try to get from mapping
          if (!countryCode) {
            countryCode = countryMapping[phoneCode];
          }

          if (countryCode) {
            // Use Flagpedia CDN for selected display too
            const flagUrl = `https://flagcdn.com/20x15/${countryCode}.png`;
            return $(`<span style="display: flex; align-items: center; gap: 6px; font-weight: 500;">
              <img src="${flagUrl}" style="width: 20px; height: 15px; object-fit: cover; border-radius: 2px;" onerror="this.style.display='none';" />
              <span>${phoneCode}</span>
            </span>`);
          }

          return $('<span>' + option.text + '</span>');
        }
      });

      // Initialize Cleave.js for phone formatting
      function initPhoneFormatter(countryCode) {
        // Destroy existing instance
        if (cleaveInstance) {
          cleaveInstance.destroy();
        }

        const pattern = phonePatterns[countryCode] || phonePatterns['default'];

        cleaveInstance = new Cleave('#phone', {
          phone: true,
          phoneRegionCode: countryCode.toUpperCase(),
          delimiter: ' ',
          blocks: pattern.blocks,
          numericOnly: true
        });
      }

      // Update placeholder and format when country changes
      countrySelect.on('select2:select', function (e) {
        const selectedData = e.params.data;
        const selectedElement = $(selectedData.element);
        const placeholder = selectedData.element.getAttribute('data-placeholder');
        const phoneCode = selectedData.id;

        if (placeholder && phoneInput) {
          phoneInput.placeholder = placeholder;
        }

        // Get country code for formatting
        let countryCode = $(selectedData.element).data('country');
        if (!countryCode) {
          countryCode = countryMapping[phoneCode];
        }

        if (countryCode) {
          initPhoneFormatter(countryCode);
        }
      });

      // Set initial placeholder and formatter (Turkey as default)
      const initialOption = countrySelect.find('option:first');
      if (initialOption.length) {
        const initialPlaceholder = initialOption.attr('data-placeholder');
        if (initialPlaceholder && phoneInput) {
          phoneInput.placeholder = initialPlaceholder;
        }

        // Initialize with Turkey format
        const initialCountryCode = initialOption.data('country') || 'tr';
        initPhoneFormatter(initialCountryCode);
      }
    }
  }

  function createCalendar() {
    const calendarContainer = document.getElementById('flight-calendar');
    if (!calendarContainer) return;

    const today = new Date();
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();

    // Create calendar HTML
    const calendar = document.createElement('div');
    calendar.className = 'calendar';

    // Calendar header
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-4';
    header.innerHTML = `
      <button id="prev-month" class="p-2 hover:bg-gray-100 rounded">&lt;</button>
      <h4 id="calendar-month" class="font-semibold"></h4>
      <button id="next-month" class="p-2 hover:bg-gray-100 rounded">&gt;</button>
    `;
    calendar.appendChild(header);

    // Days grid
    const daysGrid = document.createElement('div');
    daysGrid.id = 'calendar-days';
    daysGrid.className = 'grid grid-cols-7 gap-1';
    calendar.appendChild(daysGrid);

    calendarContainer.appendChild(calendar);

    // Initialize calendar with current month
    renderCalendar(currentYear, currentMonth);

    // Event listeners for month navigation
    document.getElementById('prev-month').addEventListener('click', () => {
      const newMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const newYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const today = new Date();
      if (newYear > today.getFullYear() || (newYear === today.getFullYear() && newMonth >= today.getMonth())) {
        currentMonth = newMonth;
        currentYear = newYear;
        renderCalendar(currentYear, currentMonth);
      }
    });

    document.getElementById('next-month').addEventListener('click', () => {
      const newMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const newYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      currentMonth = newMonth;
      currentYear = newYear;
      renderCalendar(currentYear, currentMonth);
    });
  }

  // Expose createCalendar for language switching
  window.recreateCalendar = createCalendar;

  function renderCalendar(year, month) {
    // Use translated month and day names from window object
    const monthNames = window.calendarTranslations?.months || ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = window.calendarTranslations?.daysShort || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    document.getElementById('calendar-month').textContent = `${monthNames[month]} ${year}`;

    const daysGrid = document.getElementById('calendar-days');
    daysGrid.innerHTML = '';

    // Day headers
    dayNames.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'text-center text-xs font-medium text-muted p-2';
      dayHeader.textContent = day;
      daysGrid.appendChild(dayHeader);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'p-2';
      daysGrid.appendChild(emptyDay);
    }

    // Calendar days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement('button');
      const currentDate = new Date(year, month, day);
      const isPast = currentDate < today.setHours(0, 0, 0, 0);

      dayElement.className = `p-2 text-center rounded ${isPast
          ? 'text-gray-300 cursor-not-allowed'
          : 'hover:bg-accent1 hover:text-white cursor-pointer'
        }`;
      dayElement.textContent = day;

      if (!isPast) {
        dayElement.addEventListener('click', () => selectDate(year, month, day));
      }

      daysGrid.appendChild(dayElement);
    }
  }

  // Expose renderCalendar to global scope for language switching
  window.renderCalendar = renderCalendar;
  window.getCurrentCalendarState = function() {
    return { currentMonth, currentYear };
  };

  function selectDate(year, month, day) {
    // Remove previous selection
    document.querySelectorAll('.calendar button').forEach(btn => {
      btn.classList.remove('bg-accent1', 'text-white');
    });

    // Add selection to clicked date
    event.target.classList.add('bg-accent1', 'text-white');

    selectedDate = new Date(year, month, day);
    updateSelectedDate();
  }

  function updateSelectedDate() {
    const selectedDateEl = document.getElementById('selected-date');
    if (selectedDate && selectedDateEl) {
      selectedDateEl.textContent = selectedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  // Get maximum passengers based on flight type
  function getMaxPassengers() {
    const flightTypeInput = document.getElementById('flight-type');
    const flightType = flightTypeInput ? flightTypeInput.value : 'Standard Flight';

    if (flightType === 'Comfort Flight') {
      return 28;
    } else if (flightType === 'Private Flight') {
      return 20;
    }
    return 32; // Default for Standard Flight
  }

  function initPassengerControls() {
    // Adults controls
    document.getElementById('adults-plus')?.addEventListener('click', () => {
      if (adultsCount + childrenCount < getMaxPassengers()) {
        adultsCount++;
        updatePassengerCount();
      }
    });

    document.getElementById('adults-minus')?.addEventListener('click', () => {
      if (adultsCount > 1) {
        adultsCount--;
        updatePassengerCount();
      }
    });

    // Children controls
    document.getElementById('children-plus')?.addEventListener('click', () => {
      if (adultsCount + childrenCount < getMaxPassengers()) {
        childrenCount++;
        updatePassengerCount();
      }
    });

    document.getElementById('children-minus')?.addEventListener('click', () => {
      if (childrenCount > 0) {
        childrenCount--;
        updatePassengerCount();
      }
    });
  }

  function updatePassengerCount() {
    document.getElementById('adults-count').textContent = adultsCount;
    document.getElementById('children-count').textContent = childrenCount;

    // Enhanced passenger display
    const totalPassengersEl = document.getElementById('total-passengers');
    if (totalPassengersEl) {
      let displayText = '';
      if (adultsCount > 0) {
        displayText += `${adultsCount} Adult${adultsCount > 1 ? 's' : ''}`;
      }
      if (childrenCount > 0) {
        if (displayText) displayText += ', ';
        displayText += `${childrenCount} Child${childrenCount > 1 ? 'ren' : ''}`;
      }
      totalPassengersEl.textContent = displayText;
    }

  }

  function initBookingForm() {
    const form = document.getElementById('booking-form');
    if (!form) return;

    // Remove existing event listeners to prevent duplicate submissions
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // Add single event listener
    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validate date selection
      if (!selectedDate) {
        Swal.fire({
          icon: 'warning',
          title: 'Date Required',
          text: 'Please select a date for your flight.',
          confirmButtonColor: '#DCA47C'
        });
        return;
      }

      // Get form data
      const formData = new FormData(newForm);
      const name = formData.get('name')?.trim();
      const email = formData.get('email')?.trim();
      const phone = formData.get('phone')?.trim();

      // Validate required fields
      if (!name) {
        Swal.fire({
          icon: 'warning',
          title: 'Name Required',
          text: 'Please enter your full name.',
          confirmButtonColor: '#DCA47C'
        }).then(() => {
          newForm.querySelector('#name').focus();
        });
        return;
      }

      if (!email) {
        Swal.fire({
          icon: 'warning',
          title: 'Email Required',
          text: 'Please enter your email address.',
          confirmButtonColor: '#DCA47C'
        }).then(() => {
          newForm.querySelector('#email').focus();
        });
        return;
      }

      // Basic email validation
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Email',
          text: 'Please enter a valid email address.',
          confirmButtonColor: '#DCA47C'
        }).then(() => {
          newForm.querySelector('#email').focus();
        });
        return;
      }

      // Get flight type from hidden input
      const flightTypeInput = document.getElementById('flight-type');
      const flightType = flightTypeInput ? flightTypeInput.value : 'Unknown Flight Type';

      // Set maximum passengers based on flight type
      let maxPassengers = 32; // Default for Standard Flight
      if (flightType === 'Comfort Flight') {
        maxPassengers = 28;
      } else if (flightType === 'Private Flight') {
        maxPassengers = 20;
      }

      // Validate total passengers
      const totalPassengers = adultsCount + childrenCount;
      if (totalPassengers > maxPassengers) {
        Swal.fire({
          icon: 'error',
          title: 'Too Many Passengers',
          text: `Maximum ${maxPassengers} passengers allowed for ${flightType}.`,
          confirmButtonColor: '#DCA47C'
        });
        return;
      }

      const bookingData = {
        flightType: flightType,
        date: selectedDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        adults: adultsCount,
        children: childrenCount,
        name: name,
        email: email,
        phone: phone || 'Not provided'
      };

      // Show confirmation dialog with booking details
      const result = await Swal.fire({
        title: t('confirmTitle'),
        html: `
          <div class="text-left space-y-2">
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="font-semibold text-lg mb-3">${t('flightDetails')}</h4>
              <p><strong>${t('flight')}:</strong> ${bookingData.flightType}</p>
              <p><strong>${t('date')}:</strong> ${bookingData.date}</p>
              <p><strong>${t('passengers')}:</strong> ${bookingData.adults} ${t('adults')}${bookingData.children > 0 ? `, ${bookingData.children} ${t('children')}` : ''}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg mt-3">
              <h4 class="font-semibold text-lg mb-3">${t('contactInfo')}</h4>
              <p><strong>${t('name')}:</strong> ${bookingData.name}</p>
              <p><strong>${t('email')}:</strong> ${bookingData.email}</p>
              <p><strong>${t('phone')}:</strong> ${bookingData.phone}</p>
            </div>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#DCA47C',
        cancelButtonColor: '#6B7280',
        confirmButtonText: t('sendRequest'),
        cancelButtonText: t('cancel'),
        customClass: {
          htmlContainer: 'swal-html-container'
        }
      });

      if (!result.isConfirmed) {
        return;
      }

      // ========================================
      // SUPABASE: Save booking to database
      // ========================================

      // Get country code from select2
      const countryCodeSelect = $('#country-code');
      const countryCode = countryCodeSelect.val() || '+90';

      const supabaseData = {
        name: bookingData.name,
        email: bookingData.email,
        phone: bookingData.phone,
        countryCode: countryCode,
        tourType: bookingData.flightType,
        date: selectedDate.toISOString().split('T')[0], // YYYY-MM-DD format
        persons: bookingData.adults + bookingData.children,
        specialRequests: `Adults: ${bookingData.adults}, Children: ${bookingData.children}`
      };


      const saveResult = await saveBookingToSupabase(supabaseData);

      if (saveResult.success) {

        // Show success message with PNR
        await Swal.fire({
          icon: 'success',
          title: t('successTitle'),
          html: `
            <p class="text-gray-600 mb-4">${t('successMessage')}</p>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
              <p class="text-sm font-semibold text-blue-900 mb-1">${t('pnrLabel')}</p>
              <p class="text-2xl font-bold text-blue-600 tracking-wider">${saveResult.data?.pnr_number || 'N/A'}</p>
            </div>
            <p class="text-sm text-gray-500 mb-2">${t('confirmMessage')}</p>
            <p class="text-xs text-gray-400 italic">${t('pnrNote')}</p>
          `,
          confirmButtonText: t('confirmButton'),
          confirmButtonColor: '#DCA47C'
        });

        emailjs
          .send("service_itfm1m6", "template_fyo9dtq", {
            name: supabaseData.name,
            email: supabaseData.email,
            phone: supabaseData.phone || 'Not provided',
            country_code: supabaseData.countryCode,
            tour_type: supabaseData.tourType,
            tour_date: supabaseData.date,
            persons: supabaseData.persons,
            special_requests: supabaseData.specialRequests || 'Not provided',
            pnr_number: saveResult.data?.pnr_number || '',
            reservation_date: getIstanbulTime()
          })
          .then(() => {
            status.textContent = "✅ Rezervasyon alındı, e-posta gönderildi!";
          })
          .catch((err) => {
            console.error(err);
            status.textContent = "⚠️ E-posta gönderilemedi!";
          });

        // Reset form
        form.reset();
        selectedDate = null;
        document.getElementById('selected-date').textContent = 'Please select a date';
        document.getElementById('adults-count').textContent = '2';
        document.getElementById('children-count').textContent = '0';

      } else {
        console.error('❌ Failed to save to database:', saveResult.error);

        // Show error message
        await Swal.fire({
          icon: 'error',
          title: t('errorTitle'),
          html: `
            <p class="text-gray-600 mb-4">${t('errorMessage')}</p>
            <p class="text-sm text-gray-500">${t('errorNote')}</p>
          `,
          confirmButtonText: t('okButton'),
          confirmButtonColor: '#DCA47C'
        });
      }
      // ========================================
    });
  }

  // Initialize when DOM is loaded or when called by component system
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBookingPage);
  } else {
    initBookingPage();
  }

  // Make it available globally for component reinitialization
  window.initBookingPage = initBookingPage;
})();

// ========================================
// CAPPADOCIA TOURS SUPABASE INTEGRATION
// ========================================

/**
 * Initialize Cappadocia Tours booking with Supabase
 * This handles tours like Jeep Safari, Horse Riding, etc.
 */
function initCappadociaTourBooking() {
  const tourForm = document.getElementById('tour-booking-form');
  if (!tourForm) return; // Not a Cappadocia tour page


  // Get the original submit handler
  const originalSubmitHandler = tourForm.onsubmit;

  // Override with Supabase-enabled handler
  tourForm.addEventListener('submit', async function (e) {
    e.preventDefault();


    // Get form data
    const formData = new FormData(tourForm);
    const name = formData.get('name')?.trim();
    const email = formData.get('email')?.trim();
    const phone = formData.get('phone')?.trim() || '';
    const hotel = formData.get('hotel')?.trim() || '';
    const tourType = document.getElementById('tour-type')?.value || 'Unknown Tour';

    // Get calendar date
    const calendarInput = document.getElementById('calendar');
    const selectedDateValue = calendarInput?.value;

    if (!selectedDateValue) {
      await Swal.fire({
        icon: 'warning',
        title: 'Date Required',
        text: 'Please select a date for your tour.',
        confirmButtonColor: '#DCA47C'
      });
      return;
    }

    // Get country code
    const countryCodeSelect = $('#country-code');
    const countryCode = countryCodeSelect.val() || '+90';

    // Get persons count
    const personsInput = document.getElementById('persons');
    const persons = personsInput ? parseInt(personsInput.value) : 1;

    // Prepare booking data
    const bookingData = {
      name: name,
      email: email,
      phone: phone,
      countryCode: countryCode,
      tourType: tourType,
      date: selectedDateValue, // Already in YYYY-MM-DD format from calendar
      persons: persons,
      specialRequests: hotel ? `Hotel: ${hotel}` : null
    };


    // Show confirmation
    const result = await Swal.fire({
      title: t('confirmTitle'),
      html: `
        <div class="text-left space-y-2">
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-lg mb-3">${t('tourDetails')}</h4>
            <p><strong>${t('tour')}:</strong> ${tourType}</p>
            <p><strong>${t('date')}:</strong> ${new Date(selectedDateValue).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>${t('persons')}:</strong> ${persons}</p>
            ${hotel ? `<p><strong>${t('hotel')}:</strong> ${hotel}</p>` : ''}
          </div>
          <div class="bg-gray-50 p-4 rounded-lg mt-3">
            <h4 class="font-semibold text-lg mb-3">${t('contactInfo')}</h4>
            <p><strong>${t('name')}:</strong> ${name}</p>
            <p><strong>${t('email')}:</strong> ${email}</p>
            ${phone ? `<p><strong>${t('phone')}:</strong> ${countryCode} ${phone}</p>` : ''}
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#DCA47C',
      cancelButtonColor: '#6B7280',
      confirmButtonText: t('sendRequest'),
      cancelButtonText: t('cancel')
    });

    if (!result.isConfirmed) {
      return;
    }

    // ========================================
    // SUPABASE: Save tour booking
    // ========================================

    const supabaseData = {
      name: bookingData.name,
      email: bookingData.email,
      phone: bookingData.phone || 'Not provided',
      countryCode: bookingData.countryCode,
      tourType: bookingData.tourType,
      date: bookingData.date,
      persons: bookingData.persons,
      specialRequests: bookingData.specialRequests,
      hotelName: hotel || null
    };


    const saveResult = await saveBookingToSupabase(supabaseData);

    if (saveResult.success) {
      // Show success message with PNR
      await Swal.fire({
        icon: 'success',
        title: t('successTitle'),
        html: `
          <p class="text-gray-600 mb-4">${t('successMessage')}</p>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
            <p class="text-sm font-semibold text-blue-900 mb-1">${t('pnrLabel')}</p>
            <p class="text-2xl font-bold text-blue-600 tracking-wider">${saveResult.data?.pnr_number || 'N/A'}</p>
          </div>
          <p class="text-sm text-gray-500 mb-2">${t('confirmMessage')}</p>
          <p class="text-xs text-gray-400 italic">${t('pnrNote')}</p>
        `,
        confirmButtonText: t('confirmButton'),
        confirmButtonColor: '#DCA47C'
      });

      emailjs
        .send("service_itfm1m6", "template_fyo9dtq", {
          name: supabaseData.name,
          email: supabaseData.email,
          phone: supabaseData.phone || 'Not provided',
          country_code: supabaseData.countryCode,
          tour_type: supabaseData.tourType,
          tour_date: supabaseData.date,
          persons: supabaseData.persons,
          special_requests: supabaseData.specialRequests || 'Not provided',
          pnr_number: saveResult.data?.pnr_number || '',
          reservation_date: getIstanbulTime()
        })
        .then(() => {
          status.textContent = "✅ Rezervasyon alındı, e-posta gönderildi!";
        })
        .catch((err) => {
          console.error(err);
          status.textContent = "⚠️ E-posta gönderilemedi!";
        });

      // Reset form
      tourForm.reset();
      if (calendarInput) calendarInput.value = '';

    } else {
      console.error('❌ Failed to save booking:', saveResult.error);

      // Show error message
      await Swal.fire({
        icon: 'error',
        title: t('errorTitle'),
        html: `
          <p class="text-gray-600 mb-4">${t('errorMessage')}</p>
          <p class="text-sm text-gray-500">${t('errorNote')}</p>
        `,
        confirmButtonText: t('okButton'),
        confirmButtonColor: '#DCA47C'
      });
    }
  });
}

// Initialize Cappadocia Tours booking if on tour page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCappadociaTourBooking);
} else {
  initCappadociaTourBooking();
}
