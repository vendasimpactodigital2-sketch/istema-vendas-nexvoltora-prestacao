import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://zouhxmhjwnprmphhnxzs.supabase.co';

  // Use the full valid key: VITE_SUPABASE_ANON_KEY contains 'sb_publishable_CGlCehfEI8l4myXL5jcURg_sV0xEDay'
  let supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (supabaseAnonKey.trim() === 'sb_publishable_CGlCehfEI8l4myXL5jcURg_sV0xE') {
    supabaseAnonKey = 'sb_publishable_CGlCehfEI8l4myXL5jcURg_sV0xEDay';
  }
  if (!supabaseAnonKey || supabaseAnonKey.length < 20) {
    supabaseAnonKey = 'sb_publishable_CGlCehfEI8l4myXL5jcURg_sV0xEDay';
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
