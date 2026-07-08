declare global {
  interface Window {
    __TRAFFIC_DATA_CONFIG__?: {
      adminApiBaseUrl?: string;
      apiBaseUrl?: string;
    };
  }
}

export {};
