import { mount } from '@vue/test-utils';
import VehicleTypeDistributionChart from './VehicleTypeDistributionChart.vue';

describe('VehicleTypeDistributionChart', () => {
  it('renders a single-category vehicle view without implying extra categories', () => {
    const wrapper = mount(VehicleTypeDistributionChart, {
      props: {
        rows: [
          {
            vehicleTypeSlug: 'passenger-cars-per-thousand-inhabitants',
            vehicleTypeName: 'Passenger cars - per thousand inhabitants',
            unit: 'cars per thousand inhabitants',
            countriesReported: 39,
            averageObservationValue: 424.51,
            totalObservationValue: 16555.89,
          },
        ],
      },
    });

    expect(wrapper.text()).toContain('Passenger cars - per thousand inhabitants');
    expect(wrapper.text()).toContain('Countries reported');
    expect(wrapper.find('.vehicle-chart__bar-fill').attributes('style')).toContain('100%');
  });

  it('renders an empty state when no vehicle distribution rows exist', () => {
    const wrapper = mount(VehicleTypeDistributionChart, {
      props: {
        rows: [],
      },
    });

    expect(wrapper.text()).toContain('No vehicle distribution values are available yet.');
  });
});
