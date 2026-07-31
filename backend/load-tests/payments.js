import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3000/api';
const TOKEN = __ENV.ACCESS_TOKEN || '';

export const options = { vus: 5, duration: '30s' };

export default function () {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': `k6-${__VU}-${__ITER}`,
  };
  // Read-only probe — do not create live charges in shared envs
  const res = http.get(`${BASE}/payments`, { headers });
  check(res, { 'payments probed': (r) => r.status < 500 });
  sleep(1);
}
