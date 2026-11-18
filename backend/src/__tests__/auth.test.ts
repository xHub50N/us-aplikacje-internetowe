import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { prisma } from '../lib/prisma.js';

describe('Auth API Integration Tests', () => {
  const testEmail = `test-user-${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  let accessToken: string;
  let refreshToken: string;

  afterAll(async () => {
    // Usunięcie danych testowych
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'test-user-' } },
    });
  });

  it('POST /api/auth/register - rejestruje nowego użytkownika i zwraca tokeny', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jan Testowy',
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toMatchObject({
      name: 'Jan Testowy',
      email: testEmail,
    });

    accessToken = res.body.token;
    refreshToken = res.body.refreshToken;
  });

  it('POST /api/auth/register - odrzuca duplikat adresu e-mail', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Inny Jan',
        email: testEmail,
        password: 'OtherPassword123!',
      });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/auth/login - poprawnie loguje użytkownika', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe(testEmail);
  });

  it('POST /api/auth/login - odrzuca błędne hasło', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'ZleHaslo123!',
      });

    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me - zwraca dane zalogowanego użytkownika', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.name).toBe('Jan Testowy');
  });

  it('GET /api/auth/me - zwraca 401 przy braku nagłówka Authorization', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/refresh - odświeża token dostępowy', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });

  it('POST /api/auth/logout - unieważnia refreshToken', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken });

    expect(res.status).toBe(200);
  });
});
