import InteractiveMapVisualization from '@/components/InteractiveMapVisualization';

export default function MapPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-3 md:mb-4">Interactive Waste Collection Map</h1>
        <p className="text-sm sm:text-base text-gray-600 mb-4 md:mb-6">
          Drag and drop trash bins to reposition them. Click "Find Route" to visualize the collection path.
        </p>
        <InteractiveMapVisualization />
      </div>
    </main>
  );
}
