// ================================================================
// ProtectA Escolar — main.js
// Shared navigation logic, particles, and utilities
// ================================================================

// ── Page Map ─────────────────────────────────────────────────────
const PAGES = {
  portada:    'index.html',
  perfil:     'perfil.html',
  asistente:  'asistente.html',
  canal:      'canal.html',
  recursos:   'recursos.html',
  privacidad: 'privacidad.html',
  mantenimiento: 'mantenimiento.html'
};

// ── Navigate helper ───────────────────────────────────────────────
function navigateTo(page) {
  document.body.style.opacity = '0';
  document.body.style.transform = 'translateY(10px)';
  document.body.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
  setTimeout(() => {
    window.location.href = PAGES[page] || page;
  }, 350);
}

// ── Navbar active state ───────────────────────────────────────────
function setActiveNav() {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    const target = PAGES[link.dataset.page];
    if (target === current || (current === '' && target === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// ── Floating Particles ────────────────────────────────────────────
function createParticles(count = 20) {
  const container = document.getElementById('particles');
  if (!container) return;

  const colors = ['#2d8bff', '#00d4ff', '#7b4fff', '#00e5a0'];

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${Math.random() * 4 + 2}px;
      height: ${Math.random() * 4 + 2}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration: ${Math.random() * 15 + 10}s;
      animation-delay: ${Math.random() * 10}s;
    `;
    container.appendChild(particle);
  }
}

// ── Page enter animation ──────────────────────────────────────────
function initPageEnter() {
  document.body.style.opacity = '0';
  document.body.style.transform = 'translateY(15px)';
  document.body.style.transition = 'none';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      document.body.style.opacity = '1';
      document.body.style.transform = 'translateY(0)';
    });
  });
}

// ── Intersection Observer for card animations ─────────────────────
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate-on-scroll').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`;
    observer.observe(el);
  });
}

// ── Profile selection state ───────────────────────────────────────
const ProtectaState = {
  selectedProfile: localStorage.getItem('protecta_profile') || null,

  setProfile(profile) {
    this.selectedProfile = profile;
    localStorage.setItem('protecta_profile', profile);
  },

  getProfile() {
    return this.selectedProfile || localStorage.getItem('protecta_profile');
  },

  getProfileLabel() {
    const map = {
      alumnado:   '👨‍🎓 Alumnado',
      profesorado: '👩‍🏫 Profesorado',
      familias:   '👨‍👩‍👧 Familias'
    };
    return map[this.getProfile()] || 'Seleccionar perfil';
  }
};

// ── Ripple effect on buttons ──────────────────────────────────────
function addRipple(e) {
  const btn = e.currentTarget;
  const ripple = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;

  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
    background: rgba(255,255,255,0.25);
    border-radius: 50%;
    transform: scale(0);
    animation: ripple-anim 0.6s ease-out;
    pointer-events: none;
  `;

  if (!document.getElementById('ripple-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-style';
    style.textContent = `@keyframes ripple-anim { to { transform: scale(4); opacity: 0; } }`;
    document.head.appendChild(style);
  }

  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
}

function initRipples() {
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', addRipple);
  });
}

// ── Toast notifications ───────────────────────────────────────────
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const colors = {
    success: 'rgba(0, 229, 160, 0.15)',
    error:   'rgba(255, 77, 109, 0.15)',
    info:    'rgba(45, 139, 255, 0.15)',
    warning: 'rgba(255, 193, 7, 0.15)'
  };

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icons[type]}</span> <span>${message}</span>`;
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 24px;
    z-index: 9999;
    background: ${colors[type]};
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 12px;
    padding: 14px 20px;
    font-size: 14px;
    color: #e8eeff;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    animation: slide-toast 0.4s ease forwards;
    max-width: 340px;
  `;

  if (!document.getElementById('toast-style')) {
    const style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent = `@keyframes slide-toast { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }`;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ── DOMContentLoaded init ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initPageEnter();
  createParticles(25);
  setActiveNav();
  initScrollAnimations();

  // Delay ripple init slightly so all buttons are rendered
  setTimeout(initRipples, 100);

  // Brand click → portada
  document.querySelectorAll('.nav-brand').forEach(el => {
    el.addEventListener('click', () => navigateTo('portada'));
  });

  // Nav links
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', () => navigateTo(link.dataset.page));
  });

  // Profile badge in nav
  const profileBadge = document.getElementById('nav-profile-badge');
  if (profileBadge && ProtectaState.getProfile()) {
    profileBadge.textContent = ProtectaState.getProfileLabel();
    profileBadge.style.display = 'inline-flex';
  }
});
