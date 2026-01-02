import { useState, useEffect, useRef } from 'react';

type TabType = 'notes' | 'tasks' | 'tags';

interface UseCarouselAnimationReturn {
  contentType: TabType;
  currentVisualTab: TabType;
  prevVisualTab: TabType;
  isTransitioning: boolean;
  setContentType: (type: TabType) => void;
}

/**
 * Hook for managing carousel animation between sidebar tabs
 * Handles smooth sliding transitions with intermediate steps for non-adjacent tabs
 */
export const useCarouselAnimation = (initialTab: TabType = 'tasks'): UseCarouselAnimationReturn => {
  // State
  const [contentType, setContentType] = useState<TabType>(initialTab);
  const [currentVisualTab, setCurrentVisualTab] = useState<TabType>(initialTab);
  const [prevVisualTab, setPrevVisualTab] = useState<TabType>(initialTab);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionQueue, setTransitionQueue] = useState<TabType[]>([]);

  // Refs for stable access to state in effects
  const transitionQueueRef = useRef(transitionQueue);
  const isTransitioningRef = useRef(isTransitioning);

  useEffect(() => {
    transitionQueueRef.current = transitionQueue;
  }, [transitionQueue]);

  useEffect(() => {
    isTransitioningRef.current = isTransitioning;
  }, [isTransitioning]);

  // Effect to initiate transitions when contentType changes
  useEffect(() => {
    if (contentType === currentVisualTab) {
      return;
    }

    // Don't start a new transition if we're already processing a queue
    if (transitionQueueRef.current.length > 0) {
      return;
    }

    const tabs: TabType[] = ['notes', 'tasks', 'tags'];
    const currentIndex = tabs.indexOf(contentType);
    const prevIndex = tabs.indexOf(currentVisualTab);
    const distance = Math.abs(currentIndex - prevIndex);

    if (distance > 1) {
      // Multi-step transition through intermediate tabs
      const start = Math.min(currentIndex, prevIndex);
      const end = Math.max(currentIndex, prevIndex);
      const intermediates = tabs.slice(start + 1, end);

      const queue = (currentIndex > prevIndex) 
        ? [...intermediates, contentType] 
        : [...intermediates.reverse(), contentType];
      
      setTransitionQueue(queue);
      setPrevVisualTab(currentVisualTab);
    } else {
      // Direct transition (adjacent tabs)
      setTransitionQueue([]);
      setPrevVisualTab(currentVisualTab);
      setIsTransitioning(true);
      
      const timer = setTimeout(() => {
        setCurrentVisualTab(contentType);
        setIsTransitioning(false);
      }, 250);
      
      return () => clearTimeout(timer);
    }
  }, [contentType, currentVisualTab]);

  // Effect to process transition queue
  useEffect(() => {
    if (transitionQueue.length > 0 && !isTransitioningRef.current) {
      setIsTransitioning(true);
      const nextTab = transitionQueue[0];

      const timer = setTimeout(() => {
        setPrevVisualTab(currentVisualTab);
        setCurrentVisualTab(nextTab);
        setTransitionQueue(prev => prev.slice(1));
        setIsTransitioning(false);
      }, transitionQueue.length === 1 ? 250 : 150); // Faster for intermediate, normal for final

      return () => clearTimeout(timer);
    }
  }, [transitionQueue, currentVisualTab]);

  return {
    contentType,
    currentVisualTab,
    prevVisualTab,
    isTransitioning,
    setContentType,
  };
};

