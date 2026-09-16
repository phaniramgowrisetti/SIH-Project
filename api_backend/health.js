export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'SamadhanSetu API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    providers: {
      llm: process.env.AI_LLM_PROVIDER || 'groq',
      embeddings: 'transformers.js (local)',
      database: 'supabase',
    },
  });
}
