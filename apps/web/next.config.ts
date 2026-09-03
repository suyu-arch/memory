import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const config: NextConfig = {
  transpilePackages: ['@togetherly/contracts'],
  ...(isGitHubPages
    ? {
        output: 'export',
        basePath: '/memory',
        assetPrefix: '/memory/',
        trailingSlash: true,
      }
    : {}),
};
export default config;
