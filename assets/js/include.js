// include.js – loads header & footer, wires up nav

function getSiteRoot() {
  const script = document.currentScript || Array.from(document.scripts).pop();
  const src = new URL(script.src, window.location.href).href;
  return src.replace(/assets\/js\/include\.js.*$/, '');
}
const SITE_ROOT = getSiteRoot();

function loadHTML(id, url, callback) {
  fetch(url)
    .then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.text(); })
    .then(html => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = html;
      if (callback) callback(el);
    })
    .catch(e => console.warn('include.js:', e));
}

function initHeader(host) {
  // Fix all relative hrefs to be absolute from site root
  host.querySelectorAll('a[href]').forEach(a => {
    const h = a.getAttribute('href');
    if (!h || /^(mailto:|tel:|https?:|#)/i.test(h)) return;
    a.href = new URL(h, SITE_ROOT).href;
  });

  // Highlight current page
  const cur = location.pathname.replace(/\/$/, '');
  host.querySelectorAll('a[href]').forEach(a => {
    const ap = new URL(a.href, location.href).pathname.replace(/\/$/, '');
    if (ap === cur) a.classList.add('current');
  });

  // Hamburger toggle
  const toggle = host.querySelector('.menu-toggle');
  const nav    = host.querySelector('#nav-menu');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('active');
      document.body.classList.toggle('nav-open', open);
    });
    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        nav.classList.remove('active');
        document.body.classList.remove('nav-open');
      });
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        nav.classList.remove('active');
        document.body.classList.remove('nav-open');
      }
    });
  }

  // People submenu - mobile accordion, desktop hover (CSS handles hover)
  const wrap = host.querySelector('.has-submenu');
  const btn  = host.querySelector('.submenu-parent');
  if (wrap && btn) {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 767) {
        wrap.classList.toggle('open');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadHTML('header-placeholder', SITE_ROOT + 'assets/includes/header.html', initHeader);
  loadHTML('footer-placeholder', SITE_ROOT + 'assets/includes/footer.html');
});
