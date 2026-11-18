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

  it('PATCH /api/auth/profile - aktualizuje nazwę oraz awatar użytkownika', async () => {
    const newAvatar = 'https://example.com/avatar.png';
    const res = await request(app)
      .patch('/api/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Jan Zaktualizowany',
        avatarUrl: newAvatar,
      });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Jan Zaktualizowany');
    expect(res.body.user.avatarUrl).toBe(newAvatar);
  });

  it('PUT /api/auth/change-password - odrzuca zmianę hasła przy błędnym obecnym haśle (401)', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'WrongPassword!',
        newPassword: 'BrandNewPassword123!',
      });

    expect(res.status).toBe(401);
  });

  it('PUT /api/auth/change-password - pomyślnie zmienia hasło użytkownika', async () => {
    const res = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: testPassword,
        newPassword: 'BrandNewPassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password changed successfully');

    // Weryfikacja logowania nowym hasłem
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'BrandNewPassword123!',
      });

    expect(loginRes.status).toBe(200);
  });

  it('POST /api/auth/logout - unieważnia refreshToken', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken });

    expect(res.status).toBe(200);
  });
});
