<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// CHANGE_ME: замените email получателя на рабочий адрес.
$recipientEmail = 'mail@example.ru';

// CHANGE_ME: укажите домен сайта, чтобы письма корректнее проходили антиспам.
$fromEmail = 'no-reply@example.ru';

// CHANGE_ME: опциональный webhook Telegram/custom backend. Секреты хранить только здесь, не в JS.
$telegramWebhookUrl = '';

// Stage 2: интеграция с АТС / авто-SMS не реализована на текущем этапе.
$atsWebhookUrl = '';

function jsonResponse(bool $ok, string $message, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode([
        'ok' => $ok,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function cleanText(string $value, int $maxLength): string
{
    $value = trim(strip_tags($value));
    $value = preg_replace('/[\x00-\x1F\x7F]/u', ' ', $value) ?? '';
    $value = preg_replace('/\s+/u', ' ', $value) ?? '';
    return mb_substr($value, 0, $maxLength, 'UTF-8');
}

function normalizePhone(string $value): string
{
    return preg_replace('/[^\d+]/', '', $value) ?? '';
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Метод запроса не поддерживается.', 405);
}

$name = cleanText($_POST['name'] ?? '', 80);
$phone = normalizePhone((string)($_POST['phone'] ?? ''));
$message = cleanText($_POST['message'] ?? '', 1000);

$digitsOnly = preg_replace('/\D/', '', $phone) ?? '';

if (mb_strlen($name, 'UTF-8') < 2) {
    jsonResponse(false, 'Укажите имя минимум из 2 символов.', 422);
}

if (strlen($digitsOnly) < 10 || strlen($digitsOnly) > 15) {
    jsonResponse(false, 'Укажите корректный телефон.', 422);
}

$subject = 'Заявка с сайта: аварийное вскрытие замков';
$mailBody = "Новая заявка с сайта\n\n";
$mailBody .= "Имя: {$name}\n";
$mailBody .= "Телефон: {$phone}\n";
$mailBody .= "Комментарий: " . ($message !== '' ? $message : 'Не указан') . "\n";
$mailBody .= "Дата: " . date('d.m.Y H:i:s') . "\n";

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'From: Site Lead <' . $fromEmail . '>',
    'Reply-To: ' . $fromEmail,
];

$mailSent = mail($recipientEmail, '=?UTF-8?B?' . base64_encode($subject) . '?=', $mailBody, implode("\r\n", $headers));

if ($telegramWebhookUrl !== '') {
    $payload = json_encode([
        'name' => $name,
        'phone' => $phone,
        'message' => $message,
        'source' => 'site_form',
    ], JSON_UNESCAPED_UNICODE);

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\n",
            'content' => $payload,
            'timeout' => 4,
        ],
    ]);

    // Ошибка webhook не блокирует ответ пользователю, если письмо отправлено.
    @file_get_contents($telegramWebhookUrl, false, $context);
}

if (!$mailSent) {
    jsonResponse(false, 'Заявка не отправлена. Позвоните мастеру по телефону.', 500);
}

jsonResponse(true, 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.');
