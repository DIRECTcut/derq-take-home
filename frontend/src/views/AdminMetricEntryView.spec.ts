import { mount } from '@vue/test-utils';
import AdminMetricEntryView from './AdminMetricEntryView.vue';

describe('AdminMetricEntryView', () => {
  beforeEach(() => {
    window.location.hash = '#/admin/data';
    window.sessionStorage.setItem(
      'traffic-data-admin-session',
      JSON.stringify({
        token: 'signed-token',
        expiresAt: '2099-01-01T00:00:00.000Z',
        expiresInSeconds: 3600,
        username: 'admin',
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.sessionStorage.clear();
  });

  it('loads country and vehicle-type options before enabling metric entry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 1, code: 'AL', name: 'Albania' }]), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify([{ id: 2, name: 'Passenger cars', unit: 'cars per thousand inhabitants' }]),
            { status: 200 },
          ),
        ),
    );

    const wrapper = mount(AdminMetricEntryView);

    await vi.waitFor(() => expect(wrapper.text()).toContain('Save metric'));
    expect(wrapper.findAll('option')).toHaveLength(4);
  });

  it('shows a form-level write error and keeps the entered values after a failed submit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify([{ id: 1, code: 'AL', name: 'Albania' }]), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify([{ id: 2, name: 'Passenger cars', unit: 'cars per thousand inhabitants' }]),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'duplicate key' }), { status: 409 })),
    );

    const wrapper = mount(AdminMetricEntryView);

    await vi.waitFor(() => expect(wrapper.text()).toContain('Save metric'));
    await wrapper.get('select[name="country"]').setValue('1');
    await wrapper.get('select[name="vehicleType"]').setValue('2');
    await wrapper.get('input[name="timePeriod"]').setValue('2024');
    await wrapper.get('input[name="observationValue"]').setValue('328');
    await wrapper.get('form').trigger('submit.prevent');

    await vi.waitFor(() =>
      expect(wrapper.text()).toContain('A metric already exists for that country, vehicle type, and year.'),
    );
    expect((wrapper.get('input[name="timePeriod"]').element as HTMLInputElement).value).toBe('2024');
  });
});
