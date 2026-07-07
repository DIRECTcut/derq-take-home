export type AdminSession = {
  expiresAt: string;
  expiresInSeconds: number;
  token: string;
  username: string;
};

export type AdminRouteName = 'dashboard' | 'admin-login' | 'admin-data';

export type AdminReferenceOption = {
  id: number;
  label: string;
};

export type TrafficMetricInput = {
  confidentialityStatus: string;
  countryId: number;
  observationFlag: string;
  observationValue: number;
  timePeriod: number;
  vehicleTypeId: number;
};
