function handler() {
  return Response.json(
    { recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export default { fetch: handler };
