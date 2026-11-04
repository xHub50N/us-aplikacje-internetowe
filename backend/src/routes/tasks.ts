import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../lib/errors.js';
import {
  numericIdParamSchema,
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
} from '../schemas/index.js';

export const tasksRouter = Router();

// Wymagaj uwierzytelnienia dla wszystkich tras zadań
tasksRouter.use(authenticateToken);

// Pomocnik weryfikujący dostęp użytkownika do projektu
async function userHasProjectAccess(rawProjectId: unknown, userId: number): Promise<boolean> {
  const projectId = Number(rawProjectId);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return false;
  }

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
  });
  if (member) return true;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });
  return Boolean(project);
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
    } = req.query as unknown as {
      projectId?: number;
      completed?: boolean;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
      assignedToId?: number;
      assignedToMe?: boolean;
      search?: string;
      sortBy?: 'createdAt' | 'dueDate' | 'title' | 'priority';
      sortOrder?: 'asc' | 'desc';
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

      const tasks = await prisma.task.findMany({
        where: {
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
        },
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

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
      // Weryfikacja czy użytkownik jest członkiem lub właścicielem projektu
      const hasAccess = await userHasProjectAccess(projectId, userId);
      if (!hasAccess) {
        throw AppError.notFound('Project not found or you are not a member');
      }

      // Jeśli podano assignedToId, sprawdź czy przypisywany użytkownik również ma dostęp do projektu
      if (assignedToId !== undefined && assignedToId !== null) {
        const assigneeHasAccess = await userHasProjectAccess(projectId, assignedToId);
        if (!assigneeHasAccess) {
          throw AppError.badRequest('Assigned user is not a member of this project');
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
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

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
            select: { id: true, name: true, email: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
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

    const targetProjectId = newProjectId !== undefined ? newProjectId : existingTask.projectId;

    // Jeśli zmieniany jest projekt, sprawdź czy nowy projekt również jest dostępny dla usera
    if (newProjectId !== undefined && newProjectId !== existingTask.projectId) {
      const targetAccess = await userHasProjectAccess(newProjectId, userId);
      if (!targetAccess) {
        throw AppError.notFound('Target project not found or you are not a member');
      }
    }

    // Jeśli zmieniana lub ustawiana jest osoba przypisana, sprawdź czy należy do projektu docelowego
    if (assignedToId !== undefined && assignedToId !== null) {
      const assigneeAccess = await userHasProjectAccess(targetProjectId, assignedToId);
      if (!assigneeAccess) {
        throw AppError.badRequest('Assigned user is not a member of this project');
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
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
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

      // Usunąć może: autor zadania LUB autor/właściciel całego projektu
      const isAuthor = existingTask.userId === userId;
      const isProjectOwner = existingTask.project.userId === userId;

      if (!isAuthor && !isProjectOwner) {
        throw AppError.forbidden('Only task creator or project owner can delete this task');
      }

      await prisma.task.delete({
        where: { id: taskId },
      });

      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);
