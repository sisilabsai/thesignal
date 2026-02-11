const SECRET = process.env.HCAPTCHA_SECRET || '';
const FAIL_OPEN = /^(true|1|yes)$/i.test(process.env.HCAPTCHA_FAIL_OPEN || '');

export function captchaRequired() {
  return Boolean(SECRET);
}

export async function verifyCaptcha(token, remoteip, fallback) {
  if (!SECRET) return { ok: true, skipped: true };
  if (!token && FAIL_OPEN && fallback) return { ok: true, fallback: true };

  try {
    const params = new URLSearchParams();
    params.set('secret', SECRET);
    params.set('response', token || '');
    if (remoteip) params.set('remoteip', remoteip);

    const res = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await res.json();
    if (!data.success) return { ok: false, error: 'Captcha failed' };
    return { ok: true };
  } catch {
    return { ok: true, fallback: true };
  }
}
