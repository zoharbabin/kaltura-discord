import { defineConfig, loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode (development, production)
  const env = loadEnv(mode, '../../', '');
  
  console.log(`Building for ${mode} environment`);
  
  return {
    envDir: '../../',
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
      hmr: {
        clientPort: 443,
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.PUBLIC_URL': JSON.stringify(env.PUBLIC_URL || 'http://localhost:3000'),
      'process.env.DISCORD_ACTIVITY_URL': JSON.stringify(env.DISCORD_ACTIVITY_URL || 'https://discord.com/activities'),
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
    },
  };
});