/**
 * Teste de integrare API – auth, promotions
 * Necesită PostgreSQL pornit și .env configurat.
 */
const request = require('supertest');
const app = require('../app');

describe('API', () => {
  describe('GET /api/health', () => {
    it('răspunde 200', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/auth/login', () => {
    it('fără body returnează 400 sau 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      expect([400, 401]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });

    it('cu telefon inexistent sau parolă invalidă returnează 401 sau 404', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ telefon: '069999999', parola: 'wrong' });
      expect([401, 404]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/promotions', () => {
    it('returnează 200 și array', async () => {
      const res = await request(app).get('/api/promotions');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/promotions?home=1 returnează 200 și array', async () => {
      const res = await request(app).get('/api/promotions?home=1');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/users/:id', () => {
    it('fără token returnează 401', async () => {
      const res = await request(app).get('/api/users/1');
      expect(res.status).toBe(401);
    });
  });
});
