/**
 * chartTheme.js
 * -------------
 * Shared theme-aware palette helper for all SVG, bar, progress, and metric charts.
 */

export const getChartTheme = (resolvedTheme = 'dark') => {
  if (resolvedTheme === 'light') {
    return {
      isLight: true,
      text: '#111827',
      mutedText: '#4B5563',
      grid: '#E2E6EC',
      track: '#E5E7EB',
      accent: '#D92F25',
      accentHover: '#B9241C',
      accentSoft: 'rgba(217, 47, 37, 0.14)',
      barGradient: 'linear-gradient(to top, rgba(217, 47, 37, 0.72), #D92F25)',
      tooltipBg: '#111827',
      tooltipText: '#FFFFFF',
      tooltipBorder: '#374151',
      success: '#047857',
      warning: '#B45309',
      danger: '#B91C1C',
    };
  }

  return {
    isLight: false,
    text: '#F5F5F5',
    mutedText: '#B8B8B8',
    grid: '#303030',
    track: '#202020',
    accent: '#EB3E2E',
    accentHover: '#FF493B',
    accentSoft: 'rgba(235, 62, 46, 0.2)',
    barGradient: 'linear-gradient(to top, rgba(235, 62, 46, 0.6), #EB3E2E)',
    tooltipBg: '#000000',
    tooltipText: '#EB3E2E',
    tooltipBorder: '#303030',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
  };
};
