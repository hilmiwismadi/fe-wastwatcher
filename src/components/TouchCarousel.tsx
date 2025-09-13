import React, { useState, useRef, useEffect } from 'react';

interface TouchCarouselProps {
  children: React.ReactNode[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export const TouchCarousel: React.FC<TouchCarouselProps> = ({
  children,
  currentIndex,
  onIndexChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    setCurrentX(clientX);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    
    setCurrentX(clientX);
    const deltaX = clientX - startX;
    const newTranslateX = -currentIndex * 100 + (deltaX / (carouselRef.current?.offsetWidth || 1)) * 100;
    setTranslateX(newTranslateX);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const deltaX = currentX - startX;
    const threshold = 50; // Minimum swipe distance
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && currentIndex > 0) {
        onIndexChange(currentIndex - 1);
      } else if (deltaX < 0 && currentIndex < children.length - 1) {
        onIndexChange(currentIndex + 1);
      }
    }
    
    setTranslateX(-currentIndex * 100);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Update translateX when currentIndex changes externally
  useEffect(() => {
    if (!isDragging) {
      setTranslateX(-currentIndex * 100);
    }
  }, [currentIndex, isDragging]);

  return (
    <div className="relative overflow-hidden">
      <div
        ref={carouselRef}
        className={`flex transition-transform ${isDragging ? 'duration-0' : 'duration-300'} ease-out cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
        style={{ transform: `translateX(${translateX}%)` }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children.map((child, index) => (
          <div key={index} className="w-full flex-shrink-0 px-1">
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};