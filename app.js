/**
 * Клиентские скрипты публичной части.
 *
 * Ничего не знает о сервере, кроме формы подбора:
 * GET /search?q=... — обычная навигация, без fetch.
 * Так работают и ссылки, и кнопка «назад».
 */
(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;

  /* ── Тема ─────────────────────────────────────────────── */
  const KEY = 'daylung-theme';

  function setTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem(KEY, t); } catch (e) { /* приватный режим */ }
  }

  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
  if (stored === 'light' || stored === 'dark') setTheme(stored);

  const themeBtn = $('#themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  /* ── Шапка при скролле ────────────────────────────────── */
  const hdr = $('#hdr');
  if (hdr) {
    const onScroll = () => hdr.classList.toggle('is-stuck', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Мобильное меню ───────────────────────────────────── */
  const burger = $('#burger');
  const nav = $('#nav');

  function closeNav() {
    if (!nav || !burger) return;
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
  }

  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('no-scroll', open);
    });
    $$('.nav__a', nav).forEach((a) => a.addEventListener('click', closeNav));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 820) closeNav(); });
  }

  /* ── Появление блоков ─────────────────────────────────── */
  const reveals = $$('.reveal');

  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const d = Number(e.target.dataset.d || 0);
        setTimeout(() => e.target.classList.add('is-in'), d);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ── Чипы: подставить текст в поле ────────────────────── */
  const mainInput = $('#askInput');

  $$('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const value = chip.dataset.q || chip.textContent.trim();

      if (mainInput) {
        mainInput.value = value;
        mainInput.focus();
        mainInput.animate(
          [{ background: 'transparent' }, { background: 'rgba(122,92,255,.12)' }, { background: 'transparent' }],
          { duration: 600, easing: 'ease-out' },
        );
        return;
      }

      window.location.href = `/search?q=${encodeURIComponent(value)}`;
    });
  });

  /* ── Формы подбора: переход на /search ────────────────── */
  $$('[data-ask-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const input = $('input[name="q"]', form);
      const q = (input?.value ?? '').trim();

      if (q.length < 3) {
        if (input) {
          input.focus();
          input.animate(
            [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' },
             { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
            { duration: 300, easing: 'ease-in-out' },
          );
        }
        showToast('Опишите задачу хотя бы в двух словах');
        return;
      }

      window.location.href = `/search?q=${encodeURIComponent(q)}`;
    });
  });

  /* ── Тост ─────────────────────────────────────────────── */
  const toast = $('#toast');
  let toastTimer;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 3600);
  }

  /* ── Плавный скролл с учётом шапки ────────────────────── */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      const offset = (hdr?.offsetHeight ?? 0) + 16;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
      if (history.replaceState) history.replaceState(null, '', href);
    });
  });

  /* ── Подсветка активного пункта меню ──────────────────── */
  const sections = $$('main section[id]');
  const navLinks = $$('.nav__a[href^="/#"], .nav__a[href^="#"]');

  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    const map = new Map();
    navLinks.forEach((l) => {
      const href = l.getAttribute('href');
      map.set(href.startsWith('/#') ? href.slice(2) : href.slice(1), l);
    });

    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const link = map.get(entry.target.id);
        if (!link) return;
        navLinks.forEach((l) => l.classList.remove('is-on'));
        link.classList.add('is-on');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach((s) => spy.observe(s));
  }
})();
