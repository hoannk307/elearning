/** @type {import('next').NextConfig} */

// URL backend nội bộ. Local dev: http://localhost:3001.
// Trong Docker/compose: http://backend:3001 (đặt qua biến môi trường BACKEND_INTERNAL_URL).
const BACKEND = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:3001';

const nextConfig = {
  // Sinh bản build standalone để đóng Docker image gọn nhẹ.
  output: 'standalone',
  async rewrites() {
    // Proxy /api/* sang NestJS backend
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND}/api/:path*`,
      },
      {
        // Ảnh/file cũ còn phục vụ tĩnh bởi NestJS (ảnh mới dùng URL R2 tuyệt đối)
        source: '/uploads/:path*',
        destination: `${BACKEND}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
