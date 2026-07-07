import { mount } from '@vue/test-utils';
import CountryTrafficChart from './CountryTrafficChart.vue';

describe('CountryTrafficChart', () => {
  it('renders ordered seeded values in both chart and summary form', () => {
    const wrapper = mount(CountryTrafficChart, {
      props: {
        rows: [
          {
            countryCode: 'LU',
            countryName: 'Luxembourg',
            timePeriod: 2024,
            observationValue: 681,
            vehicleTypeName: 'Passenger cars - per thousand inhabitants',
          },
          {
            countryCode: 'AL',
            countryName: 'Albania',
            timePeriod: 2024,
            observationValue: 328,
            vehicleTypeName: 'Passenger cars - per thousand inhabitants',
          },
        ],
      },
    });

    expect(wrapper.text()).toContain('Luxembourg');
    expect(wrapper.text()).toContain('681');
    expect(wrapper.findAll('rect.chart-bar')).toHaveLength(2);
  });

  it('renders an explicit empty state when no country data exists', () => {
    const wrapper = mount(CountryTrafficChart, {
      props: {
        rows: [],
      },
    });

    expect(wrapper.text()).toContain('No country traffic values are available yet.');
  });
});
