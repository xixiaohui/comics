'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Comic {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_image: string | null;
  author: string;
  genre: string | null;
  status: string;
  tags: string[];
  view_count: number;
  chapter_count: number;
  latest_chapter: number | null;
  updated_at: string;
}

interface ApiResponse {
  success: boolean;
  data: Comic[];
  pagination: {
    page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export default function HomePage() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0, has_next: false, has_prev: false });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [genre, setGenre] = useState('');

  useEffect(() => {
    const fetchComics = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pagination.page),
          limit: '18',
          ...(search && { search }),
          ...(genre && { genre }),
        });
        const res = await fetch(`/api/comics/list?${params}`);
        const data: ApiResponse = await res.json();
        if (data.success) {
          setComics(data.data);
          setPagination(p => ({ ...p, ...data.pagination }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchComics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, search, genre]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination(p => ({ ...p, page: 1 }));
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      ongoing: 'bg-green-500/20 text-green-400 border-green-500/30',
      completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      hiatus: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };
    return map[status] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="text-center py-12 mb-10">
        <div className="text-6xl mb-4">🐾</div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
          XClaw Comics
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          AI-generated comics — fresh stories delivered automatically. Read the latest chapters now.
        </p>

        {/* Stats */}
        {pagination.total > 0 && (
          <div className="mt-6 inline-flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-full px-5 py-2 text-sm text-gray-300">
            <span className="text-orange-400 font-semibold">{pagination.total}</span> comics published
          </div>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search comics..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); setPagination(p => ({ ...p, page: 1 })); }}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg transition-colors"
            >
              ✕
            </button>
          )}
        </form>
        <select
          value={genre}
          onChange={(e) => { setGenre(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-orange-500"
        >
          <option value="">All Genres</option>
          <option value="action">Action</option>
          <option value="adventure">Adventure</option>
          <option value="comedy">Comedy</option>
          <option value="drama">Drama</option>
          <option value="fantasy">Fantasy</option>
          <option value="horror">Horror</option>
          <option value="mystery">Mystery</option>
          <option value="romance">Romance</option>
          <option value="sci-fi">Sci-Fi</option>
          <option value="slice-of-life">Slice of Life</option>
        </select>
      </div>

      {/* Comics Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] bg-gray-800 rounded-xl mb-2" />
              <div className="h-4 bg-gray-800 rounded mb-1" />
              <div className="h-3 bg-gray-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : comics.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-2xl font-semibold text-gray-400 mb-2">No comics yet</h2>
          <p className="text-gray-500">OpenClaw will publish new comics soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {comics.map((comic) => (
            <Link
              key={comic.id}
              href={`/comics/${comic.slug}`}
              className="group block"
            >
              {/* Cover */}
              <div className="aspect-[3/4] bg-gray-800 rounded-xl overflow-hidden mb-3 relative border border-gray-700 group-hover:border-orange-500/50 transition-colors shadow-lg">
                {comic.cover_image ? (
                  <Image
                    src={comic.cover_image}
                    alt={comic.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                    <span className="text-4xl mb-2">🐾</span>
                    <span className="text-xs">No Cover</span>
                  </div>
                )}

                {/* Status badge */}
                <div className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full border backdrop-blur-sm ${statusBadge(comic.status)}`}>
                  {comic.status}
                </div>
              </div>

              {/* Info */}
              <h3 className="font-semibold text-sm text-white line-clamp-2 group-hover:text-orange-400 transition-colors leading-tight mb-1">
                {comic.title}
              </h3>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{comic.chapter_count} ch</span>
                {comic.latest_chapter && <span>Ch.{comic.latest_chapter}</span>}
              </div>
              {comic.genre && (
                <div className="text-xs text-gray-600 mt-1 truncate">{comic.genre}</div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-12">
          <button
            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            disabled={!pagination.has_prev}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <span className="text-gray-400 text-sm">
            Page {pagination.page} / {pagination.total_pages}
          </span>
          <button
            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            disabled={!pagination.has_next}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
