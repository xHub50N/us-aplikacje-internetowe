import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

export const tasksRouter = Router();

// Wymagaj uwierzytelnienia dla wszystkich tras zadań
tasksRouter.use(authenticateToken);

function parsePositiveInt(val: unknown): number | null {
  const parsed = Number(val);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

// GET /api/tasks - lista zadań zalogowanego użytkownika (opcjonalne filtry: projectId, completed)
tasksRouter.get('/', async (req, res) => {
  const userId = req.user!.id;
  const { projectId, completed } = req.query;

  let projectFilter: number | undefined;
  if (projectId !== undefined) {
    const parsedProjectId = parsePositiveInt(projectId);
    if (parsedProjectId === null) {
      res.status(400).json({ error: 'Invalid projectId query parameter' });
      return;
    }
    projectFilter = parsedProjectId;
  }

  let completedFilter: boolean | undefined;
  if (completed !== undefined) {
    if (completed === 'true') {
      completedFilter = true;
    } else if (completed === 'false') {
      completedFilter = false;
    } else {
      res.status(400).json({ error: 'completed query parameter must be "true" or "false"' });
      return;
    }
  }

  try {
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        ...(projectFilter !== undefined ? { projectId: projectFilter } : {}),
        ...(completedFilter !== undefined ? { completed: completedFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
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
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks - utworzenie zadania
tasksRouter.post('/', async (req, res) => {
  const userId = req.user!.id;
  const { title, description, completed, projectId } = req.body;

  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'Task title is required' });
    return;
  }

  if (title.trim().length > 255) {
    res.status(400).json({ error: 'Task title must not exceed 255 characters' });
    return;
  }

  const parsedProjectId = parsePositiveInt(projectId);
  if (parsedProjectId === null) {
    res.status(400).json({ error: 'Valid projectId is required' });
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

  if (completed !== undefined && typeof completed !== 'boolean') {
    res.status(400).json({ error: 'completed must be a boolean' });
    return;
  }

  try {
    // Weryfikacja czy wskazany projekt należy do zalogowanego użytkownika
    const project = await prisma.project.findFirst({
      where: {
        id: parsedProjectId,
        userId,
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found or does not belong to you' });
      return;
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description:
          typeof description === 'string' ? description.trim() : null,
        completed: typeof completed === 'boolean' ? completed : false,
        userId,
        projectId: parsedProjectId,
      },
      include: {
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
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// GET /api/tasks/:id - pobranie pojedynczego zadania (weryfikacja własności)
tasksRouter.get('/:id', async (req, res) => {
  const userId = req.user!.id;
  const taskId = parsePositiveInt(req.params.id);

  if (taskId === null) {
    res.status(400).json({ error: 'Invalid task ID' });
    return;
  }

  try {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// PUT /api/tasks/:id oraz PATCH /api/tasks/:id - edycja zadania (weryfikacja własności)
const updateTaskHandler = async (req: any, res: any) => {
  const userId = req.user!.id;
  const taskId = parsePositiveInt(req.params.id);

  if (taskId === null) {
    res.status(400).json({ error: 'Invalid task ID' });
    return;
  }

  const { title, description, completed, projectId } = req.body;

  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'Task title cannot be empty' });
      return;
    }
    if (title.trim().length > 255) {
      res.status(400).json({ error: 'Task title must not exceed 255 characters' });
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

  if (completed !== undefined && typeof completed !== 'boolean') {
    res.status(400).json({ error: 'completed must be a boolean' });
    return;
  }

  let parsedNewProjectId: number | undefined;
  if (projectId !== undefined) {
    const parsed = parsePositiveInt(projectId);
    if (parsed === null) {
      res.status(400).json({ error: 'Invalid projectId' });
      return;
    }
    parsedNewProjectId = parsed;
  }

  try {
    // Weryfikacja własności zadania
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
    });

    if (!existingTask) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Jeśli zmieniany jest projekt, sprawdź czy nowy projekt również należy do usera
    if (parsedNewProjectId !== undefined && parsedNewProjectId !== existingTask.projectId) {
      const targetProject = await prisma.project.findFirst({
        where: {
          id: parsedNewProjectId,
          userId,
        },
      });

      if (!targetProject) {
        res.status(404).json({ error: 'Target project not found or does not belong to you' });
        return;
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(description !== undefined
          ? {
              description:
                typeof description === 'string' ? description.trim() : null,
            }
          : {}),
        ...(completed !== undefined ? { completed } : {}),
        ...(parsedNewProjectId !== undefined ? { projectId: parsedNewProjectId } : {}),
      },
      include: {
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
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

tasksRouter.put('/:id', updateTaskHandler);
tasksRouter.patch('/:id', updateTaskHandler);

// DELETE /api/tasks/:id - usunięcie zadania (weryfikacja własności)
tasksRouter.delete('/:id', async (req, res) => {
  const userId = req.user!.id;
  const taskId = parsePositiveInt(req.params.id);

  if (taskId === null) {
    res.status(400).json({ error: 'Invalid task ID' });
    return;
  }

  try {
    // Weryfikacja własności
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
    });

    if (!existingTask) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});
