import request from 'supertest';
import { app } from '../server/index';

describe('API: /api/agents', () => {
  it('should return 200 and a list of agents', async () => {
    const res = await request(app).get('/api/agents');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
