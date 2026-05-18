'use strict';

const CONFIG = {
  YM_COUNTER_ID: 0, // CHANGE_ME: ID счетчика Яндекс.Метрики
  PHONE_TEL: '+79990000000', // CHANGE_ME: телефон в формате tel:
  PHONE_TEXT: '+7 (999) 000-00-00', // CHANGE_ME: телефон для текста
  EMAIL: 'mail@example.ru', // CHANGE_ME
  COMPANY_NAME: 'ИП Иванов Иван Иванович', // CHANGE_ME
  INN: '000000000000', // CHANGE_ME
  OGRNIP: '000000000000000', // CHANGE_ME
  FORM_MODE: 'php', // 'php' | 'formspree' | 'google_forms'
  FORM_ENDPOINT: '/send.php', // CHANGE_ME
  TELEGRAM_WEBHOOK_URL: 'https://example.com/webhook/telegram', // placeholder, секреты хранить только на сервере
  ATS_WEBHOOK_URL: 'https://example.com/webhook/ats', // Stage 2: интеграция с АТС / авто-SMS, не используется на текущем этапе
  GOOGLE_FORMS_FIELDS: {
    name: 'entry.000000001', // CHANGE_ME: mapping поля имени
    phone: 'entry.000000002', // CHANGE_ME: mapping поля телефона
    message: 'entry.000000003' // CHANGE_ME: mapping поля комментария
  }
};

function sendGoal(goalId, params = {}) {
  if (typeof window.ym === 'function' && CONFIG.YM_COUNTER_ID) {
    window.ym(CONFIG.YM_COUNTER_ID, 'reachGoal', goalId, params);
  }
}

function normalizePhone(value) {
  return value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
}

function isPhoneValid(value) {
  const normalized = normalizePhone(value);
  const digits = normalized.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function setFieldError(field, message) {
  const errorElement = document.getElementById(`${field.id}-error`);
  field.setAttribute('aria-invalid', message ? 'true' : 'false');

  if (errorElement) {
    errorElement.textContent = message;
  }
}

function setFormStatus(message, type) {
  const status = document.getElementById('form-status');

  if (!status) {
    return;
  }

  status.textContent = message;
  status.className = `form__status${type ? ` form__status--${type}` : ''}`;
}

function validateLeadForm(form) {
  let isValid = true;
  const name = form.elements.name;
  const phone = form.elements.phone;
  const message = form.elements.message;
  const consent = form.elements.consent;

  if (!name.value.trim() || name.value.trim().length < 2) {
    setFieldError(name, 'Укажите имя минимум из 2 символов.');
    isValid = false;
  } else {
    setFieldError(name, '');
  }

  if (!isPhoneValid(phone.value)) {
    setFieldError(phone, 'Укажите корректный телефон для связи.');
    isValid = false;
  } else {
    setFieldError(phone, '');
  }

  if (message.value.trim().length > 1000) {
    setFieldError(message, 'Комментарий слишком длинный. Сократите текст до 1000 символов.');
    isValid = false;
  } else {
    setFieldError(message, '');
  }

  const consentError = document.getElementById('consent-error');
  consent.setAttribute('aria-invalid', consent.checked ? 'false' : 'true');
  if (consentError) {
    consentError.textContent = consent.checked ? '' : 'Нужно согласие на обработку персональных данных.';
  }
  if (!consent.checked) {
    isValid = false;
  }

  return isValid;
}

function buildGoogleFormsData(form) {
  const formData = new FormData();
  formData.append(CONFIG.GOOGLE_FORMS_FIELDS.name, form.elements.name.value.trim());
  formData.append(CONFIG.GOOGLE_FORMS_FIELDS.phone, normalizePhone(form.elements.phone.value));
  formData.append(CONFIG.GOOGLE_FORMS_FIELDS.message, form.elements.message.value.trim());
  return formData;
}

async function submitLeadForm(form) {
  let endpoint = CONFIG.FORM_ENDPOINT;
  let body = new FormData(form);

  body.set('phone', normalizePhone(form.elements.phone.value));

  if (CONFIG.FORM_MODE === 'google_forms') {
    endpoint = CONFIG.FORM_ENDPOINT; // CHANGE_ME: публичный endpoint Google Forms
    body = buildGoogleFormsData(form);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    body,
    headers: {
      'Accept': 'application/json'
    }
  });

  if (CONFIG.FORM_MODE === 'google_forms') {
    sendGoal('form_submit');
    return { ok: true, message: 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.' };
  }

  const data = await response.json().catch(() => ({
    ok: false,
    message: 'Сервер вернул некорректный ответ.'
  }));

  if (!response.ok || !data.ok) {
    throw new Error(data.message || 'Не удалось отправить заявку.');
  }

  sendGoal('form_submit');
  return data;
}

function initPhoneGoals() {
  document.querySelectorAll('.js-phone-link').forEach((link) => {
    link.addEventListener('click', () => {
      sendGoal('phone_click', { place: link.className || 'phone_link' });
    });
  });
}

function initCtaGoals() {
  document.querySelectorAll('.js-cta-link').forEach((link) => {
    link.addEventListener('click', () => {
      sendGoal('cta_click', { target: link.getAttribute('href') || '' });
    });
  });
}

function initFaqGoals() {
  document.querySelectorAll('.faq__item').forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        const question = item.querySelector('.faq__question');
        sendGoal('faq_open', { question: question ? question.textContent.trim() : '' });
      }
    });
  });
}

function initLeadForm() {
  const form = document.getElementById('request-form');

  if (!form) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setFormStatus('', '');

    if (!validateLeadForm(form)) {
      setFormStatus('Проверьте поля формы и попробуйте еще раз.', 'error');
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : '';

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Отправляем...';
    }

    try {
      const data = await submitLeadForm(form);
      form.reset();
      form.querySelectorAll('[aria-invalid]').forEach((field) => field.setAttribute('aria-invalid', 'false'));
      setFormStatus(data.message || 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.', 'success');
    } catch (error) {
      setFormStatus(error.message || 'Не удалось отправить заявку. Позвоните мастеру по телефону.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });

  ['name', 'phone', 'message'].forEach((fieldName) => {
    const field = form.elements[fieldName];
    if (field) {
      field.addEventListener('input', () => setFieldError(field, ''));
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initPhoneGoals();
  initCtaGoals();
  initFaqGoals();
  initLeadForm();
});
