'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { AssigneeSelect } from '@/components/users/assignee-select';

type TicketComment = {
  id: string;
  authorUserId: string;
  body: string;
  createdAt: string;
};

type TicketAttachment = {
  id: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  createdAt: string;
};

type TicketDetail = {
  id: string;
  title: string;
  type: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  updatedAt: string;
  assigneeUserId: string | null;
  description: string;
  comments: TicketComment[];
  attachments: TicketAttachment[];
};

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

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const ticketId = params.id;

  const isTibaUser = Boolean(session?.roles?.includes('tiba_agent') || session?.roles?.includes('tiba_admin'));

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [commentBody, setCommentBody] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [selectedAssigneeUserId, setSelectedAssigneeUserId] = useState<string | null>(null);
  const [assignUpdating, setAssignUpdating] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);

  const loadTicket = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/backend/tickets/${ticketId}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as TicketDetail;
      setTicket(data);
      setSelectedAssigneeUserId(data.assigneeUserId ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ticketId) {
      return;
    }
    void loadTicket();
  }, [ticketId]);

  const submitComment = async () => {
    if (!commentBody.trim()) {
      return;
    }

    setCommentSubmitting(true);
    setCommentError(null);

    try {
      const response = await fetch(`/api/backend/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentBody.trim() })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setCommentBody('');
      await loadTicket();
    } catch (submitError) {
      setCommentError(submitError instanceof Error ? submitError.message : 'Failed to add comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const downloadAttachment = async (attachmentId: string) => {
    const response = await fetch(`/api/backend/tickets/${ticketId}/attachments/${attachmentId}/presign-download`);
    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = (await response.json()) as { downloadUrl: string };
    window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
  };

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
    setSelectedFiles((prev) => prev.filter((entry) => entry.id !== id));
  };

  const setFileState = (id: string, state: UploadState, error?: string) => {
    setSelectedFiles((prev) => prev.map((entry) => (entry.id === id ? { ...entry, state, error } : entry)));
  };

  const uploadAttachments = async () => {
    if (!selectedFiles.length) {
      return;
    }

    setUploadingAttachments(true);
    setAttachmentsError(null);

    try {
      let hasFailure = false;

      for (const fileEntry of selectedFiles) {
        if (fileEntry.state === 'done') {
          continue;
        }

        setFileState(fileEntry.id, 'uploading');

        try {
          const presignResponse = await fetch(`/api/backend/tickets/${ticketId}/attachments/presign-upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: fileEntry.file.name,
              mime: fileEntry.file.type,
              sizeBytes: fileEntry.file.size
            })
          });

          if (!presignResponse.ok) {
            throw new Error(await presignResponse.text());
          }

          const presign = (await presignResponse.json()) as {
            uploadUrl: string;
            requiredHeaders?: { 'Content-Type'?: string };
          };

          const uploadResponse = await fetch(presign.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': presign.requiredHeaders?.['Content-Type'] ?? fileEntry.file.type
            },
            body: fileEntry.file
          });

          if (!uploadResponse.ok) {
            throw new Error('Upload failed');
          }

          setFileState(fileEntry.id, 'done');
        } catch (uploadError) {
          hasFailure = true;
          setFileState(fileEntry.id, 'failed', uploadError instanceof Error ? uploadError.message : 'Upload failed');
        }
      }

      if (hasFailure) {
        throw new Error('Some files failed to upload. Retry failed files.');
      }

      await loadTicket();
    } catch (uploadError) {
      setAttachmentsError(uploadError instanceof Error ? uploadError.message : 'Attachment upload failed');
    } finally {
      setUploadingAttachments(false);
    }
  };

  const updateStatus = async (status: TicketDetail['status']) => {
    setStatusUpdating(true);
    setStatusError(null);

    try {
      const response = await fetch(`/api/backend/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadTicket();
    } catch (updateError) {
      setStatusError(updateError instanceof Error ? updateError.message : 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const updateAssignee = async (assigneeUserId: string | null) => {
    setAssignUpdating(true);
    setAssignError(null);

    try {
      const response = await fetch(`/api/backend/tickets/${ticketId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeUserId })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadTicket();
    } catch (updateError) {
      setAssignError(updateError instanceof Error ? updateError.message : 'Failed to update assignee');
    } finally {
      setAssignUpdating(false);
    }
  };

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ticket Detail</h1>
        <Link className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm" href="/tickets">
          Back to Tickets
        </Link>
      </div>

      {loading && <p className="text-slate-600">Loading ticket...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && ticket && (
        <div className="space-y-6">
          <section className="rounded-md border border-slate-200 bg-white p-4">
            <h2 className="text-xl font-semibold text-slate-900">{ticket.title}</h2>
            <p className="mt-2 text-sm text-slate-700">{ticket.description}</p>
            <p className="mt-3 text-sm text-slate-600">
              {ticket.type} - {ticket.status} - updated {new Date(ticket.updatedAt).toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-slate-600">assignee: {ticket.assigneeUserId ?? 'unassigned'}</p>
          </section>

          {isTibaUser && (
            <section className="rounded-md border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-medium">TIBA Controls</h3>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Status</label>
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                    disabled={statusUpdating}
                    onChange={(event) => {
                      void updateStatus(event.target.value as TicketDetail['status']);
                    }}
                    value={ticket.status}
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                  {statusError && <p className="mt-1 text-sm text-red-600">{statusError}</p>}
                </div>

                <div>
                  <AssigneeSelect
                    allowUnassigned
                    disabled={assignUpdating}
                    onChange={(assigneeUserId) => setSelectedAssigneeUserId(assigneeUserId)}
                    value={selectedAssigneeUserId}
                  />

                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      disabled={assignUpdating}
                      onClick={() => {
                        void updateAssignee(selectedAssigneeUserId);
                      }}
                      type="button"
                    >
                      Save assignee
                    </button>
                  </div>
                  {assignError && <p className="mt-1 text-sm text-red-600">{assignError}</p>}
                </div>
              </div>
            </section>
          )}

          <section className="rounded-md border border-slate-200 bg-white p-4">
            <h3 className="text-lg font-medium">Comments</h3>

            <div className="mt-3 space-y-3">
              {ticket.comments.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}
              {ticket.comments.map((comment) => (
                <article className="rounded-md border border-slate-200 p-3" key={comment.id}>
                  <p className="text-sm text-slate-800">{comment.body}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {comment.authorUserId} - {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium">Add comment</label>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                onChange={(event) => setCommentBody(event.target.value)}
                rows={4}
                value={commentBody}
              />
              {commentError && <p className="mt-1 text-sm text-red-600">{commentError}</p>}
              <button
                className="mt-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm"
                disabled={commentSubmitting || !commentBody.trim()}
                onClick={() => void submitComment()}
                type="button"
              >
                {commentSubmitting ? 'Adding...' : 'Add Comment'}
              </button>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4">
            <h3 className="text-lg font-medium">Attachments</h3>

            <div className="mt-3 space-y-2">
              {ticket.attachments.length === 0 && <p className="text-sm text-slate-500">No attachments yet.</p>}
              {ticket.attachments.map((attachment) => (
                <div className="flex items-center justify-between rounded-md border border-slate-200 p-3" key={attachment.id}>
                  <div>
                    <p className="text-sm font-medium">{attachment.filename}</p>
                    <p className="text-xs text-slate-500">
                      {attachment.mime} - {attachment.sizeBytes} bytes - {new Date(attachment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    onClick={() => void downloadAttachment(attachment.id)}
                    type="button"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-medium">Add attachments</h4>
              <input
                accept="image/*,application/pdf"
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
                multiple
                onChange={(event) => addFiles(event.target.files)}
                type="file"
              />
              <p className="mt-1 text-xs text-slate-500">
                Images and PDFs only, max {Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))}MB per file
              </p>

              <ul className="mt-3 space-y-2">
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

              {attachmentsError && <p className="mt-2 text-sm text-red-600">{attachmentsError}</p>}

              <button
                className="mt-3 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm"
                disabled={uploadingAttachments || selectedFiles.length === 0}
                onClick={() => void uploadAttachments()}
                type="button"
              >
                {uploadingAttachments ? 'Uploading...' : 'Upload attachments'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
