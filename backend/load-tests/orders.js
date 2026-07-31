import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3051/api';
const TOKEN = __ENV.ACCESS_TOKEN || '';

export const options = { vus: 10, duration: '1m' };

export default function () {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };
  const res = http.get(`${BASE}/orders`, { headers });
  check(res, { 'orders status': (r) => [200, 401, 403].includes(r.status) });
  sleep(0.5);
}
