'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  type BlogPost,
} from '@/lib/api';

interface Section { heading: string; body: string; }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

const BLANK_FORM = {
  title:          '',
  slug:           '',
  category:       '',
  excerpt:        '',
  published_date: '',
  read_time:      '5 min read',
  sort_order:     0,
  is_published:   false,
};

export default function AdminBlogPage() {
  const qc = useQueryClient();

  const [search,          setSearch]          = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page,            setPage]            = useState(1);
  const [msg,             setMsg]             = useState('');
  const [showForm,        setShowForm]        = useState(false);
  const [editingPost,     setEditingPost]     = useState<BlogPost | null>(null);
  const [form,            setForm]            = useState(BLANK_FORM);
  const [sections,        setSections]        = useState<Section[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350);
  }

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(''), 3500);
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-blog-posts', debouncedSearch, page],
    queryFn:  () => getAdminBlogPosts({ search: debouncedSearch || undefined, page }),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: createBlogPost,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      setShowForm(false);
      setForm(BLANK_FORM);
      setSections([]);
      flash('Blog post created.');
    },
    onError: (e: Error) => flash(e.message || 'Failed to create post.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<BlogPost> }) =>
      updateBlogPost(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      setEditingPost(null);
      flash('Blog post updated.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBlogPost,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      flash('Blog post unpublished.');
    },
  });

  const posts: BlogPost[] = data?.data ?? [];

  function openEdit(post: BlogPost) {
    setEditingPost(post);
    setForm({
      title:          post.title,
      slug:           post.slug,
      category:       post.category,
      excerpt:        post.excerpt,
      published_date: post.published_date,
      read_time:      post.read_time,
      sort_order:     post.sort_order,
      is_published:   post.is_published,
    });
    setSections((post.sections as Section[]) ?? []);
    setShowForm(false);
  }

  function addSection() {
    setSections((s) => [...s, { heading: '', body: '' }]);
  }
  function updateSection(i: number, key: keyof Section, val: string) {
    setSections((s) => s.map((sec, idx) => idx === i ? { ...sec, [key]: val } : sec));
  }
  function removeSection(i: number) {
    setSections((s) => s.filter((_, idx) => idx !== i));
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, sort_order: Number(form.sort_order), sections };
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-utu-text-primary">Blog Posts</h1>
          <p className="mt-1 text-sm text-utu-text-muted">
            Manage travel guides and articles shown on /blog.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingPost(null); setForm(BLANK_FORM); setSections([]); }}
          className="shrink-0 rounded-lg bg-utu-navy hover:bg-utu-blue text-white text-sm font-semibold px-4 py-2 transition-colors"
        >
          + New post
        </button>
      </div>

      {msg && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
          {msg}
        </div>
      )}

      {/* Create / Edit form */}
      {(showForm || editingPost) && (
        <form
          onSubmit={handleFormSubmit}
          className="rounded-xl border border-utu-border-default bg-utu-bg-card p-5 shadow-sm space-y-5"
        >
          <h2 className="font-semibold text-utu-text-primary">
            {editingPost ? `Edit: ${editingPost.title}` : 'New blog post'}
          </h2>

          {/* Basic fields */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  title: e.target.value,
                  slug: editingPost ? f.slug : slugify(e.target.value),
                }))}
                placeholder="e.g. Hajj 2026 Complete Guide"
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Slug *</label>
              <input
                required
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                placeholder="e.g. hajj-2026-guide"
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Category *</label>
              <input
                required
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Hajj & Umrah"
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Published date</label>
              <input
                value={form.published_date}
                onChange={(e) => setForm((f) => ({ ...f, published_date: e.target.value }))}
                placeholder="e.g. April 2026"
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Read time</label>
              <input
                value={form.read_time}
                onChange={(e) => setForm((f) => ({ ...f, read_time: e.target.value }))}
                placeholder="e.g. 8 min read"
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-utu-text-secondary mb-1">Sort order</label>
              <input
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
                className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-utu-text-secondary mb-1">Excerpt *</label>
            <textarea
              required
              rows={2}
              value={form.excerpt}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              placeholder="One-sentence summary shown on the blog listing page…"
              className="w-full rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
            />
          </div>

          {/* Sections editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-utu-text-secondary">Article sections</label>
              <button
                type="button"
                onClick={addSection}
                className="text-xs text-utu-blue hover:underline font-medium"
              >
                + Add section
              </button>
            </div>
            {sections.length === 0 && (
              <p className="text-xs text-utu-text-muted italic">No sections yet. Click &quot;+ Add section&quot; to add article content.</p>
            )}
            <div className="space-y-3">
              {sections.map((sec, i) => (
                <div key={i} className="rounded-lg border border-utu-border-default p-3 space-y-2 bg-utu-bg-muted">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-utu-text-muted font-medium">Section {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeSection(i)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    value={sec.heading}
                    onChange={(e) => updateSection(i, 'heading', e.target.value)}
                    placeholder="Section heading"
                    className="w-full rounded border border-utu-border-default px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-utu-blue"
                  />
                  <textarea
                    rows={3}
                    value={sec.body}
                    onChange={(e) => updateSection(i, 'body', e.target.value)}
                    placeholder="Section body text…"
                    className="w-full rounded border border-utu-border-default px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-utu-blue"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-utu-text-secondary">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                className="rounded border-utu-border-default"
              />
              Publish immediately
            </label>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingPost(null); }}
              className="rounded-lg border border-utu-border-default px-4 py-2 text-sm text-utu-text-secondary hover:bg-utu-bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-utu-navy hover:bg-utu-blue text-white text-sm font-semibold px-4 py-2 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving…' : (editingPost ? 'Save changes' : 'Create post')}
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <div>
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by title, slug or category…"
          className="w-72 rounded-lg border border-utu-border-default px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-utu-blue"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-utu-border-default bg-utu-bg-card shadow-sm">
        {isLoading && <div className="p-10 text-center text-sm text-utu-text-muted">Loading…</div>}
        {isError   && <div className="p-10 text-center text-sm text-red-500">Failed to load blog posts.</div>}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-sm">
              <thead className="bg-utu-bg-muted">
                <tr>
                  {['Title', 'Slug', 'Category', 'Sort', 'Status', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-utu-text-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-utu-bg-muted">
                    <td className="px-4 py-3 font-medium text-utu-text-primary max-w-[200px] truncate">
                      {post.title}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-utu-text-muted max-w-[160px] truncate">
                      {post.slug}
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-secondary">{post.category}</td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted text-center">{post.sort_order}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => updateMutation.mutate({ id: post.id, payload: { is_published: !post.is_published } })}
                        disabled={updateMutation.isPending}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          post.is_published
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-utu-bg-subtle text-utu-text-muted hover:bg-utu-bg-muted'
                        }`}
                      >
                        {post.is_published ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-utu-text-muted whitespace-nowrap">
                      {formatDate(post.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openEdit(post)}
                          className="rounded border border-utu-border-default px-2.5 py-1 text-xs text-utu-blue hover:bg-utu-bg-subtle transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Unpublish "${post.title}"?`)) {
                              deleteBlogPost(post.id).then(() => {
                                qc.invalidateQueries({ queryKey: ['admin-blog-posts'] });
                                flash('Post unpublished.');
                              });
                            }
                          }}
                          disabled={deleteMutation.isPending || !post.is_published}
                          className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                        >
                          Unpublish
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {posts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-utu-text-muted">
                      No blog posts yet. Click &quot;+ New post&quot; to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && (
        <div className="flex items-center justify-between text-sm text-utu-text-muted">
          <span>{data.total.toLocaleString()} total</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40"
            >
              Previous
            </button>
            <span className="flex items-center px-2">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={posts.length < 50}
              className="rounded border border-utu-border-default px-3 py-1.5 hover:bg-utu-bg-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
