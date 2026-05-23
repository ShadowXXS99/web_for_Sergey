'use strict';

const YM_COUNTER_ID = 0;

function sendGoal(goalId, params = {}) {
  if (typeof window.ym === 'function' && YM_COUNTER_ID) {
    window.ym(YM_COUNTER_ID, 'reachGoal', goalId, params);
  }
}

function initAnalyticsLinks() {
  document.querySelectorAll('.js-phone-link').forEach((link) => {
    link.addEventListener('click', () => {
      sendGoal('phone_click', { place: link.className || 'phone_link' });
    });
  });

  document.querySelectorAll('.js-messenger-link').forEach((link) => {
    link.addEventListener('click', () => {
      sendGoal('messenger_click', { messenger: link.dataset.messenger || 'unknown' });
    });
  });
}

function initFaqAccordion() {
  document.querySelectorAll('.faq-item').forEach((item) => {
    const button = item.querySelector('.faq-item__question');
    const answer = item.querySelector('.faq-item__answer');

    if (!button || !answer) {
      return;
    }

    button.addEventListener('click', () => {
      const isOpen = item.classList.toggle('is-open');
      button.setAttribute('aria-expanded', String(isOpen));
      answer.setAttribute('aria-hidden', String(!isOpen));
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAnalyticsLinks();
  initFaqAccordion();
});
