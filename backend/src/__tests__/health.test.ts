// backend/src/__tests__/health.test.ts
//
// Test minimal pour valider que l'app Express repond.
// Necessite : npm install -D vitest supertest @types/supertest
//
// Si ton app Express est exportee ailleurs (ex: server.ts, app.ts),
// adapte le chemin d'import ci-dessous.

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app'; 
describe('GET /health', () => {
  it('repond 200 avec un statut ok', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
  });
});