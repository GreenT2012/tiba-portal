'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const ticketSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  type: z.enum(['Bug', 'Feature', 'Content', 'Marketing', 'Tracking', 'Plugin']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required')
});

type TicketFormValues = z.infer<typeof ticketSchema>;

type UploadState = 'pending' | 'uploading' | 'done' | 'failed';

type SelectedFile = {
  id: string;
  file: File;
  state: UploadState;
  error?: string;
};

const MAX_ATTACHMENT_BYTES = Number(process.env.NEXT_PUBLIC_MAX_ATTACHMENT_BYTES ?? 10 * 1024 * 1024);

function isAllowedMime(mime: string) {
  return mime === 'application/pdf' || mime.startsWith('image/');
}

export default function NewTicketPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors }
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      projectId: '',
      type: 'Bug',
      title: '',
      description: ''
    }
  });

  const acceptedLabel = useMemo(() => `Images and PDFs up to ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))}MB`, []);

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

      for (const fileEntry of selectedFiles) {
        if (fileEntry.state === 'failed') {
          continue;
        }

        setFileState(fileEntry.id, 'uploading');

        try {
          const presignRes = await fetch(`/api/backend/tickets/${ticket.id}/attachments/presign-upload`, {
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
          setFileState(fileEntry.id, 'failed', error instanceof Error ? error.message : 'Upload failed');
        }
      }

      router.push('/tickets');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Ticket creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Ticket</h1>
        <Link className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm" href="/tickets">
          Back to Tickets
        </Link>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-700">Step {step} of 2</p>

          {step === 1 && (
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Project ID</span>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2" {...register('projectId')} />
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
            <button className="rounded-md border border-slate-300 bg-white px-4 py-2" disabled={submitting} type="submit">
              {submitting ? 'Creating...' : 'Create Ticket'}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
