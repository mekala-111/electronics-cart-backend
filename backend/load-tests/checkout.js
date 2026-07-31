import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3000/api';
const TOKEN = __ENV.ACCESS_TOKEN || '';

export const options = {
  scenarios: {
    checkout_smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '45s',
    },
  },
};

export default function () {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };
  const cart = http.get(`${BASE}/orders/cart`, { headers });
  check(cart, { 'cart reachable': (r) => r.status < 500 });
  sleep(1);
}
