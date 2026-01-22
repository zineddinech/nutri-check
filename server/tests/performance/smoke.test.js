import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 1,
  duration: "2s",
};

const BASE_URL = "http://server:8000";

export default function () {
  const res = http.get(`${BASE_URL}/`);
  check(res, {
    "status is 200 or 404": (r) => r.status === 200 || r.status === 404,
  });
}
