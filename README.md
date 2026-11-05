# qeb-diff-front

Frontend del dashboard `qeb-diff`. React 18 + Vite + TypeScript + Tailwind + Phosphor icons. Deploy en Vercel.

El back vive en el repo `qeb-diff-back` (deploy en el VPS de QEB).

Documentación del sistema de diseño en `DESIGN.md`.

---

## Setup local

Requiere Node 20+ y el back corriendo en `http://localhost:3100`.

```bash
# .env es opcional en dev local: si VITE_API_URL queda vacio, el proxy de Vite
# redirige /api -> http://localhost:3100 (ver vite.config.ts).
cp .env.example .env   # opcional

npm install
npm run dev   # http://localhost:5174
```

Password de login en dev: la que tengas en el `.env` del back (`AUTH_PASSWORD`).

---

## Deploy en Vercel

1. En Vercel: **Add New Project** → importa `Develop-QEB/qeb-diff-front`.
2. Framework: **Vite** (autodetectado).
3. Build command: `npm run build`. Output dir: `dist`.
4. **Environment Variables**:
   - `VITE_API_URL` = URL absoluta del back (ej. `https://diff-api.qeb.mx`). HTTPS obligatorio.
5. Deploy.

Cada push a `main` dispara un deploy automático.

### Custom domain

En Project Settings → Domains agrega el subdominio que uses (ej. `diff.qeb.mx`). Asegúrate que el back tenga ese dominio en su `CORS_ORIGIN`.

---

## Qué necesita del back

- Que exponga `/api/health`, `/api/auth/*`, `/api/branches/*`, `/api/schema/*`, `/api/anomalies/*`, `/api/ignored`, `/api/diagnostico/*`.
- `CORS_ORIGIN` del back debe incluir el dominio del front (ej. `https://qeb-diff.vercel.app` y/o el custom domain).
- HTTPS en el back (porque el front en Vercel va por HTTPS).

---

## Qué NO va al repo

- `.env` (si pones VITE_API_URL ahí para probar contra prod)
- `node_modules/`, `dist/`

Ya están en `.gitignore`.
