'use client';

import React, { useRef, useState } from 'react';
import { SITE_CONFIG } from '@/lib/siteConfig';

interface Props {
  role: string;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ACCEPTED_EXTS = '.pdf,.doc,.docx';

const inputClass =
  'border border-utu-border-default rounded-xl px-3 py-2.5 text-sm text-utu-text-primary placeholder:text-utu-text-muted focus:outline-none focus:ring-2 focus:ring-utu-blue focus:border-transparent';

export default function CareerApplicationForm({ role }: Props) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    coverLetter: '',
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setCvError('');
    if (!file) { setCvFile(null); return; }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setCvError('Only PDF, DOC, or DOCX files are accepted.');
      e.target.value = '';
      setCvFile(null);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setCvError('File must be under 5 MB.');
      e.target.value = '';
      setCvFile(null);
      return;
    }
    setCvFile(file);
  }

  function removeFile() {
    setCvFile(null);
    setCvError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const data = new FormData();
    data.append('role', role);
    data.append('name', form.name.trim());
    data.append('email', form.email.trim());
    data.append('phone', form.phone.trim());
    data.append('linkedinUrl', form.linkedinUrl.trim());
    data.append('coverLetter', form.coverLetter.trim());
    if (cvFile) data.append('cv', cvFile);

    try {
      const res = await fetch('/api/careers/apply', { method: 'POST', body: data });
      if (res.ok) {
        setStatus('success');
      } else {
        const json = await res.json().catch(() => ({}));
        setErrorMsg(json.message || 'Something went wrong. Please try again.');
        setStatus('error');
      }
    } catch {
      setErrorMsg(
        `Unable to submit your application. Please email us directly at ${SITE_CONFIG.careersEmail}`
      );
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-8 text-center">
        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-7 h-7 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-utu-text-primary mb-2">Application Received!</h3>
        <p className="text-sm text-utu-text-muted mb-1">
          Thank you for applying for the{' '}
          <span className="font-medium text-utu-text-primary">{role}</span> position.
        </p>
        <p className="text-sm text-utu-text-muted">
          Our team will review your application and get back to you within 5&ndash;7 business days.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm p-6 space-y-4"
    >
      {status === 'error' && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Role (read-only) */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">
          Applying For
        </label>
        <input
          type="text"
          readOnly
          value={role}
          className={`${inputClass} bg-utu-bg-subtle cursor-default`}
          aria-label="Position you are applying for"
        />
      </div>

      {/* Name + Email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Your full name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Phone + LinkedIn */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">
            Phone{' '}
            <span className="text-utu-text-muted font-normal normal-case">(optional)</span>
          </label>
          <input
            type="tel"
            placeholder="+966 5x xxx xxxx"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">
            LinkedIn / Portfolio{' '}
            <span className="text-utu-text-muted font-normal normal-case">(optional)</span>
          </label>
          <input
            type="url"
            placeholder="https://linkedin.com/in/yourprofile"
            value={form.linkedinUrl}
            onChange={(e) => set('linkedinUrl', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* CV Upload */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">
          CV / Resume{' '}
          <span className="text-utu-text-muted font-normal normal-case">(optional — PDF, DOC, DOCX, max 5 MB)</span>
        </label>

        {cvFile ? (
          /* File selected — show preview chip */
          <div className="flex items-center gap-3 border border-utu-border-default rounded-xl px-4 py-3 bg-utu-bg-subtle">
            <svg
              className="w-5 h-5 text-utu-blue flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <span className="text-sm text-utu-text-primary truncate flex-1">{cvFile.name}</span>
            <span className="text-xs text-utu-text-muted flex-shrink-0">
              {(cvFile.size / 1024).toFixed(0)} KB
            </span>
            <button
              type="button"
              onClick={removeFile}
              aria-label="Remove CV file"
              className="flex-shrink-0 text-utu-text-muted hover:text-red-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          /* Drop zone / upload button */
          <label
            htmlFor="cv-upload"
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-utu-border-default rounded-xl px-4 py-6 cursor-pointer hover:border-utu-blue hover:bg-utu-bg-subtle transition-colors"
          >
            <svg
              className="w-8 h-8 text-utu-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <span className="text-sm text-utu-text-secondary font-medium">
              Click to upload your CV
            </span>
            <span className="text-xs text-utu-text-muted">PDF, DOC, DOCX up to 5 MB</span>
            <input
              id="cv-upload"
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTS}
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
        )}

        {cvError && (
          <p className="text-xs text-red-600 mt-1">{cvError}</p>
        )}
      </div>

      {/* Cover Letter */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-utu-text-secondary uppercase tracking-wide">
          Why do you want to join UTUBooking? <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          rows={5}
          placeholder="Tell us about yourself, your experience, and why this role excites you..."
          value={form.coverLetter}
          onChange={(e) => set('coverLetter', e.target.value)}
          className={`${inputClass} resize-none`}
        />
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-utu-navy hover:bg-utu-blue active:bg-utu-navy text-white text-sm font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 min-h-[44px]"
      >
        {status === 'loading' ? 'Submitting…' : 'Submit Application'}
      </button>

      <p className="text-center text-xs text-utu-text-muted">
        Questions? Email us at{' '}
        <a href={`mailto:${SITE_CONFIG.careersEmail}`} className="text-utu-blue underline">
          {SITE_CONFIG.careersEmail}
        </a>
      </p>
    </form>
  );
}
