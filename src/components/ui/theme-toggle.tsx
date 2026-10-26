'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle({ variant = 'icon' }: { variant?: 'icon' | 'dropdown-item' | 'segmented' }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#6f7a7a]">
        <Moon className="w-[18px] h-[18px]" />
      </div>
    );
  }

  if (variant === 'segmented') {
    return (
      <div className="inline-flex items-center p-1 bg-[#121515] dark:bg-[#141717] border border-[#222828] rounded-xl text-xs">
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
            theme === 'light'
              ? 'bg-[#2dd4bf] text-[#091b18] shadow-sm font-semibold'
              : 'text-[#879292] hover:text-foreground'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
            theme === 'dark'
              ? 'bg-[#2dd4bf] text-[#091b18] shadow-sm font-semibold'
              : 'text-[#879292] hover:text-foreground'
          }`}
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
            theme === 'system'
              ? 'bg-[#2dd4bf] text-[#091b18] shadow-sm font-semibold'
              : 'text-[#879292] hover:text-foreground'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>System</span>
        </button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="w-10 h-10 rounded-xl flex items-center justify-center text-[#879292] hover:text-foreground hover:bg-black/5 dark:hover:bg-white/[0.08] transition-all focus:outline-none cursor-pointer"
        title={`Theme: ${theme || 'system'}`}
      >
        {theme === 'light' ? (
          <Sun className="w-[18px] h-[18px] text-amber-500" />
        ) : theme === 'dark' ? (
          <Moon className="w-[18px] h-[18px] text-[#2dd4bf]" />
        ) : resolvedTheme === 'light' ? (
          <Sun className="w-[18px] h-[18px] text-amber-500" />
        ) : (
          <Moon className="w-[18px] h-[18px] text-[#2dd4bf]" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="right"
        className="w-40 bg-[#141717] border border-[#232727] text-foreground shadow-2xl rounded-xl p-1 z-[60] ml-2"
      >
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className="text-xs px-2.5 py-2 rounded-lg cursor-pointer flex items-center justify-between text-[#c0c8c8] hover:bg-black/5 dark:hover:bg-white/[0.08] hover:text-foreground"
        >
          <div className="flex items-center gap-2">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Light</span>
          </div>
          {theme === 'light' && <Check className="w-3.5 h-3.5 text-[#2dd4bf]" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className="text-xs px-2.5 py-2 rounded-lg cursor-pointer flex items-center justify-between text-[#c0c8c8] hover:bg-black/5 dark:hover:bg-white/[0.08] hover:text-foreground"
        >
          <div className="flex items-center gap-2">
            <Moon className="w-3.5 h-3.5 text-[#2dd4bf]" />
            <span>Dark</span>
          </div>
          {theme === 'dark' && <Check className="w-3.5 h-3.5 text-[#2dd4bf]" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className="text-xs px-2.5 py-2 rounded-lg cursor-pointer flex items-center justify-between text-[#c0c8c8] hover:bg-black/5 dark:hover:bg-white/[0.08] hover:text-foreground"
        >
          <div className="flex items-center gap-2">
            <Laptop className="w-3.5 h-3.5" />
            <span>System</span>
          </div>
          {theme === 'system' && <Check className="w-3.5 h-3.5 text-[#2dd4bf]" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
