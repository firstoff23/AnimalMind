import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Importar o servidor Express do build
const { default: app } = await import('../dist/index.js').catch(() => {
  console.error('Failed to load server');
  return { default: null };
});

if (!app) {
  throw new Error('Server failed to load');
}

export default app;
