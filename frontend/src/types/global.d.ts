declare global {
  interface Window {
    __TRAFFIC_DATA_CONFIG__?: {
      adminApiBaseUrl?: string;
      postgrestBaseUrl?: string;
    };
  }
}

export {};
