import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3000/api';
const TOKEN = __ENV.ACCESS_TOKEN || '';

export const options = { vus: 10, duration: '1m' };

export default function () {
  const headers = { Authorization: `Bearer ${TOKEN}` };
  const dash = http.get(`${BASE}/analytics/dashboard?code=executive`, { headers });
  check(dash, { 'dashboard': (r) => [200, 401, 403].includes(r.status) });
  sleep(0.5);
}
