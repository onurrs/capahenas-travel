// Component loader utility
(function() {
  // Load HTML component
  async function loadComponent(selector, filePath) {
    try {
      const response = await fetch(filePath);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      
      const element = document.querySelector(selector);
      if (element) {
        element.innerHTML = html;
        return true;
      } else {
        console.error(`Element not found: ${selector}`);
        return false;
      }
    } catch (error) {
      console.error(`Error loading component ${filePath}:`, error);
      
      // Fallback: show error message in the container
      const element = document.querySelector(selector);
      if (element) {
        element.innerHTML = `<div style="color: red; padding: 10px;">Failed to load ${filePath}</div>`;
      }
      return false;
    }
  }

  // Initialize components when DOM is loaded
  document.addEventListener('DOMContentLoaded', async () => {
    
    // Load header
    const headerLoaded = await loadComponent('#header-container', './components/header.html');
    
    // Load footer  
    const footerLoaded = await loadComponent('#footer-container', './components/footer.html');
    
    // Reinitialize scripts after components are loaded
    if (window.initializeApp) {
      window.initializeApp();
    }
    
    // Also reinitialize booking page if available
    if (window.initBookingPage) {
      window.initBookingPage();
    }
  });

  // Make loadComponent available globally if needed
  window.loadComponent = loadComponent;
})();