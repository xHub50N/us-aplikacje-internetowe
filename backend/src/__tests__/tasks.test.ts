import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { prisma } from '../lib/prisma.js';

describe('Tasks API & RBAC Integration Tests', () => {
  let ownerToken: string;
  let ownerUser: { id: number; email: string };
  let memberToken: string;
  let memberUser: { id: number; email: string };
  let viewerToken: string;
  let viewerUser: { id: number; email: string };

  let projectId: number;
  let taskId: number;
  let commentId: number;

  beforeAll(async () => {
    // 1. Rejestracja właściciela projektu
    const ownerRes = await request(app).post('/api/auth/register').send({
      name: 'Owner Tester',
      email: `task-owner-${Date.now()}@example.com`,
      password: 'Password123!',
    });
    ownerToken = ownerRes.body.token;
    ownerUser = ownerRes.body.user;

    // 2. Rejestracja członka z prawami zapisu (MEMBER)
    const memberRes = await request(app).post('/api/auth/register').send({
      name: 'Member Tester',
      email: `task-member-${Date.now()}@example.com`,
      password: 'Password123!',
    });
    memberToken = memberRes.body.token;
    memberUser = memberRes.body.user;

    // 3. Rejestracja widza (VIEWER - tylko do odczytu)
    const viewerRes = await request(app).post('/api/auth/register').send({
      name: 'Viewer Tester',
      email: `task-viewer-${Date.now()}@example.com`,
      password: 'Password123!',
    });
    viewerToken = viewerRes.body.token;
    viewerUser = viewerRes.body.user;

    // 4. Utworzenie projektu przez właściciela
    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Projekt Zadań RBAC',
        description: 'Testowanie zadań i ról',
      });
    projectId = projRes.body.id;

    // 5. Zaproszenie członka (MEMBER)
    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: memberUser.email, role: 'MEMBER' });

    // 6. Zaproszenie widza (VIEWER)
    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: viewerUser.email, role: 'VIEWER' });
  });

  afterAll(async () => {
    if (projectId) {
      await prisma.project.deleteMany({ where: { id: projectId } });
    }
    await prisma.user.deleteMany({
      where: {
        id: { in: [ownerUser?.id, memberUser?.id, viewerUser?.id].filter(Boolean) as number[] },
      },
    });
  });

  // --- Testy podstawowe i MEMBER ---

  it('POST /api/tasks - członek (MEMBER) może utworzyć zadanie', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        title: 'Zadanie integracyjne Vitest',
        description: 'Opis zadania',
        priority: 'HIGH',
        projectId,
        assignedToId: memberUser.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Zadanie integracyjne Vitest');
    expect(res.body.priority).toBe('HIGH');
    expect(res.body.projectId).toBe(projectId);
    expect(res.body.assignedToId).toBe(memberUser.id);

    taskId = res.body.id;
  });

  it('POST /api/tasks - nie można przypisać zadania do użytkownika z rolą VIEWER (400)', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Niepoprawne przypisanie',
        projectId,
        assignedToId: viewerUser.id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('viewer');
  });

  it('GET /api/tasks - pobiera listę zadań z filtrami', async () => {
    const res = await request(app)
      .get(`/api/tasks?projectId=${projectId}&priority=HIGH`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    const tasks = Array.isArray(res.body) ? res.body : res.body.items;
    expect(tasks.some((t: any) => t.id === taskId)).toBe(true);
  });

  it('PATCH /api/tasks/:id - aktualizacja stanu zadania (ukończenie)', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ completed: true });

    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
  });

  it('POST /api/tasks/:id/comments - dodanie komentarza przez członka projektu', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ content: 'Świetna robota z zadaniem!' });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe('Świetna robota z zadaniem!');
    expect(res.body.userId).toBe(memberUser.id);

    commentId = res.body.id;
  });

  it('GET /api/tasks/:id/comments - pobranie listy komentarzy', async () => {
    const res = await request(app)
      .get(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((c: any) => c.id === commentId)).toBe(true);
  });

  // --- Testy RBAC dla roli VIEWER (Tylko do odczytu) ---

  it('GET /api/tasks/:id - widz (VIEWER) MOŻE odczytać szczegóły zadania', async () => {
    const res = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(taskId);
  });

  it('GET /api/tasks/:id/comments - widz (VIEWER) MOŻE odczytać komentarze', async () => {
    const res = await request(app)
      .get(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/tasks - widz (VIEWER) NIE MOŻE tworzyć zadań (403)', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        title: 'Nieautoryzowane zadanie widza',
        projectId,
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Viewers cannot create tasks');
  });

  it('PATCH /api/tasks/:id - widz (VIEWER) NIE MOŻE edytować zadań (403)', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ title: 'Zmiana przez widza' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Viewers cannot modify tasks');
  });

  it('POST /api/tasks/:id/comments - widz (VIEWER) NIE MOŻE dodawać komentarzy (403)', async () => {
    const res = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ content: 'Komentarz widza' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Viewers cannot add comments');
  });

  it('DELETE /api/tasks/:id - widz (VIEWER) NIE MOŻE usunąć zadania (403)', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Viewers cannot delete tasks');
  });

  // --- Czyszczenie zasobów przez uprawnionego użytkownika ---

  it('DELETE /api/tasks/:id/comments/:commentId - autor może usunąć swój komentarz', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${taskId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Comment deleted successfully');
  });

  it('DELETE /api/tasks/:id - autor lub właściciel projektu może usunąć zadanie', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Task deleted successfully');
  });
});
