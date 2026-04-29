'use client';

import { useState } from 'react';
import { ProjectCard, type ProjectCardData } from '@/components/ProjectCard';

type Props = {
  initialProjects: ProjectCardData[];
};

export function ProjectList({ initialProjects }: Props) {
  const [projects, setProjects] = useState(initialProjects);

  async function handleDelete(id: string) {
    // 낙관적으로 목록에서 제거
    setProjects(prev => prev.filter(p => p.id !== id));
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  }

  if (projects.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-zinc-400 dark:text-zinc-600">
        프로젝트가 없어요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {projects.map(p => (
        <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
      ))}
    </div>
  );
}
