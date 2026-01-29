import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "15s", target: 50 },
    { duration: "30s", target: 150 },
    { duration: "15s", target: 0 },
  ],
};

export default function () {
  const res = http.get(
    "http://host.docker.internal:8000/api/product/search?query=milk&page=50&page_size=20"
  );

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 2s": (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
