const { default: app } = await import('../dist/index.js').catch((err) => {
  console.error('Failed to load server:', err);
  return { default: null };
});

export default function handler(req, res) {
  if (!app) {
    res.status(500).json({ error: 'Server failed to load' });
    return;
  }
  app(req, res);
}
