'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
  type EmailTemplate,
} from '@/lib/api';

function PreviewModal({ html, onClose }: { html: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-utu-bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
          <h2 className="text-lg font-semibold text-utu-text-primary">Template Preview</h2>
          <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary">✕</button>
        </div>
        <div className="flex-1 overflow-hidden p-4">
          <iframe
            srcDoc={html}
            sandbox="allow-same-origin"
            className="h-full w-full rounded-lg border border-utu-border-default"
            title="Email preview"
          />
        </div>
      </div>
    </div>
  );
}

function TemplatePanel({
  template,
  onClose,
}: {
  template: EmailTemplate | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!template;

  const [form, setForm] = useState({
    name:        template?.name        ?? '',
    description: template?.description ?? '',
    subject_en:  template?.subject_en  ?? '',
    subject_ar:  template?.subject_ar  ?? '',
    html_en:     template?.html_en     ?? '',
    html_ar:     template?.html_ar     ?? '',
  });
  const [preview, setPreview] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () => isEdit
      ? updateTemplate(template!.id, form)
      : createTemplate({ ...form, variables: ['user.name','campaign.name','deals','unsubscribe_url'] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); onClose(); },
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
        <div className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-utu-bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-utu-border-default px-6 py-4">
            <h2 className="text-lg font-semibold text-utu-text-primary">
              {isEdit ? 'Edit Template' : 'New Template'}
            </h2>
            <button onClick={onClose} className="text-utu-text-muted hover:text-utu-text-primary">✕</button>
          </div>

          <div className="flex-1 space-y-4 px-6 py-5">
            {[
              { label: 'Template Name', key: 'name', placeholder: 'e.g. monthly_deal_digest', type: 'text' },
              { label: 'Description',  key: 'description', placeholder: 'Internal description (optional)', type: 'text' },
              { label: 'Subject (EN)', key: 'subject_en', placeholder: 'Exclusive Deals — UTUBooking', type: 'text' },
              { label: 'Subject (AR)', key: 'subject_ar', placeholder: 'عروض حصرية — UTUBooking', type: 'text', dir: 'rtl' },
            ].map(({ label, key, placeholder, type, dir }) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-utu-text-secondary">{label}</label>
                <input type={type} dir={dir} placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue" />
              </div>
            ))}

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium text-utu-text-secondary">HTML Body (EN)</label>
                {form.html_en && (
                  <button onClick={() => setPreview(form.html_en)}
                    className="text-xs font-medium text-utu-blue hover:underline">Preview</button>
                )}
              </div>
              <textarea value={form.html_en} rows={10}
                onChange={e => setForm(f => ({ ...f, html_en: e.target.value }))}
                placeholder="<!DOCTYPE html>..."
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium text-utu-text-secondary">HTML Body (AR) — optional</label>
                {form.html_ar && (
                  <button onClick={() => setPreview(form.html_ar)}
                    className="text-xs font-medium text-utu-blue hover:underline">Preview</button>
                )}
              </div>
              <textarea value={form.html_ar} rows={6} dir="rtl"
                onChange={e => setForm(f => ({ ...f, html_ar: e.target.value }))}
                placeholder="<!DOCTYPE html dir='rtl'>..."
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-utu-blue" />
            </div>

            <p className="text-xs text-utu-text-muted">
              Available variables: {'{{'} user.name {'}}'}, {'{{'} campaign.name {'}}'}, {'{{'} deals {'}}'}, {'{{'} unsubscribe_url {'}}'}
            </p>
          </div>

          <div className="border-t border-utu-border-default px-6 py-4">
            {saveMutation.isError && <p className="mb-3 text-xs text-red-500">Failed to save template.</p>}
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 rounded-lg border border-utu-border-default py-2.5 text-sm font-medium text-utu-text-secondary hover:bg-utu-bg-muted">
                Cancel
              </button>
              <button onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !form.name || !form.subject_en || !form.html_en}
                className="flex-1 rounded-lg bg-utu-blue py-2.5 text-sm font-medium text-white disabled:opacity-40">
                {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {preview && <PreviewModal html={preview} onClose={() => setPreview(null)} />}
    </>
  );
}

export default function TemplatesPage() {
  const qc = useQueryClient();
  const [panelTemplate, setPanelTemplate] = useState<EmailTemplate | 'new' | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['templates'],
    queryFn:  getTemplates,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-utu-text-primary">Email Templates</h1>
          <p className="mt-1 text-sm text-utu-text-muted">Reusable HTML email layouts for campaigns.</p>
        </div>
        <button onClick={() => setPanelTemplate('new')}
          className="rounded-lg bg-utu-blue px-4 py-2 text-sm font-medium text-white">
          New Template
        </button>
      </div>

      {isLoading && <div className="py-8 text-center text-sm text-utu-text-muted">Loading templates...</div>}
      {isError   && <div className="py-8 text-center text-sm text-red-500">Failed to load templates.</div>}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((t: EmailTemplate) => (
            <div key={t.id} className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 space-y-3">
              <div>
                <p className="font-semibold text-utu-text-primary">{t.name}</p>
                {t.description && <p className="text-xs text-utu-text-muted mt-0.5">{t.description}</p>}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-utu-text-secondary truncate"><span className="font-medium">EN:</span> {t.subject_en}</p>
                {t.subject_ar && (
                  <p className="text-xs text-utu-text-secondary truncate" dir="rtl"><span className="font-medium">AR:</span> {t.subject_ar}</p>
                )}
              </div>
              <p className="text-xs text-utu-text-muted">
                Updated {new Date(t.updated_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setPreview(t.html_en)}
                  className="rounded border border-utu-border-default px-3 py-1 text-xs text-utu-text-secondary hover:bg-utu-bg-muted">
                  Preview
                </button>
                <button onClick={() => setPanelTemplate(t)}
                  className="rounded border border-utu-border-default px-3 py-1 text-xs text-utu-text-secondary hover:bg-utu-bg-muted">
                  Edit
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteMutation.mutate(t.id); }}
                  disabled={deleteMutation.isPending}
                  className="ms-auto rounded border border-red-200 px-3 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {data.data.length === 0 && (
            <div className="col-span-3 rounded-xl border border-utu-border-default bg-utu-bg-card p-8 text-center text-utu-text-muted">
              No templates yet. Create one to get started.
            </div>
          )}
        </div>
      )}

      {panelTemplate !== null && (
        <TemplatePanel
          template={panelTemplate === 'new' ? null : panelTemplate}
          onClose={() => setPanelTemplate(null)}
        />
      )}

      {preview && <PreviewModal html={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
