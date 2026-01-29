import http from "k6/http";
import { check } from "k6";

export let options = {
  stages: [
    { duration: "30s", target: 1000 } 
  ],
};
export default function () {
  const res = http.get(
    "http://host.docker.internal:8000/api/product/search?query=milk&page=1&page_size=20"
  );

  check(res, {
    "no server error": (r) => r.status < 500,
  });
}
