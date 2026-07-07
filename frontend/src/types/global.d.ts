declare global {
  interface Window {
    __TRAFFIC_DATA_CONFIG__?: {
      postgrestBaseUrl?: string;
    };
  }
}

export {};
