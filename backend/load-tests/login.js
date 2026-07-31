import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3051/api';

export const options = {
  vus: 20,
  duration: '1m',
  thresholds: { http_req_duration: ['p(95)<1000'] },
};

export default function () {
  const payload = JSON.stringify({
    identifier: __ENV.LOAD_USER || 'load@example.com',
    password: __ENV.LOAD_PASS || 'ChangeMe123!',
  });
  const res = http.post(`${BASE}/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, { 'login handled': (r) => r.status === 200 || r.status === 401 });
  sleep(1);
}
