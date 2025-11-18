# Security Headers Configuration Guide

This guide provides recommended security headers for the DeFiTuna Analytics frontend application.

## Overview

Security headers help protect against common web vulnerabilities by instructing browsers on how to handle content. Since Docusaurus is a static site generator with limited built-in security header support, these headers must be configured at the hosting or reverse proxy level.

## Recommended Headers

### 1. Content Security Policy (CSP)

Restricts which resources can be loaded and from where, preventing XSS and data injection attacks.

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://karstenalytics.goatcounter.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://karstenalytics.goatcounter.com; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

**Explanation:**
- `default-src 'self'` - Only load resources from same origin by default
- `script-src 'self' 'unsafe-inline' https://karstenalytics.goatcounter.com` - Allow scripts from self, inline scripts (required by Docusaurus), and GoatCounter analytics
- `style-src 'self' 'unsafe-inline'` - Allow styles from self and inline styles (required by Docusaurus and Plotly)
- `img-src 'self' data: https:` - Allow images from self, data URIs, and any HTTPS source
- `connect-src 'self' https://karstenalytics.goatcounter.com` - Allow AJAX/fetch to self and GoatCounter
- `font-src 'self' data:` - Allow fonts from self and data URIs
- `frame-ancestors 'none'` - Prevent embedding in iframes (clickjacking protection)
- `base-uri 'self'` - Restrict `<base>` tag URLs to same origin
- `form-action 'self'` - Restrict form submissions to same origin

**Note:** `unsafe-inline` is required for Docusaurus and Plotly.js to function. For stricter security, consider implementing nonces or hashes (requires build process modifications).

### 2. X-Frame-Options

Prevents the site from being embedded in iframes (clickjacking protection).

```
X-Frame-Options: DENY
```

**Alternatives:**
- `DENY` - Never allow framing (recommended)
- `SAMEORIGIN` - Allow framing only from same origin

### 3. X-Content-Type-Options

Prevents MIME-sniffing attacks by forcing browsers to respect declared content types.

```
X-Content-Type-Options: nosniff
```

### 4. Referrer-Policy

Controls how much referrer information is sent with requests.

```
Referrer-Policy: strict-origin-when-cross-origin
```

**Explanation:**
- Sends full URL when navigating within same origin
- Sends only origin when navigating cross-origin over HTTPS
- Sends nothing when downgrading from HTTPS to HTTP

### 5. Permissions-Policy

Controls which browser features and APIs can be used.

```
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()
```

**Explanation:**
- Disables access to sensitive device features not needed by the application
- `()` means the feature is disabled for all origins

### 6. Strict-Transport-Security (HSTS)

Forces browsers to only connect via HTTPS (if site is served over HTTPS).

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Explanation:**
- `max-age=31536000` - Remember for 1 year (365 days)
- `includeSubDomains` - Apply to all subdomains
- `preload` - Allow inclusion in browser HSTS preload lists

**Important:** Only enable HSTS after confirming HTTPS works correctly. Once enabled, it cannot be easily disabled.

### 7. X-XSS-Protection

Legacy header for older browsers (modern browsers use CSP instead).

```
X-XSS-Protection: 1; mode=block
```

**Note:** This header is deprecated in favor of CSP, but still useful for older browser support.

---

## Implementation by Hosting Provider

### Netlify

Create a `_headers` file in the `static/` directory:

```
# static/_headers

/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://karstenalytics.goatcounter.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://karstenalytics.goatcounter.com; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()
  X-XSS-Protection: 1; mode=block

# Only add HSTS after confirming HTTPS works:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Deployment:**
- Headers will be automatically applied on next deployment
- Verify at: https://securityheaders.com/

### Vercel

Create a `vercel.json` file in the project root:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://karstenalytics.goatcounter.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://karstenalytics.goatcounter.com; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

**Deployment:**
- Commit `vercel.json` to repository
- Headers will be applied on next deployment

### Cloudflare Pages

Create a `_headers` file in the `static/` directory (same format as Netlify):

```
# static/_headers

/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://karstenalytics.goatcounter.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://karstenalytics.goatcounter.com; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()
  X-XSS-Protection: 1; mode=block
