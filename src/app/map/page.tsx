'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import InteractiveMapVisualization from '@/components/InteractiveMapVisualization';

export default function MapPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
          </button>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600">Simulasi Pengumpulan Sampah</h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <InteractiveMapVisualization />
      </main>
    </div>
  );
}
