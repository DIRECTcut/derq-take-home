import { mount } from '@vue/test-utils';
import DashboardShell from './DashboardShell.vue';

describe('DashboardShell', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders both dashboard views from transport-backed responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
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
        ),
    );

    const wrapper = mount(DashboardShell);
    await vi.waitFor(() => expect(wrapper.text()).toContain('Latest traffic values by country'));

    expect(wrapper.text()).toContain('Current vehicle-type coverage');
    expect(wrapper.text()).toContain('Albania');
  });

  it('renders an actionable error state when transport requests fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    const wrapper = mount(DashboardShell);
    await vi.waitFor(() => expect(wrapper.text()).toContain('Traffic data request failed with status 503'));

    expect(wrapper.find('button').text()).toBe('Retry');
  });

  it('renders a zero-data fallback when both views are empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 })),
    );

    const wrapper = mount(DashboardShell);
    await vi.waitFor(() => expect(wrapper.text()).toContain('The dashboard has no seeded data to show yet.'));
  });
});
