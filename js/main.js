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

document.addEventListener('DOMContentLoaded', initAnalyticsLinks);
