declare namespace KalturaPlayer {
  interface PlayerConfig {
    targetId: string;
    provider: {
      partnerId: string | number;
      uiConfId: string | number;
    };
    playback?: {
      autoplay?: boolean;
      muted?: boolean;
      preload?: string;
    };
  }

  interface MediaConfig {
    entryId: string;
    ks?: string;
  }

  interface Player {
    addEventListener(event: string, callback: Function): void;
    removeEventListener(event: string, callback: Function): void;
    play(): void;
    pause(): void;
    currentTime: number;
    duration: number;
    paused: boolean;
    loadMedia(mediaConfig: MediaConfig): Promise<void>;
    destroy(): void;
  }

  function setup(config: PlayerConfig): Player;
}

declare const KalturaPlayer: typeof KalturaPlayer;