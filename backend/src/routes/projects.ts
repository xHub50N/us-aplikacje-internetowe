import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../lib/errors.js';
import {
  numericIdParamSchema,
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
  projectMemberParamsSchema,
} from '../schemas/index.js';

export const projectsRouter = Router();

// Wymagaj uwierzytelnienia dla wszystkich tras projektów
projectsRouter.use(authenticateToken);

// Pomocnik sprawdzający członkostwo użytkownika w projekcie
async function getProjectMembership(projectId: number, userId: number) {
  return prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
    include: {
      project: true,
    },
  });
}

// GET /api/projects - lista projektów, których użytkownik jest właścicielem lub członkiem
projectsRouter.get('/', async (req, res, next) => {
  const userId = req.user!.id;

  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { userId }, // Właściciel
          { members: { some: { userId } } }, // Członek
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { tasks: true, members: true },
        },
      },
    });

    res.json(projects);
  } catch (error) {
    next(error);
  }
});

// POST /api/projects - utworzenie nowego projektu (i dodanie twórcy jako OWNER w members)
projectsRouter.post(
  '/',
  validate({ body: createProjectSchema }),
  async (req, res, next) => {
    const userId = req.user!.id;
    const { name, description } = req.body;

    try {
      const project = await prisma.project.create({
        data: {
          name,
          description: description ?? null,
          userId,
          members: {
            create: {
              userId,
              role: 'OWNER',
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/projects/:id - szczegóły projektu (weryfikacja członkostwa)
projectsRouter.get(
  '/:id',
  validate({ params: numericIdParamSchema }),
  async (req, res, next) => {
    const userId = req.user!.id;
    const projectId = req.params.id as unknown as number;

    try {
      const membership = await getProjectMembership(projectId, userId);
      if (!membership) {
        throw AppError.notFound('Project not found');
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          tasks: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      res.json(project);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/projects/:id oraz PATCH /api/projects/:id - edycja projektu (tylko OWNER)
const updateProjectHandler = async (req: any, res: any, next: any) => {
  const userId = req.user!.id;
  const projectId = req.params.id as unknown as number;
  const { name, description } = req.body;

  try {
    const membership = await getProjectMembership(projectId, userId);
    if (!membership) {
      throw AppError.notFound('Project not found');
    }

    if (membership.role !== 'OWNER' && membership.project.userId !== userId) {
      throw AppError.forbidden('Only project owners can modify project details');
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description: description ?? null } : {}),
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

projectsRouter.put(
  '/:id',
  validate({ params: numericIdParamSchema, body: updateProjectSchema }),
  updateProjectHandler
);

projectsRouter.patch(
  '/:id',
  validate({ params: numericIdParamSchema, body: updateProjectSchema }),
  updateProjectHandler
);

// DELETE /api/projects/:id - usunięcie projektu (tylko właściciel)
projectsRouter.delete(
  '/:id',
  validate({ params: numericIdParamSchema }),
  async (req, res, next) => {
    const userId = req.user!.id;
    const projectId = req.params.id as unknown as number;

    try {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId, // Tylko autor/właściciel projektu
        },
      });

      if (!project) {
        throw AppError.notFound('Project not found or you are not its owner');
      }

      await prisma.project.delete({
        where: { id: projectId },
      });

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/projects/:id/members - lista członków projektu
projectsRouter.get(
  '/:id/members',
  validate({ params: numericIdParamSchema }),
  async (req, res, next) => {
    const userId = req.user!.id;
    const projectId = req.params.id as unknown as number;

    try {
      const membership = await getProjectMembership(projectId, userId);
      if (!membership) {
        throw AppError.notFound('Project not found');
      }

      const members = await prisma.projectMember.findMany({
        where: { projectId },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      res.json(members);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/projects/:id/members - dodanie użytkownika do projektu po e-mailu (tylko OWNER)
projectsRouter.post(
  '/:id/members',
  validate({ params: numericIdParamSchema, body: addProjectMemberSchema }),
  async (req, res, next) => {
    const requesterId = req.user!.id;
    const projectId = req.params.id as unknown as number;
    const { email, role = 'MEMBER' } = req.body;

    try {
      const membership = await getProjectMembership(projectId, requesterId);
      if (!membership) {
        throw AppError.notFound('Project not found');
      }

      if (membership.role !== 'OWNER' && membership.project.userId !== requesterId) {
        throw AppError.forbidden('Only project owners can invite members');
      }

      // Znajdź użytkownika po e-mailu
      const targetUser = await prisma.user.findUnique({
        where: { email },
      });

      if (!targetUser) {
        throw AppError.notFound('User with this email was not found');
      }

      // Sprawdź czy już jest członkiem
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId, userId: targetUser.id },
        },
      });

      if (existingMember) {
        throw AppError.conflict('User is already a member of this project');
      }

      const newMember = await prisma.projectMember.create({
        data: {
          projectId,
          userId: targetUser.id,
          role,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      res.status(201).json(newMember);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/projects/:id/members/:userId - usunięcie członka z projektu (lub opuszczenie projektu)
projectsRouter.delete(
  '/:id/members/:userId',
  validate({ params: projectMemberParamsSchema }),
  async (req, res, next) => {
    const requesterId = req.user!.id;
    const projectId = req.params.id as unknown as number;
    const targetUserId = req.params.userId as unknown as number;

    try {
      const requesterMembership = await getProjectMembership(projectId, requesterId);
      if (!requesterMembership) {
        throw AppError.notFound('Project not found');
      }

      // Właściciel projektu nie może zostać usunięty z projektu
      if (requesterMembership.project.userId === targetUserId) {
        throw AppError.badRequest('Project owner cannot be removed from the project');
      }

      // Usuwać może: sam użytkownik (opuszczenie projektu) LUB właściciel projektu (OWNER)
      const isSelf = requesterId === targetUserId;
      const isOwner = requesterMembership.role === 'OWNER';

      if (!isSelf && !isOwner) {
        throw AppError.forbidden('You do not have permission to remove this member');
      }

      const targetMembership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId, userId: targetUserId },
        },
      });

      if (!targetMembership) {
        throw AppError.notFound('Member not found in project');
      }

      await prisma.projectMember.delete({
        where: {
          projectId_userId: { projectId, userId: targetUserId },
        },
      });

      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      next(error);
    }
  }
);
