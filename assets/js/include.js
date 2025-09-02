// --- include.js: path-safe header/footer loader ---

// 1) Compute the site root from the script tag that loaded THIS file
function getSiteRoot() {
  const script = document.currentScript || Array.from(document.scripts).pop();
  const srcAbs = new URL(script.src, window.location.href).href;
  // Remove "assets/js/include.js" + optional query/hash
  const root = srcAbs.replace(/assets\/js\/include\.js(\?.*)?(#.*)?$/, '');
  return root.endsWith('/') ? root : root + '/';
}
const SITE_ROOT = getSiteRoot();

// 2) Generic loader
function loadHTML(id, absoluteUrl, afterLoad) {
  return fetch(absoluteUrl, { credentials: 'same-origin' })
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load ${absoluteUrl} (${res.status})`);
      return res.text();
    })
    .then(html => {
      const host = document.getElementById(id);
      if (!host) return;
      host.innerHTML = html;
      if (typeof afterLoad === 'function') afterLoad(host);
    })
    .catch(err => console.error(err));
}

// 3) After header is injected: wire menu + rewrite links to absolute under SITE_ROOT
function initHeader(host) {
  const nav    = host.querySelector('#nav-menu');
  const toggle = host.querySelector('.menu-toggle');

  // Hamburger: open/close menu + lock body scroll
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = !nav.classList.contains('active');
      nav.classList.toggle('active', open);
      document.body.classList.toggle('nav-open', open);
    });
    // Close menu on any link click
    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        nav.classList.remove('active');
        document.body.classList.remove('nav-open');
      });
    });
  }

  // People submenu as accordion on mobile, inert on desktop
  const wrap   = host.querySelector('.has-submenu');
  const parent = host.querySelector('.submenu-parent'); // <button>
  if (wrap && parent) {
    const toggleSub = () => {
      const isDesktop = window.matchMedia('(min-width: 900px)').matches;
      if (isDesktop) return; // desktop opens on hover via CSS
      const open = !wrap.classList.contains('open');
      wrap.classList.toggle('open', open);
      parent.setAttribute('aria-expanded', String(open));
    };
    parent.addEventListener('click', (e) => { e.preventDefault(); toggleSub(); });
    parent.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSub(); }
      if (e.key === 'Escape') { wrap.classList.remove('open'); parent.setAttribute('aria-expanded', 'false'); }
    });
  }

  // (Optional) Highlight current page
  const currentPath = location.pathname.replace(/\/+$/, '');
  nav?.querySelectorAll('a[href]').forEach(a => {
    const aPath = new URL(a.href, location.href).pathname.replace(/\/+$/, '');
    if (aPath === currentPath) a.classList.add('current');
  });

  // --- NEW: normalize header links to SITE_ROOT so they work in /people/ too ---
  nav?.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    // skip mailto:, tel:, hashes, absolute URLs
    if (/^(mailto:|tel:|https?:\/\/|#)/i.test(href)) return;
    // make absolute against SITE_ROOT (not the current page directory)
    a.href = new URL(href, SITE_ROOT).href;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadHTML('header-placeholder', SITE_ROOT + 'assets/includes/header.html', initHeader);
  loadHTML('footer-placeholder', SITE_ROOT + 'assets/includes/footer.html');
});
