import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const serverUrl = process.env.VITE_SERVER || env.VITE_SERVER;

  if (mode === "production") {
    if (!serverUrl) {
      throw new Error("VITE_SERVER is required for production builds.");
    }

    const apiUrl = new URL(serverUrl);
    if (apiUrl.protocol !== "https:" || ["localhost", "127.0.0.1", "0.0.0.0"].includes(apiUrl.hostname)) {
      throw new Error("Production VITE_SERVER must be an HTTPS URL and cannot point to localhost.");
    }
  }

  return {
    plugins: [react()],
    preview: {
      allowedHosts: ['chatto-app.onrender.com'],
    },
  };
});
