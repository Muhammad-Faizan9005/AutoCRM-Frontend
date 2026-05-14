import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="btn-icon btn-ghost"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
          transition={{ duration: 0.18 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {theme === 'dark'
            ? <Sun size={16} style={{ color: 'var(--color-text-secondary)' }} />
            : <Moon size={16} style={{ color: 'var(--color-text-secondary)' }} />
          }
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
