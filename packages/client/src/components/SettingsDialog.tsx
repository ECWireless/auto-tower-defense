import { AccountButton } from '@latticexyz/entrykit/internal';
import { Music, Settings, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useSettings } from '@/contexts/SettingsContext';
import type { AudioSettings } from '@/utils/types';

export const SettingsDialog: React.FC = () => {
  const { setMusicVolume, setSfxMuted, setSfxVolume, toggleMusic } =
    useSettings();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<AudioSettings>({
    musicEnabled: true,
    musicVolume: 50,
    sfxEnabled: true,
    sfxVolume: 80,
  });

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('audioSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to parse saved audio settings', e);
      }
    }
  }, []);

  const handleMusicToggle = (enabled: boolean) => {
    const _newSettings = { ...settings, musicEnabled: enabled };
    setSettings(_newSettings);
    localStorage.setItem('audioSettings', JSON.stringify(_newSettings));
    toggleMusic();
  };

  const handleSfxToggle = (enabled: boolean) => {
    const _newSettings = { ...settings, sfxEnabled: enabled };
    setSettings(_newSettings);
    localStorage.setItem('audioSettings', JSON.stringify(_newSettings));
    setSfxMuted(!enabled);
  };

  const handleMusicVolumeChange = (value: number[]) => {
    const _newSettings = { ...settings, musicVolume: value[0] };
    setSettings(_newSettings);
    localStorage.setItem('audioSettings', JSON.stringify(_newSettings));
    const volumeAsDecimal = value[0] / 100; // Convert percentage to decimal
    setMusicVolume(volumeAsDecimal);
  };

  const handleSfxVolumeChange = (value: number[]) => {
    const _newSettings = { ...settings, sfxVolume: value[0] };
    setSettings(_newSettings);
    localStorage.setItem('audioSettings', JSON.stringify(_newSettings));
    const volumeAsDecimal = value[0] / 100; // Convert percentage to decimal
    setSfxVolume(volumeAsDecimal);
  };

  return (
    <>
      <Button
        aria-label="Settings"
        className="bg-gray-900/80 border-cyan-500 bottom-4 fixed h-10 hover:bg-cyan-950/80 hover:text-cyan-300 left-4 rounded-full text-cyan-400 w-10 z-50"
        onClick={() => setOpen(true)}
        size="icon"
        variant="outline"
      >
        <Settings className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="bg-gray-900/95 border border-cyan-900/50 text-white"
        >
          <DialogHeader>
            <DialogTitle className="font-bold text-2xl text-cyan-400">
              SETTINGS
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            <div
              className="flex justify-center mb-8"
              onClick={() => setOpen(false)}
            >
              <AccountButton />
            </div>

            {/* Music Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2 items-center">
                  <Music
                    className={`h-5 ${settings.musicEnabled ? 'text-purple-400' : 'text-gray-500'} w-5`}
                  />
                  <Label className="font-medium text-lg" htmlFor="music-toggle">
                    Music
                  </Label>
                </div>
                <Switch
                  id="music-toggle"
                  checked={settings.musicEnabled}
                  className="data-[state=checked]:bg-purple-600"
                  onCheckedChange={handleMusicToggle}
                />
              </div>

              <div className="pl-7">
                <div className="flex items-center justify-between mb-2">
                  <Label
                    className="text-gray-400 text-sm"
                    htmlFor="music-volume"
                  >
                    Volume
                  </Label>
                  <span className="font-medium text-purple-400 text-sm">
                    {settings.musicVolume}%
                  </span>
                </div>
                <Slider
                  className={`${!settings.musicEnabled ? 'opacity-50' : ''}`}
                  disabled={!settings.musicEnabled}
                  id="music-volume"
                  max={100}
                  onValueChange={handleMusicVolumeChange}
                  step={1}
                  value={[settings.musicVolume]}
                />
              </div>
            </div>

            <div className="bg-gray-800 h-px" />

            {/* SFX Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2 items-center">
                  {settings.sfxEnabled ? (
                    <Volume2 className="h-5 text-pink-400 w-5" />
                  ) : (
                    <VolumeX className="h-5 text-gray-500 w-5" />
                  )}
                  <Label className="font-medium text-lg" htmlFor="sfx-toggle">
                    Sound Effects
                  </Label>
                </div>
                <Switch
                  checked={settings.sfxEnabled}
                  className="data-[state=checked]:bg-pink-600"
                  id="sfx-toggle"
                  onCheckedChange={handleSfxToggle}
                />
              </div>

              <div className="pl-7">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm text-gray-400" htmlFor="sfx-volume">
                    Volume
                  </Label>
                  <span className="font-medium text-pink-400 text-sm">
                    {settings.sfxVolume}%
                  </span>
                </div>
                <Slider
                  className={`${!settings.sfxEnabled ? 'opacity-50' : ''}`}
                  disabled={!settings.sfxEnabled}
                  id="sfx-volume"
                  max={100}
                  onValueChange={handleSfxVolumeChange}
                  step={1}
                  value={[settings.sfxVolume]}
                />
              </div>
            </div>

            <div className="pt-2 italic text-gray-500 text-xs">
              Settings are automatically saved to your browser.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
