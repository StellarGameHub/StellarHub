import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { AppSettings } from '../../shared/types';

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

const defaultSettings: AppSettings = {
  launchInFullscreen: false,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return { ...defaultSettings, ...JSON.parse(data) };
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}