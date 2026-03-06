'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AssigneeSelect } from '@/components/users/assignee-select';
import { z } from 'zod';

const ticketSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  type: z.enum(['Bug', 'Feature', 'Content', 'Marketing', 'Tracking', 'Plugin']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  assigneeUserId: z.string().optional()
});

type TicketFormValues = z.infer<typeof ticketSchema>;

type UploadState = 'pending' | 'uploading' | 'done' | 'failed';

type SelectedFile = {
  id: string;
  file: File;
  state: UploadState;
  error?: string;
};

type ProjectOption = {
  id: string;
  name: string;
  isArchived?: boolean;
};

const MAX_ATTACHMENT_BYTES = Number(process.env.NEXT_PUBLIC_MAX_ATTACHMENT_BYTES ?? 10 * 1024 * 1024);

function isAllowedMime(mime: string) {
  return mime === 'application/pdf' || mime.startsWith('image/');
}

export default function NewTicketPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isTibaUser = Boolean(session?.roles?.includes('tiba_agent') || session?.roles?.includes('tiba_admin'));
  const [step, setStep] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  const [projectQuery, setProjectQuery] = useState('');
  const [debouncedProjectQuery, setDebouncedProjectQuery] = useState('');
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors }
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      projectId: '',
      type: 'Bug',
      title: '',
      description: '',
      assigneeUserId: undefined
    }
  });
  const projectIdValue = watch('projectId');

  const acceptedLabel = useMemo(() => `Images and PDFs up to ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))}MB`, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedProjectQuery(projectQuery.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [projectQuery]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProjects() {
      setProjectsLoading(true);
      setProjectsError(null);

      try {
        const params = new URLSearchParams({
          q: debouncedProjectQuery,
          page: '1',
          pageSize: '20',
          sort: 'name',
          order: 'asc'
        });

        const response = await fetch(`/api/backend/projects?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Failed to load projects');
        }

        const data = (await response.json()) as { items?: Array<{ id: string; name: string; isArchived?: boolean }> };
        const items = Array.isArray(data.items) ? data.items : [];
        const visibleItems = isTibaUser ? items : items.filter((project) => !project.isArchived);
        setProjectOptions(visibleItems.map((project) => ({ id: project.id, name: project.name, isArchived: project.isArchived })));
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }
        setProjectsError(error instanceof Error ? error.message : 'Failed to load projects');
        setProjectOptions([]);
      } finally {
        setProjectsLoading(false);
      }
    }

    void loadProjects();

    return () => controller.abort();
  }, [debouncedProjectQuery, isTibaUser]);

  const addFiles = (files: FileList | null) => {
    if (!files) {
      return;
    }

    const next: SelectedFile[] = [];
    for (const file of Array.from(files)) {
      if (!isAllowedMime(file.type)) {
        next.push({
          id: crypto.randomUUID(),
          file,
          state: 'failed',
          error: 'Only image/* and application/pdf are allowed.'
        });
        continue;
      }

      if (file.size > MAX_ATTACHMENT_BYTES) {
        next.push({
          id: crypto.randomUUID(),
          file,
          state: 'failed',
          error: `File exceeds max size (${MAX_ATTACHMENT_BYTES} bytes).`
        });
        continue;
      }

      next.push({ id: crypto.randomUUID(), file, state: 'pending' });
    }

    setSelectedFiles((prev) => [...prev, ...next]);
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const setFileState = (id: string, state: UploadState, error?: string) => {
    setSelectedFiles((prev) => prev.map((f) => (f.id === id ? { ...f, state, error } : f)));
  };

  const onSubmit = async (values: TicketFormValues) => {
    setSubmitError(null);
    setSubmitting(true);

    try {
      let ticketId = createdTicketId;
      if (!ticketId) {
        const createRes = await fetch('/api/backend/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        });

        if (!createRes.ok) {
          const message = await createRes.text();
          throw new Error(message || 'Failed to create ticket');
        }

        const ticket = (await createRes.json()) as { id: string };
        ticketId = ticket.id;
        setCreatedTicketId(ticketId);
      }

      let hasUploadFailure = false;

      for (const fileEntry of selectedFiles) {
        if (fileEntry.state === 'done') {
          continue;
        }

        setFileState(fileEntry.id, 'uploading');

        try {
          const presignRes = await fetch(`/api/backend/tickets/${ticketId}/attachments/presign-upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: fileEntry.file.name,
              mime: fileEntry.file.type,
              sizeBytes: fileEntry.file.size
            })
          });

          if (!presignRes.ok) {
            const message = await presignRes.text();
            throw new Error(message || 'Failed to presign upload');
          }

          const presign = (await presignRes.json()) as {
            uploadUrl: string;
            requiredHeaders?: { 'Content-Type'?: string };
          };

          const uploadRes = await fetch(presign.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': presign.requiredHeaders?.['Content-Type'] ?? fileEntry.file.type
            },
            body: fileEntry.file
          });

          if (!uploadRes.ok) {
            throw new Error('Upload failed');
          }

          setFileState(fileEntry.id, 'done');
        } catch (error) {
          hasUploadFailure = true;
          setFileState(fileEntry.id, 'failed', error instanceof Error ? error.message : 'Upload failed');
        }
      }

      if (hasUploadFailure) {
        throw new Error('Some attachments failed to upload. Please retry.');
      }

      router.push('/tickets');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Ticket creation failed');
    } finally {
      setSubmitting(false);
    }
  };
  const handleFinalSubmit = handleSubmit(onSubmit);

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Ticket</h1>
        <Link className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm" href="/tickets">
          Back to Tickets
        </Link>
      </div>

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-700">Step {step} of 2</p>

          {step === 1 && (
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Project</span>
                <input type="hidden" {...register('projectId')} />
                <div className="relative">
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    onChange={(event) => {
                      setProjectQuery(event.target.value);
                      setValue('projectId', '', { shouldValidate: true });
                      setSelectedProjectName('');
                      setProjectDropdownOpen(true);
                    }}
                    onFocus={() => setProjectDropdownOpen(true)}
                    placeholder="Search project..."
                    value={projectQuery}
                  />

                  {projectDropdownOpen && (
                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-sm">
                      {projectsLoading && <div className="px-3 py-2 text-sm text-slate-500">Loading projects...</div>}
                      {!projectsLoading && projectsError && (
                        <div className="px-3 py-2 text-sm text-red-600">{projectsError}</div>
                      )}
                      {!projectsLoading && !projectsError && projectOptions.length === 0 && (
                        <div className="px-3 py-2 text-sm text-slate-500">No projects found.</div>
                      )}
                      {!projectsLoading &&
                        !projectsError &&
                        projectOptions.map((project) => (
                          <button
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                            key={project.id}
                            onClick={() => {
                              setValue('projectId', project.id, { shouldValidate: true });
                              setSelectedProjectName(project.name);
                              setProjectQuery(project.name);
                              setProjectDropdownOpen(false);
                            }}
                            type="button"
                          >
                            {project.name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                {projectIdValue && (
                  <span className="mt-1 block text-xs text-slate-500">
                    Selected: {selectedProjectName || projectIdValue}
                  </span>
                )}
                {errors.projectId && <span className="mt-1 block text-sm text-red-600">{errors.projectId.message}</span>}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">Type</span>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2" {...register('type')}>
                  <option value="Bug">Bug</option>
                  <option value="Feature">Feature</option>
                  <option value="Content">Content</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Tracking">Tracking</option>
                  <option value="Plugin">Plugin</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">Title</span>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2" {...register('title')} />
                {errors.title && <span className="mt-1 block text-sm text-red-600">{errors.title.message}</span>}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">Description</span>
                <textarea className="w-full rounded-md border border-slate-300 px-3 py-2" rows={5} {...register('description')} />
                {errors.description && <span className="mt-1 block text-sm text-red-600">{errors.description.message}</span>}
              </label>

              {isTibaUser && (
                <AssigneeSelect
                  allowUnassigned
                  label="Assignee (optional)"
                  onChange={(assigneeUserId) => {
                    setValue('assigneeUserId', assigneeUserId ?? undefined, { shouldDirty: true });
                  }}
                  value={watch('assigneeUserId') ?? null}
                />
              )}
            </div>
          )}

          {step === 2 && (
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Attachments</span>
                <input
                  accept="image/*,application/pdf"
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  multiple
                  onChange={(e) => addFiles(e.target.files)}
                  type="file"
                />
                <span className="mt-1 block text-xs text-slate-500">{acceptedLabel}</span>
              </label>

              <ul className="space-y-2">
                {selectedFiles.map((item) => (
                  <li className="flex items-center justify-between rounded-md border border-slate-200 p-3" key={item.id}>
                    <div>
                      <p className="text-sm font-medium">{item.file.name}</p>
                      <p className="text-xs text-slate-500">
                        {item.file.type || 'unknown type'} - {item.file.size} bytes - {item.state}
                      </p>
                      {item.error && <p className="text-xs text-red-600">{item.error}</p>}
                    </div>
                    <button
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs"
                      onClick={() => removeFile(item.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </li>
                ))}
                {selectedFiles.length === 0 && <li className="text-sm text-slate-500">No files selected.</li>}
              </ul>
            </div>
          )}
        </div>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <div className="flex gap-3">
          {step === 2 && (
            <button
              className="rounded-md border border-slate-300 bg-white px-4 py-2"
              onClick={() => setStep(1)}
              type="button"
            >
              Back
            </button>
          )}

          {step === 1 ? (
            <button
              className="rounded-md border border-slate-300 bg-white px-4 py-2"
              onClick={async () => {
                const valid = await trigger();
                if (valid) {
                  setStep(2);
                }
              }}
              type="button"
            >
              Continue
            </button>
          ) : (
            <button
              className="rounded-md border border-slate-300 bg-white px-4 py-2"
              disabled={submitting}
              onClick={() => void handleFinalSubmit()}
              type="button"
            >
              {submitting ? 'Creating...' : 'Create Ticket'}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
