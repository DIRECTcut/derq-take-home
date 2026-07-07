import { mount } from '@vue/test-utils';
import TrafficMetricForm from './TrafficMetricForm.vue';

describe('TrafficMetricForm', () => {
  it('emits the expected traffic metric payload from form values', async () => {
    const wrapper = mount(TrafficMetricForm, {
      props: {
        countries: [{ id: 1, label: 'Albania (AL)' }],
        vehicleTypes: [{ id: 2, label: 'Passenger cars (cars per thousand inhabitants)' }],
      },
    });

    await wrapper.get('select[name="country"]').setValue('1');
    await wrapper.get('select[name="vehicleType"]').setValue('2');
    await wrapper.get('input[name="timePeriod"]').setValue('2024');
    await wrapper.get('input[name="observationValue"]').setValue('328.5');
    await wrapper.get('input[name="observationFlag"]').setValue('p');
    await wrapper.get('input[name="confidentialityStatus"]').setValue('public');
    await wrapper.get('form').trigger('submit.prevent');

    expect(wrapper.emitted('submit')).toEqual([
      [
        {
          confidentialityStatus: 'public',
          countryId: 1,
          observationFlag: 'p',
          observationValue: 328.5,
          timePeriod: 2024,
          vehicleTypeId: 2,
        },
      ],
    ]);
  });

  it('keeps entered values visible when an error is shown', async () => {
    const wrapper = mount(TrafficMetricForm, {
      props: {
        countries: [{ id: 1, label: 'Albania (AL)' }],
        vehicleTypes: [{ id: 2, label: 'Passenger cars (cars per thousand inhabitants)' }],
      },
    });

    await wrapper.get('select[name="country"]').setValue('1');
    await wrapper.get('input[name="timePeriod"]').setValue('2024');
    await wrapper.setProps({
      error: 'A metric already exists for that country, vehicle type, and year.',
    });

    expect(wrapper.text()).toContain('A metric already exists for that country, vehicle type, and year.');
    expect((wrapper.get('select[name="country"]').element as HTMLSelectElement).value).toBe('1');
    expect((wrapper.get('input[name="timePeriod"]').element as HTMLInputElement).value).toBe('2024');
  });
});
