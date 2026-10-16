// Cloudflare Worker: serves the built SPA (via the ASSETS binding), handles
// /api/feedback, and sends the yearly calendar reminder on a cron trigger.
// Replaces the former Supabase edge functions (send-feedback, calendar-reminder).

export interface Env {
  ASSETS: Fetcher;
  TURNSTILE_SECRET_KEY: string;
  DISCORD_WEBHOOK_SUGGESTIONS: string;
  DISCORD_WEBHOOK_BUGS: string;
  DISCORD_WEBHOOK_FEEDBACK: string;
  DISCORD_WEBHOOK_URL: string;
}

type FeedbackType = 'suggestion' | 'bug' | 'feedback';

interface FeedbackRequest {
  type: FeedbackType;
  message: string;
  email?: string;
  turnstileToken: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Verify Cloudflare Turnstile token
async function verifyTurnstile(secretKey: string | undefined, token: string, ip: string): Promise<boolean> {
  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: secretKey, response: token, remoteip: ip }),
    });

    const result = await response.json<{ success?: boolean }>();
    return result.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

// Simple in-memory rate limiter (per isolate, so best-effort; Turnstile is the real gate)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  record.count++;
  return false;
}

// Remove control characters and normalize whitespace
function normalizeInput(text: string): string {
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control chars
    .replace(/[​-‍﻿]/g, '') // Remove zero-width chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Sanitize text to prevent Discord markdown injection
function sanitizeForDiscord(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/\|/g, '\\|')
    .replace(/@/g, '＠') // Replace @ to prevent mentions
    .replace(/<#/g, '<＃') // Prevent channel mentions
    .replace(/<:/g, '<：'); // Prevent custom emoji injection
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

const typeEmoji: Record<FeedbackType, string> = { suggestion: '💡', bug: '🐛', feedback: '💬' };
const typeColor: Record<FeedbackType, number> = { suggestion: 0x22c55e, bug: 0xef4444, feedback: 0x3b82f6 };

async function handleFeedback(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';

  if (isRateLimited(clientIp)) {
    return json({ error: 'rate_limited', message: 'Too many requests. Please try again later.' }, 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (typeof body !== 'object' || body === null) {
    return json({ error: 'Invalid request body' }, 400);
  }

  const { type, message, email, turnstileToken } = body as FeedbackRequest;

  if (!turnstileToken || typeof turnstileToken !== 'string') {
    return json({ error: 'CAPTCHA verification required' }, 400);
  }

  if (!(await verifyTurnstile(env.TURNSTILE_SECRET_KEY, turnstileToken, clientIp))) {
    return json({ error: 'CAPTCHA verification failed. Please try again.' }, 400);
  }

  if (!type || !['suggestion', 'bug', 'feedback'].includes(type)) {
    return json({ error: 'Invalid feedback type. Must be one of: suggestion, bug, feedback' }, 400);
  }

  if (!message || typeof message !== 'string') {
    return json({ error: 'Message is required and must be a string' }, 400);
  }

  const normalizedMessage = normalizeInput(message);
  if (normalizedMessage.length < 10 || normalizedMessage.length > 2000) {
    return json({ error: 'Message must be between 10 and 2000 characters' }, 400);
  }

  if (email !== undefined && email !== null && email !== '') {
    if (typeof email !== 'string' || !isValidEmail(email)) {
      return json({ error: 'Invalid email format' }, 400);
    }
  }

  const webhookMap: Record<FeedbackType, string | undefined> = {
    suggestion: env.DISCORD_WEBHOOK_SUGGESTIONS,
    bug: env.DISCORD_WEBHOOK_BUGS,
    feedback: env.DISCORD_WEBHOOK_FEEDBACK,
  };

  const discordWebhookUrl = webhookMap[type];
  if (!discordWebhookUrl) {
    console.error(`Webhook not configured for type: ${type}`);
    return json({ error: 'Service temporarily unavailable' }, 503);
  }

  const sanitizedMessage = sanitizeForDiscord(normalizedMessage);
  const sanitizedEmail = email ? sanitizeForDiscord(normalizeInput(email)) : null;

  const discordMessage = {
    embeds: [{
      title: `${typeEmoji[type]} New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      description: sanitizedMessage.slice(0, 2000),
      color: typeColor[type],
      fields: sanitizedEmail ? [{ name: '📧 Contact Email', value: sanitizedEmail, inline: false }] : [],
      footer: { text: 'TopperBus Feedback' },
      timestamp: new Date().toISOString(),
    }],
  };

  const discordResponse = await fetch(discordWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(discordMessage),
  });

  if (!discordResponse.ok) {
    console.error('Discord webhook error:', await discordResponse.text());
    return json({ error: 'Failed to submit feedback. Please try again later.' }, 502);
  }

  return json({ success: true });
}

async function sendCalendarReminder(env: Env): Promise<void> {
  if (!env.DISCORD_WEBHOOK_URL) {
    console.error('DISCORD_WEBHOOK_URL not configured');
    return;
  }

  const currentYear = new Date().getFullYear();

  const message = {
    embeds: [{
      title: '🚌 WKU Bus Calendar Update Reminder',
      description: `**Happy New Year ${currentYear}!**\n\nTime to update the WKU transit academic calendar dates.`,
      color: 0xc62828,
      fields: [
        {
          name: '📅 Calendar Source',
          value: '[WKU Academic Calendar](https://www.wku.edu/registrar/academic_calendars/)',
          inline: false,
        },
        { name: '📝 File to Update', value: '`src/lib/academicCalendar.ts`', inline: false },
      ],
      footer: { text: 'TopperBus' },
      timestamp: new Date().toISOString(),
    }],
  };

  const discordResponse = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  if (!discordResponse.ok) {
    throw new Error(`Discord API error: ${await discordResponse.text()}`);
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/feedback') {
        return await handleFeedback(request, env);
      }
      if (url.pathname.startsWith('/api/')) {
        return json({ error: 'Not found' }, 404);
      }
    } catch (error) {
      console.error('Unhandled API error:', error);
      return json({ error: 'An unexpected error occurred' }, 500);
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller, env, ctx): Promise<void> {
    ctx.waitUntil(sendCalendarReminder(env));
  },
} satisfies ExportedHandler<Env>;
