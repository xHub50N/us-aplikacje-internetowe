import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

export const projectsRouter = Router();

// Wymagaj uwierzytelnienia dla wszystkich tras projektów
projectsRouter.use(authenticateToken);

function parseProjectId(rawId: string): number | null {
  const parsed = Number(rawId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

// GET /api/projects - lista projektów zalogowanego użytkownika
projectsRouter.get('/', async (req, res) => {
  const userId = req.user!.id;

  try {
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /api/projects - utworzenie nowego projektu
projectsRouter.post('/', async (req, res) => {
  const userId = req.user!.id;
  const { name, description } = req.body;

  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Project name is required' });
    return;
  }

  if (name.trim().length > 255) {
    res.status(400).json({ error: 'Project name must not exceed 255 characters' });
    return;
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== 'string'
  ) {
    res.status(400).json({ error: 'Description must be a string or null' });
    return;
  }

  try {
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description:
          typeof description === 'string' ? description.trim() : null,
        userId,
      },
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /api/projects/:id - szczegóły projektu (weryfikacja własności)
projectsRouter.get('/:id', async (req, res) => {
  const userId = req.user!.id;
  const projectId = parseProjectId(req.params.id);

  if (projectId === null) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }

  try {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// PUT /api/projects/:id oraz PATCH /api/projects/:id - edycja projektu
const updateProjectHandler = async (req: any, res: any) => {
  const userId = req.user!.id;
  const projectId = parseProjectId(req.params.id);

  if (projectId === null) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }

  const { name, description } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Project name cannot be empty' });
      return;
    }
    if (name.trim().length > 255) {
      res.status(400).json({ error: 'Project name must not exceed 255 characters' });
      return;
    }
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== 'string'
  ) {
    res.status(400).json({ error: 'Description must be a string or null' });
    return;
  }

  try {
    // Sprawdzenie własności
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!existingProject) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(description !== undefined
          ? {
              description:
                typeof description === 'string' ? description.trim() : null,
            }
          : {}),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

projectsRouter.put('/:id', updateProjectHandler);
projectsRouter.patch('/:id', updateProjectHandler);

// DELETE /api/projects/:id - usunięcie projektu (kaskadowo usuwa powiązane zadania)
projectsRouter.delete('/:id', async (req, res) => {
  const userId = req.user!.id;
  const projectId = parseProjectId(req.params.id);

  if (projectId === null) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }

  try {
    // Sprawdzenie własności
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!existingProject) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});
