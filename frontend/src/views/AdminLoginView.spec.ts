import { mount } from '@vue/test-utils';
import AdminLoginView from './AdminLoginView.vue';

describe('AdminLoginView', () => {
  beforeEach(() => {
    window.location.hash = '#/admin/login';
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores the admin session and redirects to data entry after a successful login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            token: 'signed-token',
            expiresAt: '2099-01-01T00:00:00.000Z',
            expiresInSeconds: 3600,
          }),
          { status: 200 },
        ),
      ),
    );

    const wrapper = mount(AdminLoginView);

    await wrapper.get('input[name="username"]').setValue('admin');
    await wrapper.get('input[name="password"]').setValue('local-admin-password');
    await wrapper.get('form').trigger('submit.prevent');

    await vi.waitFor(() => expect(window.location.hash).toBe('#/admin/data'));
    expect(window.sessionStorage.getItem('traffic-data-admin-session')).toContain('signed-token');
  });

  it('shows an auth error and does not persist a session on invalid credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'invalid credentials' }), { status: 401 }),
      ),
    );

    const wrapper = mount(AdminLoginView);

    await wrapper.get('input[name="username"]').setValue('admin');
    await wrapper.get('input[name="password"]').setValue('bad-password');
    await wrapper.get('form').trigger('submit.prevent');

    await vi.waitFor(() => expect(wrapper.text()).toContain('Invalid username or password.'));
    expect(window.sessionStorage.getItem('traffic-data-admin-session')).toBeNull();
  });
});
