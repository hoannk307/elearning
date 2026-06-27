#!/bin/sh
set -e

# Áp dụng migration trước khi khởi động (an toàn cho production).
echo "→ Đang chạy prisma migrate deploy..."
npx prisma migrate deploy

echo "→ Khởi động backend..."
exec node dist/src/main
