/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone 빌드로 server.js가 포함된 런타임 산출
  output: "standalone",
  reactStrictMode: true,
  // 다중 lockfile 환경에서 프로젝트 루트를 명시해 청크/트레이싱 경로를 안정화
  outputFileTracingRoot: __dirname,
  // 필요 시 여기에 추가 옵션을 넣으셔도 됩니다.
  // images: { domains: ['...'] },
  // experimental: { ... },
};

module.exports = nextConfig;
