import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
    card: string;
    input: string;
    skeletonBackground?: string;
    skeletonShimmer?: string;
  };
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

const DARK_MODE_STORAGE_KEY = '@nemu_dark_mode';

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadDarkModePreference();
  }, []);

  const loadDarkModePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(DARK_MODE_STORAGE_KEY);
      if (saved !== null) {
        setIsDarkMode(saved === 'true');
      } else {
        // Default to system preference
        setIsDarkMode(systemColorScheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading dark mode preference:', error);
      setIsDarkMode(systemColorScheme === 'dark');
    }
  };

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      await AsyncStorage.setItem(DARK_MODE_STORAGE_KEY, newMode.toString());
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
  };

  const colors = isDarkMode
    ? {
        background: '#121212',
        surface: '#1E1E1E',
        text: '#FFFFFF',
        textSecondary: '#B0B0B0',
        border: '#333333',
        primary: '#EE1C47',
        card: '#1E1E1E',
        input: '#2D2D2D',
        skeletonBackground: '#2D2D2D',
        skeletonShimmer: '#3D3D3D',
      }
    : {
        background: '#F5F5F5',
        surface: '#FFFFFF',
        text: '#333333',
        textSecondary: '#666666',
        border: '#E0E0E0',
        primary: '#EE1C47',
        card: '#FFFFFF',
        input: '#F5F5F5',
        skeletonBackground: '#E0E0E0',
        skeletonShimmer: '#F0F0F0',
      };

  return (
    <DarkModeContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        colors,
      }}
    >
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
}

