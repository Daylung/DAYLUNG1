/**
 * Клиентские скрипты админки.
 *
 * Только UI: тема, мобильное меню, подтверждения, мелкие удобства.
 * Никакой бизнес-логики — все действия уходят обычными POST-формами,
 * поэтому работают даже без JavaScript.
 */
(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;

  /* ── Тема (общая с сайтом) ────────────────────────────── */
  const KEY = 'daylung-theme';
  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
  if (stored === 'light' || stored === 'dark') root.setAttribute('data-theme', stored);

  /* ── Мобильное меню ───────────────────────────────────── */
  const burger = $('#admBurger');
  const side = $('#admSide');

  if (burger && side) {
    burger.addEventListener('click', (e) => {
      e.stopPropagation();
      side.classList.toggle('is-open');
    });

    document.addEventListener('click', (e) => {
      if (!side.classList.contains('is-open')) return;
      if (side.contains(e.target) || burger.contains(e.target)) return;
      side.classList.remove('is-open');
    });
  }

  /* ── Подтверждение опасных действий ───────────────────── */
  $$('[data-confirm]').forEach((el) => {
    const form = el.closest('form');

    const handler = (e) => {
      const message = el.dataset.confirm;
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      return true;
    };

    el.addEventListener('click', handler);
    if (form && el.type === 'submit') form.addEventListener('submit', handler);
  });

  /* ── Пример компонента в редакторе ────────────────────── */
  const sampleBtn = $('#insertSample');
  const componentField = $('#component');

  if (sampleBtn && componentField) {
    sampleBtn.addEventListener('click', () => {
      componentField.value = [
        '<section class="cta" style="padding:32px">',
        '  <div class="cta__in">',
        '    <h2>Новый блок от владельца</h2>',
        '    <p>Этот фрагмент вставлен через «Доработку сайта» и прошёл санитизацию.</p>',
        '  </div>',
        '</section>',
      ].join('\n');
      componentField.focus();
    });
  }

  /* ── Счётчик символов в большом поле ──────────────────── */
  const instruction = $('#instruction');

  if (instruction) {
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:.74rem;color:var(--tx-3);margin-top:6px;text-align:right';
    instruction.parentElement.appendChild(hint);

    const update = () => {
      const len = instruction.value.length;
      hint.textContent = `${len} / 4000`;
      hint.style.color = len > 4000 ? 'var(--err)' : 'var(--tx-3)';
    };

    instruction.addEventListener('input', update);
    update();
  }

  /* ── Tab в полях кода ─────────────────────────────────── */
  $$('.codebox textarea').forEach((area) => {
    area.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();

      const start = area.selectionStart;
      const end = area.selectionEnd;
      area.value = `${area.value.slice(0, start)}  ${area.value.slice(end)}`;
      area.selectionStart = area.selectionEnd = start + 2;
    });
  });

  /* ── Автозакрытие flash-сообщений ─────────────────────── */
  const flash = $('.msg--ok');
  if (flash) {
    setTimeout(() => {
      flash.style.transition = 'opacity .5s, max-height .5s, margin .5s, padding .5s';
      flash.style.overflow = 'hidden';
      flash.style.maxHeight = `${flash.scrollHeight}px`;
      requestAnimationFrame(() => {
        flash.style.opacity = '0';
        flash.style.maxHeight = '0';
        flash.style.marginBottom = '0';
        flash.style.paddingTop = '0';
        flash.style.paddingBottom = '0';
      });
    }, 6000);
  }
})();
