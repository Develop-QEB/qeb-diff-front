import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// En dev local: si VITE_API_URL esta vacio, el proxy redirige /api -> localhost:3100.
// En prod (Vercel): VITE_API_URL apunta al back absoluto y el api.ts hace fetch directo.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const hasAbsoluteApi = Boolean(env.VITE_API_URL);
  return {
    plugins: [react()],
    server: {
      port: 5174,
      proxy: hasAbsoluteApi
        ? undefined
        : {
            '/api': 'http://localhost:3100',
          },
    },
  };
});
