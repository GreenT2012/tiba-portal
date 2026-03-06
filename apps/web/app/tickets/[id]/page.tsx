'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { AssigneeSelect, assigneeDisplayLabel } from '@/components/users/assignee-select';
import {
  addTicketComment,
  assignTicket,
  getTicket,
  presignTicketAttachmentDownload,
  presignTicketAttachmentUpload,
  updateTicketStatus,
  type TicketDetail
} from '@/features/tickets/api';

type TicketAttachment = TicketDetail['attachments'][number];

type UploadState = 'pending' | 'uploading' | 'done' | 'failed';

type SelectedFile = {
  id: string;
  file: File;
  state: UploadState;
  error?: string;
};

type PreviewModalState = {
  attachmentId: string;
  filename: string;
  mime: string;
  url: string;
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
  const [downloadUrlCache, setDownloadUrlCache] = useState<Record<string, string>>({});
  const [attachmentLoadingId, setAttachmentLoadingId] = useState<string | null>(null);
  const [attachmentErrors, setAttachmentErrors] = useState<Record<string, string | null>>({});
  const [previewModal, setPreviewModal] = useState<PreviewModalState | null>(null);

  const loadTicket = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getTicket(ticketId);
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
      await addTicketComment(ticketId, { body: commentBody.trim() });

      setCommentBody('');
      await loadTicket();
    } catch (submitError) {
      setCommentError(submitError instanceof Error ? submitError.message : 'Failed to add comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const getAttachmentDownloadUrl = async (attachmentId: string): Promise<string> => {
    const cached = downloadUrlCache[attachmentId];
    if (cached) {
      return cached;
    }

    setAttachmentLoadingId(attachmentId);
    setAttachmentErrors((prev) => ({ ...prev, [attachmentId]: null }));

    try {
      const data = await presignTicketAttachmentDownload(ticketId, attachmentId);
      setDownloadUrlCache((prev) => ({ ...prev, [attachmentId]: data.downloadUrl }));
      return data.downloadUrl;
    } catch (downloadError) {
      const message = downloadError instanceof Error ? downloadError.message : 'Failed to load preview URL';
      setAttachmentErrors((prev) => ({ ...prev, [attachmentId]: message }));
      throw downloadError;
    } finally {
      setAttachmentLoadingId(null);
    }
  };

  const downloadAttachment = async (attachmentId: string) => {
    const url = await getAttachmentDownloadUrl(attachmentId);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openPreview = async (attachment: TicketAttachment) => {
    const url = await getAttachmentDownloadUrl(attachment.id);
    setPreviewModal({
      attachmentId: attachment.id,
      filename: attachment.filename,
      mime: attachment.mime,
      url
    });
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
          const presign = await presignTicketAttachmentUpload(ticketId, {
            filename: fileEntry.file.name,
            mime: fileEntry.file.type,
            sizeBytes: fileEntry.file.size
          });

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
      await updateTicketStatus(ticketId, { status });

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
      await assignTicket(ticketId, { assigneeUserId });

      await loadTicket();
    } catch (updateError) {
      setAssignError(updateError instanceof Error ? updateError.message : 'Failed to update assignee');
    } finally {
      setAssignUpdating(false);
    }
  };

  const assigneeText = ticket?.assignee
    ? assigneeDisplayLabel(ticket.assignee)
    : ticket?.assigneeUserId
      ? ticket.assigneeUserId.slice(0, 8)
      : 'unassigned';

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
            <p className="mt-1 text-sm text-slate-600">assignee: {assigneeText}</p>
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
                    selectedAssignee={ticket.assignee ?? null}
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
                <div className="rounded-md border border-slate-200 p-3" key={attachment.id}>
                  <div>
                    <p className="text-sm font-medium">{attachment.filename}</p>
                    <p className="text-xs text-slate-500">
                      {attachment.mime} - {attachment.sizeBytes} bytes - {new Date(attachment.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {attachment.mime.startsWith('image/') && downloadUrlCache[attachment.id] ? (
                    <button className="mt-3 block" onClick={() => void openPreview(attachment)} type="button">
                      <img
                        alt={attachment.filename}
                        className="h-24 w-24 rounded border border-slate-200 object-cover"
                        src={downloadUrlCache[attachment.id]}
                      />
                    </button>
                  ) : null}

                  <div className="mt-3 flex items-center gap-2">
                    {(attachment.mime.startsWith('image/') || attachment.mime === 'application/pdf') && (
                      <button
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        disabled={attachmentLoadingId === attachment.id}
                        onClick={() => void openPreview(attachment)}
                        type="button"
                      >
                        {attachmentLoadingId === attachment.id ? 'Loading preview...' : 'Preview'}
                      </button>
                    )}
                    <button
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      disabled={attachmentLoadingId === attachment.id}
                      onClick={() => void downloadAttachment(attachment.id)}
                      type="button"
                    >
                      Download
                    </button>
                  </div>
                  {attachmentErrors[attachment.id] && (
                    <p className="mt-2 text-xs text-red-600">{attachmentErrors[attachment.id]}</p>
                  )}
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

      {previewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-md bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium">{previewModal.filename}</h4>
              <button
                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm"
                onClick={() => setPreviewModal(null)}
                type="button"
              >
                Close
              </button>
            </div>

            {previewModal.mime.startsWith('image/') ? (
              <img alt={previewModal.filename} className="max-h-[75vh] w-full object-contain" src={previewModal.url} />
            ) : previewModal.mime === 'application/pdf' ? (
              <iframe className="h-[75vh] w-full rounded border border-slate-200" src={previewModal.url} title={previewModal.filename} />
            ) : (
              <p className="text-sm text-slate-600">Preview is not available for this file type.</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