```

Alternatively, configure via Cloudflare dashboard:
1. Go to **Rules** → **Transform Rules** → **Modify Response Header**
2. Add rules for each security header

### Nginx (Self-Hosted)

Add to your nginx server block configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # ... SSL configuration ...

    # Security Headers
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://karstenalytics.goatcounter.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://karstenalytics.goatcounter.com; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # ... rest of configuration ...
}
```

**Deployment:**
- Test configuration: `nginx -t`
- Reload nginx: `systemctl reload nginx`

### Apache (Self-Hosted)

Add to your `.htaccess` file or Apache configuration:

```apache
<IfModule mod_headers.c>
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://karstenalytics.goatcounter.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://karstenalytics.goatcounter.com; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
</IfModule>
```

**Deployment:**
- Ensure `mod_headers` is enabled: `a2enmod headers`
- Reload Apache: `systemctl reload apache2`

---

## Testing Security Headers

After implementing security headers, verify they're working:

### 1. Browser DevTools

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Load the page
4. Click on the document request
5. Check **Response Headers** section
6. Verify all security headers are present

### 2. Online Security Header Scanners

- **Security Headers**: https://securityheaders.com/
  - Enter your domain
  - Provides grade (A+ to F) and recommendations

- **Mozilla Observatory**: https://observatory.mozilla.org/
  - Comprehensive security scan
  - Checks headers, TLS, and more

- **SSL Labs**: https://www.ssllabs.com/ssltest/
  - HTTPS/TLS configuration analysis

### 3. Command Line (curl)

```bash
curl -I https://your-domain.com
```

Look for the security headers in the response.

---

## CSP Violation Reporting

To monitor CSP violations, add a `report-uri` or `report-to` directive:

```
Content-Security-Policy: ... ; report-uri https://your-reporting-endpoint.com/csp-report
```

Popular CSP reporting services:
- **Report URI**: https://report-uri.com/ (free tier available)
- **Sentry**: https://sentry.io/ (includes CSP reporting)
- **Custom endpoint**: Implement your own logging endpoint

**Example with reporting:**
```
Content-Security-Policy: default-src 'self'; ... ; report-uri https://your-domain.report-uri.com/r/d/csp/enforce
```

---

## Troubleshooting

### Issue: Site Breaks After Adding CSP

**Solution:**
1. Check browser console for CSP violation errors
2. Identify blocked resources
3. Add legitimate sources to CSP whitelist
4. Test incrementally (start with `report-only` mode)

**CSP Report-Only Mode** (for testing):
```
Content-Security-Policy-Report-Only: default-src 'self'; ...
```
- Logs violations without blocking
- Safe for production testing

### Issue: Plotly Charts Not Rendering

**Cause:** Plotly requires inline styles and scripts.

**Solution:** Ensure CSP includes:
```
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
```

### Issue: HSTS Breaks Site Access

**Prevention:**
- Test HTTPS thoroughly before enabling HSTS
- Start with short `max-age` (e.g., 300 seconds)
- Gradually increase after confirming stability

**Recovery (if needed):**
1. Fix HTTPS configuration
2. Wait for `max-age` to expire
3. Or clear HSTS in browser (Chrome: chrome://net-internals/#hsts)

---

## References

- **OWASP Security Headers**: https://owasp.org/www-project-secure-headers/
- **MDN Web Security**: https://developer.mozilla.org/en-US/docs/Web/Security
- **CSP Reference**: https://content-security-policy.com/
- **Docusaurus Deployment**: https://docusaurus.io/docs/deployment

---

## Implementation Checklist

- [ ] Choose hosting provider configuration method
- [ ] Create appropriate configuration file (`_headers`, `vercel.json`, etc.)
- [ ] Add all recommended security headers
- [ ] Deploy to staging/preview environment
- [ ] Test site functionality (especially Plotly charts and analytics)
- [ ] Check browser console for CSP violations
- [ ] Verify headers with online scanner (securityheaders.com)
- [ ] Fix any issues found during testing
- [ ] Deploy to production
- [ ] Monitor for CSP violations (if reporting enabled)
- [ ] After 1 week of stable HTTPS: Add HSTS with short max-age
- [ ] After 1 month: Increase HSTS max-age to 31536000
- [ ] Consider HSTS preload submission: https://hstspreload.org/

---

**Last Updated:** 2025-11-13
**Related:** `SECURITY_AUDIT_2025-11-13.md`, `REMEDIATION_STATUS.md`
