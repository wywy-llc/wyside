import { serve } from '@hono/node-server';
import { config } from 'dotenv';
import app from './api.js';

// Load environment variables
config();

const port = Number(process.env.PORT) || 3000;

console.log(`🚀 Starting Hono development server...`);
console.log(`📍 Server running on http://localhost:${port}`);
console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('');
console.log('Available endpoints:');
console.log(`  GET    /health`);
console.log(`  GET    /api/todos`);
console.log(`  POST   /api/todos`);
console.log(`  PUT    /api/todos/:id`);
console.log(`  DELETE /api/todos/:id`);
console.log('');

serve({
  fetch: app.fetch,
  port,
});
