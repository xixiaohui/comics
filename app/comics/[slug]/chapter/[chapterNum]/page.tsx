'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { use } from 'react';

interface Page {
  id: string;
  page_num: number;
  image_url: string;
  width: number;
  height: number;
}

interface ChapterData {
  comic: { id: string; title: string; slug: string };
  chapter: { id: string; chapter_num: number; title: string };
  pages: Page[];
}

type ReadingMode = 'scroll' | 'paged';

export default function ChapterReaderPage({
  params,
}: {
  params: Promise<{ slug: string; chapterNum: string }>;
}) {
  const { slug, chapterNum } = use(params);
  const [data, setData] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ReadingMode>('scroll');
  const [currentPage, setCurrentPage] = useState(0);
  const [allChapters, setAllChapters] = useState<{ chapter_num: number; title: string }[]>([]);
  const [showNav, setShowNav] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pagesRes, comicRes] = await Promise.all([
          fetch(`/api/comics/${slug}/chapters/${chapterNum}/pages`),
          fetch(`/api/comics/${slug}`),
        ]);
        const pagesData = await pagesRes.json();
        const comicData = await comicRes.json();

        if (pagesData.success) {
          setData(pagesData.data);
        } else {
          setError(pagesData.error || 'Chapter not found');
        }

        if (comicData.success) {
          setAllChapters(comicData.data.chapters || []);
        }
      } catch {
        setError('Failed to load chapter');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug, chapterNum]);

  const currentChapterNum = parseFloat(chapterNum);
  const currentIndex = allChapters.findIndex((c) => c.chapter_num === currentChapterNum);
  const prevChapter = allChapters[currentIndex - 1];
  const nextChapter = allChapters[currentIndex + 1];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (mode !== 'paged' || !data) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      setCurrentPage((p) => Math.min(p + 1, data.pages.length - 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      setCurrentPage((p) => Math.max(p - 1, 0));
    }
  }, [mode, data]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🐾</div>
          <p className="text-gray-400">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-24">
        <div className="text-5xl mb-4">😵</div>
        <h2 className="text-2xl font-semibold text-gray-400 mb-2">{error || 'Not Found'}</h2>
        <Link href={`/comics/${slug}`} className="text-orange-400 hover:underline">← Back to Comic</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top Nav */}
      <div
        className={`fixed top-16 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur border-b border-gray-800 transition-all duration-300 ${showNav ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between text-sm gap-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-gray-400 min-w-0 truncate">
            <Link href={`/comics/${slug}`} className="hover:text-orange-400 transition-colors truncate">
              {data.comic.title}
            </Link>
            <span className="text-gray-600 flex-shrink-0">·</span>
            <span className="text-white flex-shrink-0">{data.chapter.title || `Ch.${chapterNum}`}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mode toggle */}
            <div className="flex bg-gray-800 rounded-lg overflow-hidden text-xs">
              <button
                onClick={() => setMode('scroll')}
                className={`px-3 py-1.5 transition-colors ${mode === 'scroll' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Scroll
              </button>
              <button
                onClick={() => { setMode('paged'); setCurrentPage(0); }}
                className={`px-3 py-1.5 transition-colors ${mode === 'paged' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Paged
              </button>
            </div>

            {/* Chapter nav */}
            {prevChapter && (
              <Link
                href={`/comics/${slug}/chapter/${prevChapter.chapter_num}`}
                className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors text-xs"
              >
                ← Prev
              </Link>
            )}
            {nextChapter && (
              <Link
                href={`/comics/${slug}/chapter/${nextChapter.chapter_num}`}
                className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors text-xs"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Toggle nav button */}
      <button
        onClick={() => setShowNav(v => !v)}
        className="fixed bottom-6 right-6 z-50 bg-gray-800 hover:bg-gray-700 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg border border-gray-700 transition-colors text-sm"
        title="Toggle navigation"
      >
        {showNav ? '▲' : '▼'}
      </button>

      {/* Reader Area */}
      <div className={`pt-${showNav ? '28' : '16'} pb-16`}>
        {mode === 'scroll' ? (
          /* Scroll Mode */
          <div className="max-w-3xl mx-auto px-2 space-y-1">
            {data.pages.map((page) => (
              <div key={page.id} className="relative w-full">
                <Image
                  src={page.image_url}
                  alt={`Page ${page.page_num}`}
                  width={page.width || 800}
                  height={page.height || 1200}
                  className="w-full h-auto"
                  unoptimized
                  priority={page.page_num <= 3}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Paged Mode */
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
            {data.pages[currentPage] && (
              <div className="relative max-h-[80vh] flex items-center justify-center">
                <Image
                  src={data.pages[currentPage].image_url}
                  alt={`Page ${currentPage + 1}`}
                  width={data.pages[currentPage].width || 800}
                  height={data.pages[currentPage].height || 1200}
                  className="max-h-[80vh] w-auto object-contain"
                  unoptimized
                  priority
                />
              </div>
            )}

            {/* Page Controls */}
            <div className="flex items-center gap-6 mt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 0))}
                disabled={currentPage === 0}
                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
              >
                ← Prev Page
              </button>
              <span className="text-gray-400 text-sm font-mono">
                {currentPage + 1} / {data.pages.length}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, data.pages.length - 1))}
                disabled={currentPage === data.pages.length - 1}
                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Next Page →
              </button>
            </div>

            {/* Keyboard hint */}
            <p className="text-gray-600 text-xs mt-3">Use ← → arrow keys to navigate</p>
          </div>
        )}

        {/* Chapter navigation bottom */}
        <div className="max-w-3xl mx-auto px-4 mt-12 flex items-center justify-between">
          {prevChapter ? (
            <Link
              href={`/comics/${slug}/chapter/${prevChapter.chapter_num}`}
              className="flex items-center gap-2 px-5 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors"
            >
              ← {prevChapter.title || `Ch.${prevChapter.chapter_num}`}
            </Link>
          ) : <div />}

          <Link
            href={`/comics/${slug}`}
            className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors text-sm"
          >
            📚 All Chapters
          </Link>

          {nextChapter ? (
            <Link
              href={`/comics/${slug}/chapter/${nextChapter.chapter_num}`}
              className="flex items-center gap-2 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors"
            >
              {nextChapter.title || `Ch.${nextChapter.chapter_num}`} →
            </Link>
          ) : <div />}
        </div>
      </div>
    </div>
  );
}
