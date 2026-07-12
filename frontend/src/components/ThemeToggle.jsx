import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="relative w-14 h-7 rounded-full border border-paper-line dark:border-ink-line bg-paper dark:bg-ink flex items-center px-1 transition-colors"
        >
            <span
                className={`absolute top-0.5 left-0.5 w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] transition-transform duration-200 bg-signal-transit text-white ${isDark ? 'translate-x-7' : 'translate-x-0'
                    }`}
                style={{ width: '1.375rem', height: '1.375rem' }}
            >
                {isDark ? '☾' : '☀'}
            </span>
        </button>
    );
}
