'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

function currentTheme() { return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'; }
function applyTheme(next: string) {
  document.documentElement.dataset.theme = next;
  document.documentElement.classList.toggle('dark', next === 'dark');
}
function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== 'aviation-theme') return;
    applyTheme(event.newValue === 'dark' ? 'dark' : 'light');
    listener();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener('aviation-theme-change', listener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('aviation-theme-change', listener);
  };
}
export default function ThemeControl() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => 'light');
  useEffect(() => {
    try { applyTheme(localStorage.getItem('aviation-theme') === 'dark' ? 'dark' : 'light'); } catch { /* Keep bootstrap preference. */ }
    window.dispatchEvent(new Event('aviation-theme-change'));
  }, []);
  function choose(next: string) {
    if (next !== 'light' && next !== 'dark') return;
    applyTheme(next);
    try { localStorage.setItem('aviation-theme', next); } catch { /* The theme remains usable without storage. */ }
    window.dispatchEvent(new Event('aviation-theme-change'));
  }
  return <ToggleGroup className="theme-control" aria-label="Тема оформления" value={[theme]} onValueChange={values => { if (values[0]) choose(String(values[0])); }}>
    <ToggleGroupItem value="light" aria-label="Дневная тема"><Sun aria-hidden="true" /><span>День</span></ToggleGroupItem>
    <ToggleGroupItem value="dark" aria-label="Ночная тема"><Moon aria-hidden="true" /><span>Ночь</span></ToggleGroupItem>
  </ToggleGroup>;
}
