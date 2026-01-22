import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "20s", target: 50 },
    { duration: "40s", target: 200 },
    { duration: "20s", target: 0 },
  ],
};

export default function () {
  const res = http.get(
    "http://host.docker.internal:8000/api/product/getByIndex?sort_by=product_name_asc&page=1&page_size=20"
  );

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 1.2s": (r) => r.timings.duration < 1200,
  });

  sleep(1);
}
