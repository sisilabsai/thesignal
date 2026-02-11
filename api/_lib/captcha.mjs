const SECRET = process.env.HCAPTCHA_SECRET || '';

export function captchaRequired() {
  return Boolean(SECRET);
}

export async function verifyCaptcha(token, remoteip) {
  if (!SECRET) return { ok: true, skipped: true };
  if (!token) return { ok: false, error: 'Missing captcha' };

  try {
    const params = new URLSearchParams();
    params.set('secret', SECRET);
    params.set('response', token);
    if (remoteip) params.set('remoteip', remoteip);

    const res = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await res.json();
    if (!data.success) {
      return { ok: false, error: 'Captcha failed' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Captcha failed' };
  }
}
