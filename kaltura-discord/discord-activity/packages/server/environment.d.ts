declare global {
  namespace NodeJS {
    interface ProcessEnv {
      VITE_CLIENT_ID: string;
      CLIENT_SECRET: string;
      NODE_ENV: 'development' | 'production';
      PORT?: string;
      PWD: string;
      KALTURA_PARTNER_ID: string;
      KALTURA_PLAYER_ID: string;
      KALTURA_API_ENDPOINT: string;
    }
  }
}

export type {};