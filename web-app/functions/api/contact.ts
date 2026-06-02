import type { EventContext, KVNamespace } from '@cloudflare/workers-types';
import { z } from 'zod';

interface Env {
  RATE_LIMIT: KVNamespace;
  CF_EMAIL_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
}

const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  phone: z.string().optional(),
  service: z.string().optional(),
  message: z.string().min(1),
});

const MAX_BODY_BYTES = 100 * 1024; // 100 KB
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_TTL = 60; // seconds

function json(
  data: unknown,
  status: number,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

// Isolated so the beta Email Service contract lives in one place (ADR-03).
// Returns null on success, or an Error to log on failure.
async function sendContactEmail(
  env: Env,
  fields: {
    name: string;
    email: string;
    phone?: string;
    service?: string;
    message: string;
  },
): Promise<Error | null> {
  if (!env.CF_EMAIL_API_TOKEN || !env.CF_ACCOUNT_ID) {
    return new Error('CF_EMAIL_API_TOKEN or CF_ACCOUNT_ID is not set');
  }

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const lines: string[] = [
    `Name: ${fields.name}`,
    `Email: ${fields.email}`,
    fields.phone ? `Phone: ${fields.phone}` : null,
    fields.service ? `Service: ${fields.service}` : null,
    '',
    'Message:',
    fields.message,
  ].filter((line): line is string => line !== null);

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/email/sending/send`;

  // Flat body per the live REST reference (not personalizations[]).
  // Both text and html are sent as a fail-safe since the beta docs lead with html.
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CF_EMAIL_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'john@awsome.co.nz',
      to: 'john@awsome.co.nz',
      subject: `${fields.name} via awsome.co.nz`,
      text: lines.join('\n'),
      html: `<pre>${lines.map(esc).join('<br>')}</pre>`,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '<no body>');
    return new Error(`Email Service responded ${res.status}: ${detail}`);
  }
  return null;
}

export const onRequestPost = async (
  context: EventContext<Env, string, Record<string, unknown>>,
): Promise<Response> => {
  const { request, env } = context;

  // 100 KB body size cap — check Content-Length header first (fast path)
  const contentLength = request.headers.get('Content-Length');
  if (contentLength !== null && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return json(
      {
        ok: false,
        error: 'validation',
        issues: [{ field: 'unknown', message: 'Request body too large' }],
      },
      422,
    );
  }

  // Read body with rolling size cap
  let bodyText: string;
  try {
    const reader = request.body?.getReader();
    if (!reader) {
      return json(
        {
          ok: false,
          error: 'validation',
          issues: [{ field: 'unknown', message: 'Missing request body' }],
        },
        422,
      );
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        reader.cancel();
        return json(
          {
            ok: false,
            error: 'validation',
            issues: [{ field: 'unknown', message: 'Request body too large' }],
          },
          422,
        );
      }
      chunks.push(value);
    }

    const combined = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    bodyText = new TextDecoder().decode(combined);
  } catch {
    return json(
      {
        ok: false,
        error: 'validation',
        issues: [{ field: 'unknown', message: 'Failed to read request body' }],
      },
      422,
    );
  }

  // Parse JSON body
  let rawBody: unknown;
  try {
    rawBody = JSON.parse(bodyText);
  } catch {
    return json(
      {
        ok: false,
        error: 'validation',
        issues: [{ field: 'unknown', message: 'Invalid JSON' }],
      },
      422,
    );
  }

  // Zod validation
  const parsed = ContactSchema.safeParse(rawBody);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      field: String(issue.path[0] ?? 'unknown'),
      message: issue.message,
    }));
    return json({ ok: false, error: 'validation', issues }, 422);
  }

  const { name, email, phone, service, message } = parsed.data;

  // KV rate-limit: key = ip:<CF-Connecting-IP>
  // Best-effort only — KV read-modify-write is not atomic; concurrent bursts may
  // briefly exceed the limit across edge colos (accepted trade-off per ADR-02).
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const kvKey = `ip:${ip}`;

  const countStr = await env.RATE_LIMIT.get(kvKey);
  const count = countStr !== null ? parseInt(countStr, 10) : 0;

  if (count >= RATE_LIMIT_MAX) {
    return json({ ok: false, error: 'rate_limit' }, 429, {
      'Retry-After': String(RATE_LIMIT_TTL),
    });
  }

  // Send email via Cloudflare Email Service — increment the counter only on
  // success so that send failures do not consume the user's rate-limit allowance.
  const sendError = await sendContactEmail(env, {
    name,
    email,
    phone,
    service,
    message,
  });
  if (sendError) {
    console.error('contact: email send failed', sendError);
    return json({ ok: false, error: 'send_failed' }, 500);
  }

  await env.RATE_LIMIT.put(kvKey, String(count + 1), {
    expirationTtl: RATE_LIMIT_TTL,
  });

  return json({ ok: true }, 200);
};
