# Threat model baseline

- Account enumeration: generic password-reset and authentication responses where required.
- Brute force: distributed rate limiting and failed-login security events.
- Token theft: short access-token lifetime; refresh token in Secure HttpOnly SameSite cookie.
- Refresh replay: hash tokens, rotate tokens, use token families, revoke family on reuse.
- CSRF: SameSite cookies plus explicit CSRF protection for state-changing cookie-authenticated endpoints.
- XSS: Angular escaping, CSP, avoid unsafe HTML.
- IDOR: backend ownership/role authorization on every resource.
- PII leakage: explicit response DTOs and select/projection queries.
- Location privacy: never expose raw donor coordinates publicly.
- Admin escalation: backend RBAC guards + audit logging.
