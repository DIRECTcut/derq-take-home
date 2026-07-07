import { createTrafficApi, resolvePostgrestBaseUrl, TrafficApiError } from './traffic';

describe('traffic api adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.__TRAFFIC_DATA_CONFIG__ = undefined;
  });

  it('maps country and vehicle rows into frontend-safe types', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              country_code: 'AL',
              country_name: 'Albania',
              time_period: 2024,
              observation_value: 328,
              vehicle_type_name: 'Passenger cars - per thousand inhabitants',
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              vehicle_type_slug: 'passenger-cars-per-thousand-inhabitants',
              vehicle_type_name: 'Passenger cars - per thousand inhabitants',
              unit: 'cars per thousand inhabitants',
              countries_reported: 39,
              average_observation_value: 424.51,
              total_observation_value: 16555.89,
            },
          ]),
          { status: 200 },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    const api = createTrafficApi('http://localhost:3001');
    const data = await api.fetchDashboardData();

    expect(data.countryTraffic[0]).toMatchObject({
      countryCode: 'AL',
      countryName: 'Albania',
      timePeriod: 2024,
      observationValue: 328,
    });
    expect(data.vehicleDistribution[0]).toMatchObject({
      vehicleTypeSlug: 'passenger-cars-per-thousand-inhabitants',
      countriesReported: 39,
      averageObservationValue: 424.51,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed payloads instead of returning silent empty data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify([{ country_code: 'AL' }]), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 })),
    );

    const api = createTrafficApi('http://localhost:3001');

    await expect(api.fetchDashboardData()).rejects.toThrow(TrafficApiError);
  });

  it('surfaces transport failures as actionable errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    const api = createTrafficApi('http://localhost:3001');

    await expect(api.fetchDashboardData()).rejects.toThrow('Traffic data request failed with status 503');
  });

  it('validates the configured PostgREST base url', () => {
    expect(() => resolvePostgrestBaseUrl({ VITE_POSTGREST_BASE_URL: 'not-a-url' })).toThrow(
      'Invalid VITE_POSTGREST_BASE_URL value: not-a-url',
    );
  });

  it('prefers runtime configuration over the build-time fallback', () => {
    window.__TRAFFIC_DATA_CONFIG__ = {
      postgrestBaseUrl: 'https://runtime.example.com',
    };

    expect(resolvePostgrestBaseUrl({ VITE_POSTGREST_BASE_URL: 'http://localhost:3001' })).toBe(
      'https://runtime.example.com',
    );
  });
});
