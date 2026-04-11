'use strict';

/**
 * Migration 040 — Blog Posts
 *
 * Creates the blog_posts table so travel guides and articles on /blog are
 * managed from the admin dashboard at /admin/blog rather than being hardcoded
 * in the codebase.
 *
 * sections JSONB stores an ordered array of {heading, body} objects so
 * long-form articles can be structured without a CMS dependency.
 */

exports.up = (pgm) => {
  pgm.createTable('blog_posts', {
    id: {
      type:       'uuid',
      primaryKey: true,
      default:    pgm.func('gen_random_uuid()'),
    },
    slug: {
      type:    'varchar(200)',
      notNull: true,
      unique:  true,
    },
    category: {
      type:    'varchar(100)',
      notNull: true,
    },
    title: {
      type:    'varchar(300)',
      notNull: true,
    },
    excerpt: {
      type:    'text',
      notNull: true,
    },
    // Human-readable display strings (e.g. "March 2026", "8 min read")
    published_date: {
      type:    'varchar(50)',
      notNull: true,
      default: "'Draft'",
    },
    read_time: {
      type:    'varchar(30)',
      notNull: true,
      default: "'5 min read'",
    },
    // Ordered array of article sections: [{heading: string, body: string}]
    sections: {
      type:    'jsonb',
      notNull: true,
      default: "'[]'",
    },
    is_published: {
      type:    'boolean',
      notNull: true,
      default: false,
    },
    // Lower sort_order = appears first in listing
    sort_order: {
      type:    'integer',
      notNull: true,
      default: 0,
    },
    created_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type:    'timestamptz',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('blog_posts', 'slug');
  pgm.createIndex('blog_posts', 'is_published');
  pgm.createIndex('blog_posts', ['sort_order', 'created_at']);
};

exports.down = (pgm) => {
  pgm.dropTable('blog_posts');
};
