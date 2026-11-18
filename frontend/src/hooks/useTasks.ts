import React, { useState, useCallback, useMemo } from 'react';
import { api, Task, Priority, TaskComment } from '../api';
import { ConfirmDialogConfig } from '../types';

export function useTasks(
  selectedProjectId: number | null,
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void,
  setConfirmDialog: (config: ConfirmDialogConfig | null) => void,
  onTasksChanged?: () => Promise<void>
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | Priority>('ALL');
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'dueDate' | 'priority' | 'title'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Quick / New task modal state
  const [isQuickTaskModalOpen, setIsQuickTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('MEDIUM');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState<number | ''>('');
  const [newTaskAssignedToId, setNewTaskAssignedToId] = useState<number | ''>('');

  // Edit task modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState<Priority>('MEDIUM');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskProjectId, setEditTaskProjectId] = useState<number | ''>('');
  const [editTaskAssignedToId, setEditTaskAssignedToId] = useState<number | ''>('');
  const [editTaskCompleted, setEditTaskCompleted] = useState(false);

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<'todo' | 'in_progress' | 'completed' | null>(null);

  // Comments state
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const isOverdue = useCallback((dateStr?: string | null, completed?: boolean) => {
    if (!dateStr || completed) return false;
    return new Date(dateStr).getTime() < Date.now();
  }, []);

  const formatDate = useCallback((dateStr?: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const params: any = {
        sortBy,
        sortOrder,
        page,
        limit,
      };
      if (selectedProjectId !== null) {
        params.projectId = selectedProjectId;
      }
      if (taskFilter === 'active') {
        params.completed = false;
      } else if (taskFilter === 'completed') {
        params.completed = true;
      }
      if (priorityFilter !== 'ALL') {
        params.priority = priorityFilter;
      }
      if (assignedToMeOnly) {
        params.assignedToMe = true;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.tasks.getAll(params);
      setTasks(res.items);
      setTotalTasks(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      showToast(err.message || 'Błąd ładowania zadań', 'error');
    }
  }, [
    selectedProjectId,
    taskFilter,
    priorityFilter,
    assignedToMeOnly,
    searchQuery,
    sortBy,
    sortOrder,
    page,
    limit,
    showToast,
  ]);

  // Statistics calculation
  const totalTasksCount = tasks.length;
  const completedTasksCount = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const activeTasksCount = totalTasksCount - completedTasksCount;
  const completionRate = useMemo(
    () => (totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0),
    [totalTasksCount, completedTasksCount]
  );
  const highPriorityCount = useMemo(
    () => tasks.filter((t) => t.priority === 'HIGH' && !t.completed).length,
    [tasks]
  );
  const mediumPriorityCount = useMemo(
    () => tasks.filter((t) => t.priority === 'MEDIUM' && !t.completed).length,
    [tasks]
  );
  const lowPriorityCount = useMemo(
    () => tasks.filter((t) => t.priority === 'LOW' && !t.completed).length,
    [tasks]
  );
  const overdueCount = useMemo(
    () => tasks.filter((t) => isOverdue(t.dueDate, t.completed)).length,
    [tasks, isOverdue]
  );

  const lowPct = totalTasksCount > 0 ? (lowPriorityCount / totalTasksCount) * 100 : 0;
  const medPct = totalTasksCount > 0 ? (mediumPriorityCount / totalTasksCount) * 100 : 0;
  const highPct = totalTasksCount > 0 ? (highPriorityCount / totalTasksCount) * 100 : 0;
  const compPct = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;

  // Tworzenie zadania
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || newTaskProjectId === '') return;
    try {
      let formattedDueDate: string | null = null;
      if (newTaskDueDate) {
        formattedDueDate = new Date(newTaskDueDate).toISOString();
      }

      await api.tasks.create({
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || undefined,
        priority: newTaskPriority,
        dueDate: formattedDueDate,
        projectId: Number(newTaskProjectId),
        assignedToId: newTaskAssignedToId !== '' ? Number(newTaskAssignedToId) : null,
      });

      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPriority('MEDIUM');
      setNewTaskDueDate('');
      setNewTaskAssignedToId('');
      setIsQuickTaskModalOpen(false);
      showToast('Zadanie dodane pomyślnie', 'success');
      await loadTasks();
      if (onTasksChanged) await onTasksChanged();
    } catch (err: any) {
      showToast(err.message || 'Błąd dodawania zadania', 'error');
    }
  };

  // Ładowanie komentarzy
  const loadTaskComments = async (taskId: number) => {
    setLoadingComments(true);
    try {
      const data = await api.tasks.getComments(taskId);
      setTaskComments(data);
    } catch {
      setTaskComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  // Dodawanie komentarza
  const handleAddComment = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (!editingTask || !newCommentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      const created = await api.tasks.addComment(editingTask.id, {
        content: newCommentText.trim(),
      });
      setTaskComments((prev) => [...prev, created]);
      setNewCommentText('');
      showToast('Komentarz został opublikowany', 'success');
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id
            ? { ...t, _count: { comments: (t._count?.comments || 0) + 1 } }
            : t
        )
      );
    } catch (err: any) {
      showToast(err.message || 'Błąd dodawania komentarza', 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Usuwanie komentarza
  const handleDeleteComment = async (commentId: number) => {
    if (!editingTask) return;
    try {
      await api.tasks.deleteComment(editingTask.id, commentId);
      setTaskComments((prev) => prev.filter((c) => c.id !== commentId));
      showToast('Komentarz usunięty', 'info');
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id
            ? { ...t, _count: { comments: Math.max(0, (t._count?.comments || 1) - 1) } }
            : t
        )
      );
    } catch (err: any) {
      showToast(err.message || 'Błąd usuwania komentarza', 'error');
    }
  };

  // Otwarcie edycji zadania
  const handleOpenEditTask = (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description || '');
    setEditTaskPriority(task.priority);
    setEditTaskDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    setEditTaskProjectId(task.projectId);
    setEditTaskAssignedToId(task.assignedToId || '');
    setEditTaskCompleted(task.completed);
    setNewCommentText('');
    loadTaskComments(task.id);
  };

  // Zapis zmian zadania
  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTaskTitle.trim()) return;
    try {
      let formattedDueDate: string | null = null;
      if (editTaskDueDate) {
        formattedDueDate = new Date(editTaskDueDate).toISOString();
      }

      await api.tasks.update(editingTask.id, {
        title: editTaskTitle.trim(),
        description: editTaskDesc.trim() || null,
        priority: editTaskPriority,
        dueDate: formattedDueDate,
        projectId: Number(editTaskProjectId),
        assignedToId: editTaskAssignedToId !== '' ? Number(editTaskAssignedToId) : null,
        completed: editTaskCompleted,
      });

      setEditingTask(null);
      showToast('Zadanie zostało zaktualizowane', 'success');
      await loadTasks();
      if (onTasksChanged) await onTasksChanged();
    } catch (err: any) {
      showToast(err.message || 'Błąd aktualizacji zadania', 'error');
    }
  };

  // Przełączenie completed
  const handleToggleTask = async (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const nextCompleted = !task.completed;
      await api.tasks.update(task.id, { completed: nextCompleted });
      showToast(
        nextCompleted ? `Ukończono: "${task.title}"` : `Przywrócono do aktywnych: "${task.title}"`,
        'success'
      );
      await loadTasks();
    } catch (err: any) {
      showToast(err.message || 'Błąd aktualizacji statusu zadania', 'error');
    }
  };

  // Zmiana przypisanej osoby
  const handleAssigneeChange = async (task: Task, newAssigneeId: number | null) => {
    try {
      await api.tasks.update(task.id, { assignedToId: newAssigneeId });
      showToast('Zaktualizowano przypisaną osobę', 'success');
      await loadTasks();
    } catch (err: any) {
      showToast(err.message || 'Błąd zmiany przypisania zadania', 'error');
    }
  };

  // Usuwanie zadania
  const handleDeleteTask = (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setConfirmDialog({
      title: 'Usuń zadanie',
      message: `Czy na pewno chcesz usunąć zadanie "${task.title}"?`,
      confirmLabel: 'Usuń zadanie',
      isDanger: true,
      onConfirm: async () => {
        try {
          await api.tasks.delete(task.id);
          showToast(`Zadanie "${task.title}" zostało usunięte`, 'info');
          await loadTasks();
          if (onTasksChanged) await onTasksChanged();
        } catch (err: any) {
          showToast(err.message || 'Błąd usuwania zadania', 'error');
        }
      },
    });
  };

  // Przeciąganie na tablicy Kanban
  const handleKanbanDrop = async (
    taskId: number,
    targetCol: 'todo' | 'in_progress' | 'completed'
  ) => {
    setDraggedTaskId(null);
    setDragOverColumn(null);

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let nextCompleted = task.completed;
    let nextPriority = task.priority;

    if (targetCol === 'completed') {
      nextCompleted = true;
    } else if (targetCol === 'in_progress') {
      nextCompleted = false;
      nextPriority = 'HIGH';
    } else if (targetCol === 'todo') {
      nextCompleted = false;
      if (nextPriority === 'HIGH') {
        nextPriority = 'MEDIUM';
      }
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, completed: nextCompleted, priority: nextPriority }
          : t
      )
    );

    const colTitles = {
      todo: 'Do zrobienia',
      in_progress: 'W toku (Wysoki priorytet)',
      completed: 'Ukończone',
    };
    showToast(`Przeniesiono zadanie do kolumny: "${colTitles[targetCol]}"`, 'success');

    try {
      await api.tasks.update(taskId, {
        completed: nextCompleted,
        priority: nextPriority,
      });
      await loadTasks();
    } catch (err: any) {
      showToast(err.message || 'Błąd aktualizacji statusu zadania', 'error');
      await loadTasks();
    }
  };

  return {
    tasks,
    setTasks,
    taskFilter,
    setTaskFilter,
    priorityFilter,
    setPriorityFilter,
    assignedToMeOnly,
    setAssignedToMeOnly,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    page,
    setPage,
    limit,
    setLimit,
    totalTasks,
    totalPages,
    loadTasks,
    // Metrics
    totalTasksCount,
    completedTasksCount,
    activeTasksCount,
    completionRate,
    highPriorityCount,
    overdueCount,
    lowPct,
    medPct,
    highPct,
    compPct,
    // New task modal
    isQuickTaskModalOpen,
    setIsQuickTaskModalOpen,
    newTaskTitle,
    setNewTaskTitle,
    newTaskDesc,
    setNewTaskDesc,
    newTaskPriority,
    setNewTaskPriority,
    newTaskDueDate,
    setNewTaskDueDate,
    newTaskProjectId,
    setNewTaskProjectId,
    newTaskAssignedToId,
    setNewTaskAssignedToId,
    handleCreateTask,
    // Edit task modal
    editingTask,
    setEditingTask,
    editTaskTitle,
    setEditTaskTitle,
    editTaskDesc,
    setEditTaskDesc,
    editTaskPriority,
    setEditTaskPriority,
    editTaskDueDate,
    setEditTaskDueDate,
    editTaskProjectId,
    setEditTaskProjectId,
    editTaskAssignedToId,
    setEditTaskAssignedToId,
    editTaskCompleted,
    setEditTaskCompleted,
    handleOpenEditTask,
    handleSaveEditTask,
    // Kanban Drag and Drop
    draggedTaskId,
    setDraggedTaskId,
    dragOverColumn,
    setDragOverColumn,
    handleKanbanDrop,
    // Comments
    taskComments,
    loadingComments,
    newCommentText,
    setNewCommentText,
    isSubmittingComment,
    handleAddComment,
    handleDeleteComment,
    // Actions
    handleToggleTask,
    handleAssigneeChange,
    handleDeleteTask,
    // Helpers
    isOverdue,
    formatDate,
  };
}
