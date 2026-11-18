import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { prisma } from '../lib/prisma.js';

describe('Projects API Integration Tests', () => {
  let ownerToken: string;
  let ownerUser: { id: number; email: string };
  let memberToken: string;
  let memberUser: { id: number; email: string };
  let viewerUser: { id: number; email: string };

  let testProjectId: number;

  beforeAll(async () => {
    // Rejestracja właściciela
    const ownerRes = await request(app).post('/api/auth/register').send({
      name: 'Owner User',
      email: `owner-${Date.now()}@example.com`,
      password: 'Password123!',
    });
    ownerToken = ownerRes.body.token;
    ownerUser = ownerRes.body.user;

    // Rejestracja członka
    const memberRes = await request(app).post('/api/auth/register').send({
      name: 'Member User',
      email: `member-${Date.now()}@example.com`,
      password: 'Password123!',
    });
    memberToken = memberRes.body.token;
    memberUser = memberRes.body.user;

    // Rejestracja widza (VIEWER)
    const viewerRes = await request(app).post('/api/auth/register').send({
      name: 'Viewer User',
      email: `viewer-${Date.now()}@example.com`,
      password: 'Password123!',
    });
    viewerUser = viewerRes.body.user;
  });

  afterAll(async () => {
    if (testProjectId) {
      await prisma.project.deleteMany({ where: { id: testProjectId } });
    }
    await prisma.user.deleteMany({
      where: {
        id: { in: [ownerUser?.id, memberUser?.id, viewerUser?.id].filter(Boolean) as number[] },
      },
    });
  });

  it('POST /api/projects - tworzy nowy projekt i dodaje twórcę jako OWNER', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Projekt Testowy Vitest',
        description: 'Opis projektu do testów integracyjnych',
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Projekt Testowy Vitest');
    expect(res.body.userId).toBe(ownerUser.id);
    expect(res.body.members).toHaveLength(1);
    expect(res.body.members[0].role).toBe('OWNER');

    testProjectId = res.body.id;
  });

  it('GET /api/projects - zwraca listę projektów użytkownika', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((p: any) => p.id === testProjectId)).toBe(true);
  });

  it('GET /api/projects/:id - zwraca szczegóły projektu dla członka/właściciela', async () => {
    const res = await request(app)
      .get(`/api/projects/${testProjectId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(testProjectId);
    expect(res.body.name).toBe('Projekt Testowy Vitest');
  });

  it('PUT /api/projects/:id - właściciel może zaktualizować dane projektu', async () => {
    const res = await request(app)
      .put(`/api/projects/${testProjectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Zaktualizowany Projekt Vitest',
        description: 'Nowy opis projektu',
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Zaktualizowany Projekt Vitest');
  });

  it('POST /api/projects/:id/members - właściciel może zaprosić członka z rolą MEMBER', async () => {
    const res = await request(app)
      .post(`/api/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: memberUser.email,
        role: 'MEMBER',
      });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('MEMBER');
    expect(res.body.userId).toBe(memberUser.id);
  });

  it('POST /api/projects/:id/members - właściciel może zaprosić członka z rolą VIEWER', async () => {
    const res = await request(app)
      .post(`/api/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: viewerUser.email,
        role: 'VIEWER',
      });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('VIEWER');
    expect(res.body.userId).toBe(viewerUser.id);
  });

  it('POST /api/projects/:id/members - zwykły członek NIE może zapraszać innych członków (403)', async () => {
    const res = await request(app)
      .post(`/api/projects/${testProjectId}/members`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        email: 'some-random@example.com',
        role: 'MEMBER',
      });

    expect(res.status).toBe(403);
  });

  it('DELETE /api/projects/:id/members/:userId - właściciel może usunąć członka z projektu', async () => {
    const res = await request(app)
      .delete(`/api/projects/${testProjectId}/members/${viewerUser.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Member removed successfully');
  });
});
