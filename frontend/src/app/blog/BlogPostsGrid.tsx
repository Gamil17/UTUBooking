'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Post {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  date: string;
}

interface Category {
  key: string;
  label: string;
}

interface Props {
  posts: Post[];
  categories: Category[];
  allLabel: string;
  readMoreLabel: string;
  moreComingSoon: string;
}

export default function BlogPostsGrid({ posts, categories, allLabel, readMoreLabel, moreComingSoon }: Props) {
  const [active, setActive] = useState(allLabel);

  const visible = active === allLabel
    ? posts
    : posts.filter((p) => p.category === active);

  return (
    <>
      {/* Category filter bar */}
      <div className="bg-utu-bg-card border-b border-utu-border-default sticky top-14 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActive(cat.label)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                active === cat.label
                  ? 'bg-emerald-700 text-white'
                  : 'text-utu-text-secondary hover:bg-utu-bg-muted'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts grid */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {visible.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visible.map((post) => (
              <article
                key={post.slug}
                className="bg-utu-bg-card rounded-2xl border border-utu-border-default shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
                  {post.category}
                </span>
                <h2 className="text-lg font-bold text-utu-text-primary mb-2 leading-snug">{post.title}</h2>
                <p className="text-sm text-utu-text-muted leading-relaxed mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-utu-text-muted">{post.date}</span>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-600 transition-colors"
                  >
                    {readMoreLabel}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-utu-text-muted py-12">{moreComingSoon}</p>
        )}

        <p className="text-center text-sm text-utu-text-muted mt-10">{moreComingSoon}</p>
      </div>
    </>
  );
}
