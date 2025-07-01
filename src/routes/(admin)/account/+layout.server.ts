import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/public';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    clusters: locals.clusters,
    proxyDomain: env.PUBLIC_PROXY_DOMAIN,
    proxyApiDomain: env.PUBLIC_PROXY_API_DOMAIN
  };
};