# Architecture

```text
Angular SPA
   |
 HTTPS
   |
Reverse Proxy / WAF
   |
NestJS modular monolith
   |---------------- Email provider
   |---------------- Geocoding provider
   |
Local MySQL 8 (no Docker)
```

Backend authorization is authoritative. Angular route guards exist only as a UI navigation control.
Donor search and distance calculations belong in MySQL (Haversine formula over indexed latitude/longitude columns), not the browser.
Public donor projections must never contain mobile, email, exact address or exact coordinates.
