import { createContext, useContext, useEffect, useState } from 'react';

type ThemeColors = {
    primary: string; // HSL format: "262 60% 55%"
    sidebar: string; // HSL format
    backgroundColor?: string; // HSL format
    textColor?: string; // HSL format
};

type ThemeCustomizationContextType = {
    colors: ThemeColors;
    setPrimaryColor: (color: string) => void;
    setSidebarColor: (color: string) => void;
    setBackgroundColor: (color: string | undefined) => void;
    setTextColor: (color: string | undefined) => void;
    resetTheme: () => void;
};

const defaultColors: ThemeColors = {
    primary: '262 60% 55%',
    sidebar: '270 40% 97%', // Light mode default
};

const ThemeCustomizationContext = createContext<ThemeCustomizationContextType | undefined>(undefined);

export function ThemeCustomizationProvider({ children }: { children: React.ReactNode }) {
    const [colors, setColors] = useState<ThemeColors>(() => {
        const saved = localStorage.getItem('psicrm-theme-colors');
        return saved ? JSON.parse(saved) : defaultColors;
    });

    useEffect(() => {
        localStorage.setItem('psicrm-theme-colors', JSON.stringify(colors));
        applyTheme(colors);
    }, [colors]);

    const applyTheme = (theme: ThemeColors) => {
        const root = document.documentElement;

        // Apply Primary Color
        root.style.setProperty('--primary', theme.primary);
        root.style.setProperty('--ring', theme.primary);
        root.style.setProperty('--sidebar-primary', theme.primary);

        // Apply Background Color if set
        if (theme.backgroundColor) {
            root.style.setProperty('--background', theme.backgroundColor);
            // Also update sidebar background to match if it's not explicitly independent, 
            // or leave it to standard theme logic. For now, let's keep it simple.
        } else {
            root.style.removeProperty('--background');
        }

        // Apply Text Color if set
        if (theme.textColor) {
            root.style.setProperty('--foreground', theme.textColor);
        } else {
            root.style.removeProperty('--foreground');
        }
    };

    const setPrimaryColor = (color: string) => {
        setColors(prev => ({ ...prev, primary: color }));
    };

    const setSidebarColor = (color: string) => {
        setColors(prev => ({ ...prev, sidebar: color }));
    };

    const setBackgroundColor = (color: string | undefined) => {
        setColors(prev => ({ ...prev, backgroundColor: color }));
    };

    const setTextColor = (color: string | undefined) => {
        setColors(prev => ({ ...prev, textColor: color }));
    };

    const resetTheme = () => {
        setColors(defaultColors);
        const root = document.documentElement;
        root.style.removeProperty('--background');
        root.style.removeProperty('--foreground');
    };

    return (
        <ThemeCustomizationContext.Provider value={{
            colors,
            setPrimaryColor,
            setSidebarColor,
            setBackgroundColor,
            setTextColor,
            resetTheme
        }}>
            {children}
        </ThemeCustomizationContext.Provider>
    );
}

export const useThemeCustomization = () => {
    const context = useContext(ThemeCustomizationContext);
    if (context === undefined) {
        throw new Error('useThemeCustomization must be used within a ThemeCustomizationProvider');
    }
    return context;
};
