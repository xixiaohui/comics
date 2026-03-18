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

export default function AllComicsPage() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [genre, setGenre] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const fetchComics = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '24',
          ...(genre && { genre }),
          ...(status && { status }),
          ...(search && { search }),
        });
        const res = await fetch(`/api/comics/list?${params}`);
        const data = await res.json();
        if (data.success) {
          setComics(data.data);
          setTotalPages(data.pagination.total_pages);
          setTotal(data.pagination.total);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchComics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, genre, status, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      ongoing: 'text-green-400 border-green-500/40',
      completed: 'text-blue-400 border-blue-500/40',
      hiatus: 'text-yellow-400 border-yellow-500/40',
    };
    return `text-xs px-2 py-0.5 rounded-full border backdrop-blur-sm ${map[s] || 'text-gray-400 border-gray-600'}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-gray-300">All Comics</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">
          All Comics
          {total > 0 && <span className="text-gray-500 text-xl font-normal ml-3">({total})</span>}
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search comics..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-sm"
          />
          <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Search
          </button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-600">✕</button>
          )}
        </form>
        <select value={genre} onChange={(e) => { setGenre(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
          <option value="">All Genres</option>
          {['Action','Adventure','Comedy','Drama','Fantasy','Horror','Mystery','Romance','Sci-Fi','Slice of Life'].map(g => (
            <option key={g} value={g.toLowerCase()}>{g}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
          <option value="">All Status</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="hiatus">Hiatus</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
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
          <p className="text-gray-400 text-lg">No comics found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {comics.map((comic) => (
            <Link key={comic.id} href={`/comics/${comic.slug}`} className="group block">
              <div className="aspect-[3/4] bg-gray-800 rounded-xl overflow-hidden mb-2.5 relative border border-gray-700 group-hover:border-orange-500/50 transition-all shadow-md">
                {comic.cover_image ? (
                  <Image src={comic.cover_image} alt={comic.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized sizes="(max-width: 640px) 50vw, 16vw" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <span className="text-3xl">🐾</span>
                  </div>
                )}
                <div className={`absolute top-2 right-2 ${statusBadge(comic.status)}`}>
                  {comic.status}
                </div>
              </div>
              <h3 className="font-semibold text-sm text-white line-clamp-2 group-hover:text-orange-400 transition-colors leading-tight mb-1">
                {comic.title}
              </h3>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{comic.chapter_count} ch</span>
                {comic.latest_chapter && <span>Ch.{comic.latest_chapter}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-12 flex-wrap">
          <button onClick={() => setPage(1)} disabled={page === 1}
            className="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-30 text-sm transition-colors">«</button>
          <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-30 text-sm transition-colors">← Prev</button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
            return startPage + i;
          }).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {p}
            </button>
          ))}

          <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-30 text-sm transition-colors">Next →</button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
            className="px-3 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-30 text-sm transition-colors">»</button>
        </div>
      )}
    </div>
  );
}
