import { redirect } from '@sveltejs/kit';

export function load() {
  throw redirect(308, '/account/contexts'); // Replace '/subpage' with your target
}
