import { useTheme } from './useTheme';

export function useChartColors() {
  const { theme } = useTheme();
  return {
    grid:          theme === 'dark' ? '#2A2D38' : '#E2E4ED',
    text:          theme === 'dark' ? '#8B8FA8' : '#5A5E78',
    accent:        theme === 'dark' ? '#5B8DEF' : '#4A7DE0',
    accentDim:     theme === 'dark' ? '#3A5FA8' : '#3260C0',
    success:       theme === 'dark' ? '#4A9E7F' : '#2E8B6A',
    warning:       theme === 'dark' ? '#B8924A' : '#9A6E20',
    danger:        theme === 'dark' ? '#C0516A' : '#B03050',
    areaFill:      theme === 'dark' ? 'rgba(91,141,239,0.15)' : 'rgba(74,125,224,0.10)',
    tooltipBg:     theme === 'dark' ? '#1E2029' : '#FFFFFF',
    tooltipBorder: theme === 'dark' ? '#2A2D38' : '#E2E4ED',
    tooltipText:   theme === 'dark' ? '#E8EAF0' : '#1A1D2E',
    muted:         theme === 'dark' ? '#555870' : '#9499B2',
    surface:       theme === 'dark' ? '#16181F' : '#FFFFFF',
  };
}
