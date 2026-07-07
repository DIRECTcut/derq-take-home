export type CountryTrafficDatum = {
  countryCode: string;
  countryName: string;
  timePeriod: number;
  observationValue: number;
  vehicleTypeName: string;
};

export type VehicleDistributionDatum = {
  vehicleTypeSlug: string;
  vehicleTypeName: string;
  unit: string;
  countriesReported: number;
  averageObservationValue: number;
  totalObservationValue: number;
};

export type DashboardData = {
  countryTraffic: CountryTrafficDatum[];
  vehicleDistribution: VehicleDistributionDatum[];
};
