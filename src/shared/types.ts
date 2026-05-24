import { GameCompletionStatus, GameSource, SteamGridImageType } from "./enums";

export interface AppSettings {
  launchInFullscreen: boolean;
  defaultWinePrefix?: string;
  autoScanRoms: boolean;
  steamGridDB: {
    enabled: boolean;
    apiKey?: string;

  };
  steam: {
    enabled: boolean;
    apiKey?: string;
    clientId?: string;
  }
  // rawg: {
  //   enabled: boolean;
  //   apiKey?: string;
  // }
  // igdb: {
  //   enabled: boolean;
  //   apiKey?: { clientId: string; clientSecret: string; };
  // }
}


// Datos de lanzamiento de un juego, necesarios para ejecutarlo (ejecutable, args, etc)
export interface LaunchConfig {
  executablePath: string;
  winePrefix?: string;
  protonVersion?: string;
  gameId?: string;
  store?: string;
  launchArgs?: string[];
  gameArgs?: string[];
  enableMangoHud: boolean;
  enableGamescope: boolean;
  gamescopeArgs?: string[];
  environment?: Record<string, string>;
}

export interface GameImages { // Save relative paths
  grid?: string;
  hero?: string;
  logo?: string;
  icon?: string;
  wideGrid?: string;
}



export interface GameCategory {
  id: string;
  name: string;
  icon: string; // ruta relativa al ícono de la categoría
}


// Configuración para escaneo de ROMs
export interface ScanConfig {
  id: string;                   // único, ej. "psx-scan"
  systemName: string;           // "PlayStation", "N64", etc.
  romsFolder: string;           // ruta absoluta a la carpeta con ROMs
  emulatorPath: string;         // ruta al ejecutable del emulador
  launchArguments: string;      // plantilla, ej. "{gamePath} --fullscreen"
  extensions: string[];         // [".iso", ".bin", ".cue"]
  enabled: boolean;
  lastScanAt?: Date;
  categories?: string[];          // IDs de categorías a asignar a los juegos detectados
}



// Campos comunes a TODOS los juegos
export interface BaseGame {
  id: string;
  title: string;
  source: GameSource;
  description?: string;
  developers?: string[];
  publishers?: string[];
  releaseDate?: Date;
  genres?: string[];
  gameImages: GameImages;
  isInstalled: boolean;
  isHidden: boolean;
  playtimeMinutes: number;
  lastPlayedAt?: Date;
  addedAt: Date;
  categories?: string[];        // IDs de categorías
  completionStatus: GameCompletionStatus
}

// Juegos que se lanzan con un ejecutable (manual, Steam, GOG, etc.)
export interface ExecutableGame extends BaseGame {
  source: GameSource.MANUAL | GameSource.STEAM | GameSource.GOG;
  launchConfig: LaunchConfig;
}

// Juegos ROM
export interface RomGame extends BaseGame {
  source: GameSource.ROM;
  romDetails: {
    scanConfigId: string;
    romPath: string;
    emulatorPath: string;
    launchArguments: string;   // plantilla con {romPath}
  };
}
//Juego de Steam
export interface SteamGame extends BaseGame {
  installPath: string;
  source: GameSource.STEAM;
  steamAppId: number;
}

// Tipo unión: cualquiera de las variantes
export type Game = ExecutableGame | RomGame | SteamGame;

// Para resúmenes en el frontend (solo campos necesarios en la cuadrícula)
export type GameSummary = Pick<Game,
  'id' | 'title' | 'source' | 'gameImages' | 'isInstalled' | 'playtimeMinutes' | 'lastPlayedAt' | 'addedAt' | 'categories'
> & {
  developer?: string;  // primer desarrollador para mostrar
  releaseDate?: Date;
};

export function toGameSummary(game: Game): GameSummary {
  return {
    id: game.id,
    title: game.title,
    source: game.source,
    gameImages: game.gameImages,
    isInstalled: game.isInstalled,
    playtimeMinutes: game.playtimeMinutes,
    lastPlayedAt: game.lastPlayedAt,
    addedAt: game.addedAt,
    developer: game.developers?.[0],
    releaseDate: game.releaseDate,
  };
}

export interface BlacklistData {
  steam: number[];      // Steam App IDs
  rom: string[];        // Rutas absolutas de ROMs
  manual: string[];     // Game IDs manuales
}