import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "1m", target: 80 },
    { duration: "3m", target: 80 },
    { duration: "1m", target: 0 },
  ],
};

export default function () {
  const res = http.get(
    "http://host.docker.internal:8000/api/product/getByIndex?sort_by=product_name_asc&page=1&page_size=20"
  );

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 800ms": (r) => r.timings.duration < 800,
  });

  sleep(1);
}
