import React, { useState, useCallback, useMemo } from 'react';
import { api, Project, ProjectMember, ProjectRole, User } from '../api';
import { ConfirmDialogConfig } from '../types';

export function useProjects(
  user: User | null,
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void,
  setConfirmDialog: (config: ConfirmDialogConfig | null) => void,
  onProjectsChanged?: () => Promise<void>
) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Modal: Nowy projekt
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Modal: Edycja projektu
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');

  // Modal: Członkowie projektu
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<ProjectRole>('MEMBER');
  const [membersModalError, setMembersModalError] = useState<string | null>(null);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const isOwnerOfActiveProject = useMemo(
    () => activeProject?.userId === user?.id,
    [activeProject, user]
  );

  const isViewerOfActiveProject = useMemo(() => {
    if (!activeProject || !user) return false;
    if (activeProject.userId === user.id) return false;
    const myMembership = projectMembers.find((m) => m.userId === user.id);
    return myMembership?.role === 'VIEWER';
  }, [activeProject, user, projectMembers]);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.projects.getAll();
      setProjects(data);
    } catch (err: any) {
      showToast(err.message || 'Błąd ładowania projektów', 'error');
    }
  }, [showToast]);

  const loadProjectMembers = useCallback(async (projectId: number) => {
    try {
      const members = await api.projects.getMembers(projectId);
      setProjectMembers(members);
    } catch (err: any) {
      setMembersModalError(err.message || 'Błąd ładowania członków projektu');
    }
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const created = await api.projects.create({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
      });
      setNewProjectName('');
      setNewProjectDesc('');
      setIsNewProjectModalOpen(false);
      showToast(`Projekt "${created.name}" został utworzony`, 'success');
      await loadProjects();
      if (onProjectsChanged) await onProjectsChanged();
    } catch (err: any) {
      showToast(err.message || 'Błąd tworzenia projektu', 'error');
    }
  };

  const handleOpenEditProject = (proj: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingProject(proj);
    setEditProjectName(proj.name);
    setEditProjectDesc(proj.description || '');
  };

  const handleSaveEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editProjectName.trim()) return;
    try {
      await api.projects.update(editingProject.id, {
        name: editProjectName.trim(),
        description: editProjectDesc.trim() || null,
      });
      setEditingProject(null);
      showToast('Projekt został zaktualizowany', 'success');
      await loadProjects();
      if (onProjectsChanged) await onProjectsChanged();
    } catch (err: any) {
      showToast(err.message || 'Błąd aktualizacji projektu', 'error');
    }
  };

  const handleDeleteProject = (proj: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setConfirmDialog({
      title: 'Usuń projekt',
      message: `Czy na pewno chcesz usunąć projekt "${proj.name}" wraz ze wszystkimi jego zadaniami? Tej operacji nie można cofnąć.`,
      confirmLabel: 'Usuń projekt',
      isDanger: true,
      onConfirm: async () => {
        try {
          await api.projects.delete(proj.id);
          if (selectedProjectId === proj.id) {
            setSelectedProjectId(null);
          }
          showToast(`Projekt "${proj.name}" został usunięty`, 'info');
          await loadProjects();
          if (onProjectsChanged) await onProjectsChanged();
        } catch (err: any) {
          showToast(err.message || 'Błąd usuwania projektu', 'error');
        }
      },
    });
  };

  const handleOpenMembersModal = async (projectId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedProjectId(projectId);
    setMembersModalError(null);
    setNewMemberEmail('');
    setNewMemberRole('MEMBER');
    await loadProjectMembers(projectId);
    setIsMembersModalOpen(true);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !newMemberEmail.trim()) return;
    try {
      setMembersModalError(null);
      await api.projects.addMember(selectedProjectId, {
        email: newMemberEmail.trim(),
        role: newMemberRole,
      });
      setNewMemberEmail('');
      setNewMemberRole('MEMBER');
      showToast('Dodano nowego członka do zespołu', 'success');
      await loadProjectMembers(selectedProjectId);
      await loadProjects();
    } catch (err: any) {
      setMembersModalError(err.message || 'Nie udało się dodać członka');
    }
  };

  const handleRemoveMember = (projectId: number, memberUserId: number, memberName: string) => {
    const isSelf = memberUserId === user?.id;
    setConfirmDialog({
      title: isSelf ? 'Opuść projekt' : 'Usuń członka zespołu',
      message: isSelf
        ? 'Czy na pewno chcesz opuścić ten projekt? Stracisz do niego dostęp.'
        : `Czy na pewno chcesz usunąć użytkownika "${memberName}" z tego projektu?`,
      confirmLabel: isSelf ? 'Opuść projekt' : 'Usuń członka',
      isDanger: true,
      onConfirm: async () => {
        try {
          await api.projects.removeMember(projectId, memberUserId);
          showToast(isSelf ? 'Opuściłeś projekt' : `Użytkownik ${memberName} został usunięty`, 'info');
          if (isSelf && selectedProjectId === projectId) {
            setIsMembersModalOpen(false);
            setSelectedProjectId(null);
          } else {
            await loadProjectMembers(projectId);
          }
          await loadProjects();
          if (onProjectsChanged) await onProjectsChanged();
        } catch (err: any) {
          showToast(err.message || 'Nie udało się usunąć członka', 'error');
        }
      },
    });
  };

  return {
    projects,
    setProjects,
    selectedProjectId,
    setSelectedProjectId,
    activeProject,
    isOwnerOfActiveProject,
    loadProjects,
    // New project modal
    isNewProjectModalOpen,
    setIsNewProjectModalOpen,
    newProjectName,
    setNewProjectName,
    newProjectDesc,
    setNewProjectDesc,
    handleCreateProject,
    // Edit project modal
    editingProject,
    setEditingProject,
    editProjectName,
    setEditProjectName,
    editProjectDesc,
    setEditProjectDesc,
    handleOpenEditProject,
    handleSaveEditProject,
    handleDeleteProject,
    // Members modal
    isMembersModalOpen,
    setIsMembersModalOpen,
    projectMembers,
    loadProjectMembers,
    newMemberEmail,
    setNewMemberEmail,
    newMemberRole,
    setNewMemberRole,
    isViewerOfActiveProject,
    membersModalError,
    handleOpenMembersModal,
    handleAddMember,
    handleRemoveMember,
  };
}
