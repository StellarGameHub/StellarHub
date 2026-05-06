// Datos que el frontend consume para mostrar un juego en la biblioteca
export interface GameSummary {
  id: string;
  title: string;
  coverImage?: string;
  gridImage?: string;
  developer?: string;
  releaseYear?: number;
  isInstalled: boolean;
  isHidden: boolean;
  playtimeMinutes: number;
  lastPlayedAt?: Date;
  addedAt?: Date;
  description?: string;
  publishers?: string[];
  genres?: string[];
  bannerImage?: string;
  backgroundImage?: string;
  source: GameType;
}

export enum GameType {
  manual, steam, rom
}

// Datos completos del juego (incluyendo configuración de lanzamiento)
// Solo se envía al frontend cuando se abre la vista de edición o detalles
export interface GameDetail extends GameSummary {
  launchConfig: LaunchConfig;  // solo visible en edición
}

// LaunchConfig sigue igual, pero NUNCA se envía al frontend fuera de edición
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