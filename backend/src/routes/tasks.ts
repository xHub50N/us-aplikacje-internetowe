import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../lib/errors.js';
import { sendTaskAssignedEmail, sendTaskCommentEmail } from '../lib/email.js';
import { sseManager } from '../lib/sse.js';
import {
  numericIdParamSchema,
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
  createTaskCommentSchema,
} from '../schemas/index.js';

export const tasksRouter = Router();

// Wymagaj uwierzytelnienia dla wszystkich tras zadań
tasksRouter.use(authenticateToken);

// Pomocnik weryfikujący rolę użytkownika w projekcie
async function getUserProjectRole(
  rawProjectId: unknown,
  userId: number
): Promise<'OWNER' | 'MEMBER' | 'VIEWER' | null> {
  const projectId = Number(rawProjectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return null;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  if (!project) return null;
  if (project.userId === userId) return 'OWNER';

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
    select: { role: true },
  });

  return member ? member.role : null;
}

// Pomocnik weryfikujący ogólny dostęp (odczyt) użytkownika do projektu
async function userHasProjectAccess(rawProjectId: unknown, userId: number): Promise<boolean> {
  const role = await getUserProjectRole(rawProjectId, userId);
  return role !== null;
}

// GET /api/tasks - lista zadań w projektach, do których użytkownik ma dostęp
tasksRouter.get(
  '/',
  validate({ query: taskQuerySchema }),
  async (req, res, next) => {
    const userId = req.user!.id;
    const {
      projectId,
      completed,
      priority,
      assignedToId,
      assignedToMe,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page,
      limit,
    } = req.query as unknown as {
      projectId?: number;
      completed?: boolean;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
      assignedToId?: number;
      assignedToMe?: boolean;
      search?: string;
      sortBy?: 'createdAt' | 'dueDate' | 'title' | 'priority';
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    };

    try {
      const parsedProjectId = projectId !== undefined ? Number(projectId) : undefined;

      // Jeśli podano projectId, sprawdź czy user ma do niego dostęp
      if (parsedProjectId !== undefined) {
        const hasAccess = await userHasProjectAccess(parsedProjectId, userId);
        if (!hasAccess) {
          throw AppError.notFound('Project not found');
        }
      }

      // Filtr przypisania: assignedToMe=true ma pierwszeństwo nad ręcznym assignedToId
      let finalAssignedToFilter: number | undefined;
      const isAssignedToMe = assignedToMe === true || (assignedToMe as any) === 'true';

      if (isAssignedToMe) {
        finalAssignedToFilter = userId;
      } else if (assignedToId !== undefined) {
        finalAssignedToFilter = Number(assignedToId);
      }

      const where: Prisma.TaskWhereInput = {
        project: {
          OR: [
            { userId },
            { members: { some: { userId } } },
          ],
        },
        ...(parsedProjectId !== undefined ? { projectId: parsedProjectId } : {}),
        ...(completed !== undefined ? { completed } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(finalAssignedToFilter !== undefined ? { assignedToId: finalAssignedToFilter } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      const isPaginated = page !== undefined || limit !== undefined;

      if (isPaginated) {
        const currentPage = page !== undefined ? Math.max(1, Number(page)) : 1;
        const currentLimit = limit !== undefined ? Math.min(100, Math.max(1, Number(limit))) : 10;
        const skip = (currentPage - 1) * currentLimit;

        const [total, tasks] = await Promise.all([
          prisma.task.count({ where }),
          prisma.task.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip,
            take: currentLimit,
            include: {
              user: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
              assignedTo: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
              _count: {
                select: { comments: true },
              },
            },
          }),
        ]);

        const totalPages = Math.ceil(total / currentLimit) || 1;

        res.setHeader('X-Total-Count', total.toString());
        res.setHeader('X-Total-Pages', totalPages.toString());

        return res.json({
          items: tasks,
          total,
          page: currentPage,
          limit: currentLimit,
          totalPages,
        });
      }

      const tasks = await prisma.task.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { comments: true },
          },
        },
      });

      res.setHeader('X-Total-Count', tasks.length.toString());
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/tasks - utworzenie zadania
tasksRouter.post(
  '/',
  validate({ body: createTaskSchema }),
  async (req, res, next) => {
    const userId = req.user!.id;
    const {
      title,
      description,
      completed,
      priority,
      dueDate,
      projectId,
      assignedToId,
    } = req.body;

    try {
      // Weryfikacja czy użytkownik jest członkiem lub właścicielem projektu oraz czy ma uprawnienia do zapisu
      const role = await getUserProjectRole(projectId, userId);
      if (!role) {
        throw AppError.notFound('Project not found or you are not a member');
      }
      if (role === 'VIEWER') {
        throw AppError.forbidden('Viewers cannot create tasks');
      }

      // Jeśli podano assignedToId, sprawdź czy przypisywany użytkownik również ma dostęp do projektu i nie jest VIEWERem
      if (assignedToId !== undefined && assignedToId !== null) {
        const assigneeRole = await getUserProjectRole(projectId, assignedToId);
        if (!assigneeRole) {
          throw AppError.badRequest('Assigned user is not a member of this project');
        }
        if (assigneeRole === 'VIEWER') {
          throw AppError.badRequest('Cannot assign task to a viewer');
        }
      }

      const task = await prisma.task.create({
        data: {
          title,
          description: description ?? null,
          completed: completed ?? false,
          priority: priority ?? 'MEDIUM',
          dueDate: dueDate ?? null,
          assignedToId: assignedToId ?? null,
          userId,
          projectId,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Powiadomienie e-mail jeśli zadanie przypisano do kogoś innego
      if (task.assignedTo && task.assignedTo.id !== userId) {
        void sendTaskAssignedEmail({
          to: task.assignedTo.email,
          recipientName: task.assignedTo.name,
          taskTitle: task.title,
          projectName: task.project.name,
          assignerName: task.user.name,
          priority: task.priority,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        });
      }

      // Wysłanie powiadomienia SSE w czasie rzeczywistym
      sseManager.broadcast('task:created', { task, projectId: task.projectId });

      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tasks/:id - pobranie pojedynczego zadania (weryfikacja dostępu do projektu)
tasksRouter.get(
  '/:id',
  validate({ params: numericIdParamSchema }),
  async (req, res, next) => {
    const userId = req.user!.id;
    const taskId = req.params.id as unknown as number;

    try {
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          project: {
            OR: [
              { userId },
              { members: { some: { userId } } },
            ],
          },
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!task) {
        throw AppError.notFound('Task not found');
      }

      res.json(task);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/tasks/:id oraz PATCH /api/tasks/:id - edycja zadania
const updateTaskHandler = async (req: any, res: any, next: any) => {
  const userId = req.user!.id;
  const taskId = req.params.id as unknown as number;
  const {
    title,
    description,
    completed,
    priority,
    dueDate,
    assignedToId,
    projectId: newProjectId,
  } = req.body;

  try {
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        project: {
          OR: [
            { userId },
            { members: { some: { userId } } },
          ],
        },
      },
    });

    if (!existingTask) {
      throw AppError.notFound('Task not found');
    }

    const currentRole = await getUserProjectRole(existingTask.projectId, userId);
    if (!currentRole) {
      throw AppError.notFound('Task not found');
    }
    if (currentRole === 'VIEWER') {
      throw AppError.forbidden('Viewers cannot modify tasks');
    }

    const targetProjectId = newProjectId !== undefined ? newProjectId : existingTask.projectId;

    // Jeśli zmieniany jest projekt, sprawdź czy nowy projekt również jest dostępny dla usera i czy nie jest VIEWERem
    if (newProjectId !== undefined && newProjectId !== existingTask.projectId) {
      const targetRole = await getUserProjectRole(newProjectId, userId);
      if (!targetRole) {
        throw AppError.notFound('Target project not found or you are not a member');
      }
      if (targetRole === 'VIEWER') {
        throw AppError.forbidden('Viewers cannot move tasks to this project');
      }
    }

    // Jeśli zmieniana lub ustawiana jest osoba przypisana, sprawdź czy należy do projektu docelowego i nie jest VIEWERem
    if (assignedToId !== undefined && assignedToId !== null) {
      const assigneeRole = await getUserProjectRole(targetProjectId, assignedToId);
      if (!assigneeRole) {
        throw AppError.badRequest('Assigned user is not a member of this project');
      }
      if (assigneeRole === 'VIEWER') {
        throw AppError.badRequest('Cannot assign task to a viewer');
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description: description ?? null } : {}),
        ...(completed !== undefined ? { completed } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ?? null } : {}),
        ...(assignedToId !== undefined ? { assignedToId: assignedToId ?? null } : {}),
        ...(newProjectId !== undefined ? { projectId: newProjectId } : {}),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Jeśli zadanie zostało przypisane do kogoś nowego
    if (
      updatedTask.assignedTo &&
      updatedTask.assignedTo.id !== existingTask.assignedToId &&
      updatedTask.assignedTo.id !== userId
    ) {
      void sendTaskAssignedEmail({
        to: updatedTask.assignedTo.email,
        recipientName: updatedTask.assignedTo.name,
        taskTitle: updatedTask.title,
        projectName: updatedTask.project.name,
        assignerName: updatedTask.user.name,
        priority: updatedTask.priority,
        dueDate: updatedTask.dueDate ? updatedTask.dueDate.toISOString() : null,
      });
    }

    // Wysłanie powiadomienia SSE w czasie rzeczywistym
    sseManager.broadcast('task:updated', {
      task: updatedTask,
      projectId: updatedTask.projectId,
      previousProjectId: existingTask.projectId !== updatedTask.projectId ? existingTask.projectId : undefined,
    });

    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
};

tasksRouter.put(
  '/:id',
  validate({ params: numericIdParamSchema, body: updateTaskSchema }),
  updateTaskHandler
);

tasksRouter.patch(
  '/:id',
  validate({ params: numericIdParamSchema, body: updateTaskSchema }),
  updateTaskHandler
);

// DELETE /api/tasks/:id - usunięcie zadania (twórca zadania lub właściciel projektu)
tasksRouter.delete(
  '/:id',
  validate({ params: numericIdParamSchema }),
  async (req, res, next) => {
    const userId = req.user!.id;
    const taskId = req.params.id as unknown as number;

    try {
      const existingTask = await prisma.task.findFirst({
        where: {
          id: taskId,
          project: {
            OR: [
              { userId },
              { members: { some: { userId } } },
            ],
          },
        },
        include: {
          project: true,
        },
      });

      if (!existingTask) {
        throw AppError.notFound('Task not found');
      }

      // Widzowie nie mogą usuwać zadań
      const role = await getUserProjectRole(existingTask.projectId, userId);
      if (role === 'VIEWER') {
        throw AppError.forbidden('Viewers cannot delete tasks');
      }

      // Usunąć może: autor zadania LUB autor/właściciel całego projektu
      const isAuthor = existingTask.userId === userId;
      const isProjectOwner = existingTask.project.userId === userId;

      if (!isAuthor && !isProjectOwner) {
        throw AppError.forbidden('Only task creator or project owner can delete this task');
      }

      await prisma.task.delete({
        where: { id: taskId },
      });

      // Wysłanie powiadomienia SSE w czasie rzeczywistym
      sseManager.broadcast('task:deleted', { taskId, projectId: existingTask.projectId });

      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tasks/:id/comments - lista komentarzy do zadania
tasksRouter.get(
  '/:id/comments',
  validate({ params: numericIdParamSchema }),
  async (req, res, next) => {
    const userId = req.user!.id;
    const taskId = Number(req.params.id);

    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { project: true },
      });

      if (!task) {
        throw AppError.notFound('Task not found');
      }

      const hasAccess = await userHasProjectAccess(task.projectId, userId);
      if (!hasAccess) {
        throw AppError.notFound('Task not found');
      }

      const comments = await prisma.taskComment.findMany({
        where: { taskId },
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

      res.json(comments);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/tasks/:id/comments - dodanie komentarza do zadania
tasksRouter.post(
  '/:id/comments',
  validate({ params: numericIdParamSchema, body: createTaskCommentSchema }),
  async (req, res, next) => {
    const userId = req.user!.id;
    const taskId = Number(req.params.id);
    const { content } = req.body;

    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          project: true,
          assignedTo: true,
          user: true,
        },
      });

      if (!task) {
        throw AppError.notFound('Task not found');
      }

      const role = await getUserProjectRole(task.projectId, userId);
      if (!role) {
        throw AppError.notFound('Task not found');
      }
      if (role === 'VIEWER') {
        throw AppError.forbidden('Viewers cannot add comments');
      }

      const comment = await prisma.taskComment.create({
        data: {
          taskId,
          userId,
          content,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

      // Powiadomienie e-mail (fail-safe) do przypisanej osoby oraz autora
      const currentUser = comment.user;
      const notifiedEmails = new Set<string>();

      if (task.assignedTo && task.assignedTo.id !== userId) {
        notifiedEmails.add(task.assignedTo.email);
        void sendTaskCommentEmail({
          to: task.assignedTo.email,
          recipientName: task.assignedTo.name,
          commenterName: currentUser.name,
          taskTitle: task.title,
          projectName: task.project.name,
          commentContent: content,
        });
      }

      if (task.user && task.user.id !== userId && !notifiedEmails.has(task.user.email)) {
        void sendTaskCommentEmail({
          to: task.user.email,
          recipientName: task.user.name,
          commenterName: currentUser.name,
          taskTitle: task.title,
          projectName: task.project.name,
          commentContent: content,
        });
      }

      // Wysłanie powiadomienia SSE w czasie rzeczywistym
      sseManager.broadcast('comment:created', {
        comment,
        taskId,
        projectId: task.projectId,
      });

      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/tasks/:id/comments/:commentId - usunięcie komentarza
tasksRouter.delete(
  '/:id/comments/:commentId',
  async (req, res, next) => {
    const userId = req.user!.id;
    const taskId = Number(req.params.id);
    const commentId = Number(req.params.commentId);

    if (!Number.isInteger(taskId) || !Number.isInteger(commentId)) {
      return next(AppError.badRequest('Invalid ID parameter'));
    }

    try {
      const comment = await prisma.taskComment.findUnique({
        where: { id: commentId },
        include: {
          task: {
            include: { project: true },
          },
        },
      });

      if (!comment || comment.taskId !== taskId) {
        throw AppError.notFound('Comment not found');
      }

      // Widzowie nie mogą usuwać komentarzy
      const role = await getUserProjectRole(comment.task.projectId, userId);
      if (role === 'VIEWER') {
        throw AppError.forbidden('Viewers cannot delete comments');
      }

      const isCommentAuthor = comment.userId === userId;
      const isProjectOwner = comment.task.project.userId === userId;

      if (!isCommentAuthor && !isProjectOwner) {
        throw AppError.forbidden('You can only delete your own comments');
      }

      await prisma.taskComment.delete({
        where: { id: commentId },
      });

      // Wysłanie powiadomienia SSE w czasie rzeczywistym
      sseManager.broadcast('comment:deleted', {
        commentId,
        taskId,
        projectId: comment.task.projectId,
      });

      res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);
