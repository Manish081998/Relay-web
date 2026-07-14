/**
 * Minimal MIME/EML parser. Handles the most common email formats:
 *  - text/plain and text/html single-part
 *  - multipart/alternative and multipart/mixed
 *  - base64 and quoted-printable transfer encoding
 */

export interface ParsedEmail {
  subject: string;
  from: string;
  to: string;
  date: string;
  html: string;
}

export function parseEml(raw: string): ParsedEmail {
  const [headerBlock, ...rest] = raw.split(/\r?\n\r?\n/);
  const bodyRaw = rest.join('\n\n');
  const headers = parseHeaders(headerBlock ?? '');

  const contentType = headers['content-type'] ?? 'text/plain';
  const html = extractBody(bodyRaw, contentType);

  return {
    subject: decodeHeader(headers['subject'] ?? '(No subject)'),
    from:    decodeHeader(headers['from'] ?? ''),
    to:      decodeHeader(headers['to'] ?? ''),
    date:    headers['date'] ?? '',
    html,
  };
}

// ── Header parsing ────────────────────────────────────────────────────────────

function parseHeaders(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Unfold multi-line headers
  const unfolded = block.replace(/\r?\n\s+/g, ' ');
  for (const line of unfolded.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const val = line.slice(colon + 1).trim();
    out[key] = val;
  }
  return out;
}

// RFC 2047 encoded-word decoder: =?charset?encoding?text?=
function decodeHeader(value: string): string {
  return value.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, enc, text) => {
    try {
      const bytes = enc.toUpperCase() === 'B'
        ? Uint8Array.from(atob(text), c => c.charCodeAt(0))
        : quotedPrintableToBytes(text.replace(/_/g, ' '));
      return new TextDecoder(charset).decode(bytes);
    } catch { return text; }
  });
}

// ── Body extraction ───────────────────────────────────────────────────────────

function extractBody(body: string, contentTypeHeader: string): string {
  const ct = contentTypeHeader.toLowerCase();

  if (ct.includes('multipart/')) {
    const boundary = extractParam(contentTypeHeader, 'boundary');
    if (boundary) return extractMultipart(body, boundary);
  }

  if (ct.includes('text/html')) return decodeBodyPart(body, extractParam(contentTypeHeader, 'charset'), extractTransferEncoding(''));
  if (ct.includes('text/plain')) return `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(decodePart(body, ''))}</pre>`;

  return `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(body.slice(0, 2000))}</pre>`;
}

function extractMultipart(body: string, boundary: string): string {
  const delimiter = '--' + boundary;
  const parts = body.split(new RegExp(`--${escapeRegex(boundary)}(?:--)?`));
  let htmlPart = '';
  let textPart = '';

  for (const part of parts) {
    if (!part.trim() || part.trim() === '--') continue;
    const [partHeaderBlock, ...partBodyParts] = part.split(/\r?\n\r?\n/);
    const partBody = partBodyParts.join('\n\n');
    const partHeaders = parseHeaders(partHeaderBlock ?? '');
    const partCt = partHeaders['content-type'] ?? 'text/plain';
    const enc = partHeaders['content-transfer-encoding'] ?? '';
    const charset = extractParam(partCt, 'charset') ?? 'utf-8';

    if (partCt.toLowerCase().includes('multipart/')) {
      const innerBoundary = extractParam(partCt, 'boundary');
      if (innerBoundary) {
        const inner = extractMultipart(partBody, innerBoundary);
        if (inner) htmlPart = inner;
      }
    } else if (partCt.toLowerCase().includes('text/html')) {
      htmlPart = decodeBodyPart(partBody, charset, enc);
    } else if (partCt.toLowerCase().includes('text/plain') && !htmlPart) {
      textPart = `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(decodePart(partBody, enc))}</pre>`;
    }
  }

  return htmlPart || textPart || '<p>(Empty email body)</p>';
  void delimiter; // boundary used above via regex
}

// ── Transfer encoding ─────────────────────────────────────────────────────────

function decodePart(body: string, encoding: string): string {
  const enc = encoding.toLowerCase().trim();
  if (enc === 'base64') {
    try { return atob(body.replace(/\s/g, '')); } catch { return body; }
  }
  if (enc === 'quoted-printable') return decodeQuotedPrintable(body);
  return body;
}

function decodeBodyPart(body: string, charset = 'utf-8', encoding = ''): string {
  const enc = encoding.toLowerCase().trim();
  if (enc === 'base64') {
    try {
      const bytes = Uint8Array.from(atob(body.replace(/\s/g, '')), c => c.charCodeAt(0));
      return new TextDecoder(charset || 'utf-8').decode(bytes);
    } catch { return body; }
  }
  if (enc === 'quoted-printable') return decodeQuotedPrintable(body);
  return body;
}

function decodeQuotedPrintable(s: string): string {
  return s
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function quotedPrintableToBytes(s: string): Uint8Array {
  const decoded = decodeQuotedPrintable(s);
  return Uint8Array.from(decoded, c => c.charCodeAt(0));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractParam(header: string, param: string): string {
  const re = new RegExp(`${param}\\s*=\\s*["']?([^"';\\s,]+)["']?`, 'i');
  return header.match(re)?.[1] ?? '';
}

function extractTransferEncoding(headers: string): string {
  return headers.match(/content-transfer-encoding\s*:\s*(\S+)/i)?.[1] ?? '';
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
