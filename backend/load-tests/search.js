import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3051/api';

export const options = { vus: 25, duration: '1m' };

export default function () {
  const q = encodeURIComponent(__ENV.SEARCH_Q || 'laptop');
  const res = http.get(`${BASE}/catalog/products/search?q=${q}`);
  check(res, { 'search ok': (r) => r.status === 200 || r.status === 401 });
  sleep(0.5);
}
