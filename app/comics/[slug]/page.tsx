'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { use } from 'react';

interface Chapter {
  id: string;
  chapter_num: number;
  title: string;
  description: string | null;
  page_count: number;
  view_count: number;
  published_at: string;
}

interface Comic {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  author: string;
  genre: string | null;
  status: string;
  tags: string[];
  view_count: number;
  chapter_count: number;
  created_at: string;
  updated_at: string;
  chapters: Chapter[];
}

export default function ComicDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [comic, setComic] = useState<Comic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComic = async () => {
      try {
        const res = await fetch(`/api/comics/${slug}`);
        const data = await res.json();
        if (data.success) {
          setComic(data.data);
        } else {
          setError(data.error || 'Comic not found');
        }
      } catch {
        setError('Failed to load comic');
      } finally {
        setLoading(false);
      }
    };
    fetchComic();
  }, [slug]);

  const statusColors: Record<string, string> = {
    ongoing: 'text-green-400 bg-green-500/10 border-green-500/30',
    completed: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    hiatus: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-64 h-96 bg-gray-800 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-gray-800 rounded w-3/4" />
            <div className="h-4 bg-gray-800 rounded w-1/4" />
            <div className="h-24 bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !comic) {
    return (
      <div className="text-center py-24">
        <div className="text-5xl mb-4">😵</div>
        <h2 className="text-2xl font-semibold text-gray-400 mb-2">{error || 'Not Found'}</h2>
        <Link href="/" className="text-orange-400 hover:underline">← Back to Home</Link>
      </div>
    );
  }

  const firstChapter = comic.chapters[0];
  const latestChapter = comic.chapters[comic.chapters.length - 1];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-300">{comic.title}</span>
      </div>

      {/* Comic Header */}
      <div className="flex flex-col md:flex-row gap-8 mb-10">
        {/* Cover */}
        <div className="w-full md:w-56 flex-shrink-0">
          <div className="aspect-[3/4] bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl relative">
            {comic.cover_image ? (
              <Image
                src={comic.cover_image}
                alt={comic.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                <span className="text-6xl mb-2">🐾</span>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
            {comic.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className={`text-sm px-3 py-1 rounded-full border ${statusColors[comic.status] || 'text-gray-400'}`}>
              {comic.status.charAt(0).toUpperCase() + comic.status.slice(1)}
            </span>
            {comic.genre && (
              <span className="text-sm px-3 py-1 rounded-full border border-gray-700 text-gray-400 bg-gray-800">
                {comic.genre}
              </span>
            )}
            <span className="text-sm text-gray-500">
              👤 {comic.author}
            </span>
          </div>

          {comic.description && (
            <p className="text-gray-300 leading-relaxed mb-5 max-w-2xl">{comic.description}</p>
          )}

          {/* Tags */}
          {comic.tags && comic.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {comic.tags.map((tag) => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-400">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-gray-400 mb-6">
            <span>📖 {comic.chapter_count} Chapters</span>
            <span>👁 {comic.view_count.toLocaleString()} views</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {firstChapter && (
              <Link
                href={`/comics/${comic.slug}/chapter/${firstChapter.chapter_num}`}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                Start Reading
              </Link>
            )}
            {latestChapter && latestChapter.id !== firstChapter?.id && (
              <Link
                href={`/comics/${comic.slug}/chapter/${latestChapter.chapter_num}`}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                Latest Chapter
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Chapters List */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 pb-3 border-b border-gray-800">
          📚 Chapters ({comic.chapters.length})
        </h2>
        {comic.chapters.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No chapters yet</div>
        ) : (
          <div className="space-y-2">
            {[...comic.chapters].reverse().map((chapter) => (
              <Link
                key={chapter.id}
                href={`/comics/${comic.slug}/chapter/${chapter.chapter_num}`}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800 hover:border-orange-500/30 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-orange-400 font-mono text-sm font-medium w-16">
                    Ch.{chapter.chapter_num}
                  </span>
                  <div>
                    <div className="font-medium text-white group-hover:text-orange-400 transition-colors">
                      {chapter.title || `Chapter ${chapter.chapter_num}`}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {chapter.page_count} pages · {new Date(chapter.published_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>👁 {chapter.view_count}</span>
                  <span className="text-gray-600 group-hover:text-orange-400 transition-colors text-lg">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
