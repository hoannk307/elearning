# Triển khai E-Learning lên VPS Ubuntu

Hệ thống chạy bằng **Docker Compose** (Postgres + Redis + Backend NestJS + Frontend Next.js + Caddy),
deploy tự động qua **GitHub Actions (SSH)**, lưu file lên **Cloudflare R2**.

---

## 1. Chuẩn bị Cloudflare R2

1. Cloudflare Dashboard → **R2** → tạo bucket (vd `elearning`).
2. **Manage R2 API Tokens** → tạo token quyền *Object Read & Write* → lấy `Access Key ID` + `Secret Access Key`.
3. Để hiển thị ảnh công khai, chọn 1 trong 2:
   - Bật **Public Development URL** (r2.dev) cho bucket, rồi đặt `R2_PUBLIC_BASE_URL` = URL r2.dev đó; **hoặc**
   - Gắn **Custom Domain** (vd `cdn.your-domain.com`) cho bucket, rồi đặt `R2_PUBLIC_BASE_URL` = `https://cdn.your-domain.com`.
4. `R2_ENDPOINT` có dạng `https://<account_id>.r2.cloudflarestorage.com`.

> ⚠️ Secret key đã chia sẻ ở dạng plaintext nên **nên tạo lại token mới** rồi mới dùng thật.

---

## 2. Khởi tạo Git & đẩy lên GitHub (làm trên máy local)

```bash
cd e:/Working/ELearning
git init
git add .
git commit -m "Initial deployable version"
git branch -M main
git remote add origin https://github.com/hoannk307/elearning.git
git push -u origin main
```

`.gitignore` đã loại `.env`, `node_modules`, `dist`, `uploads` — **không có secret nào bị đẩy lên**.

---

## 3. Chuẩn bị VPS Ubuntu (làm 1 lần)

```bash
# Cài Docker + compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER        # đăng xuất/đăng nhập lại để có hiệu lực

# Lấy code
sudo mkdir -p /opt/elearning && sudo chown $USER /opt/elearning
git clone git@github.com:<user>/<repo>.git /opt/elearning
cd /opt/elearning

# Tạo file .env thật từ mẫu
cp .env.prod.example .env
nano .env        # điền POSTGRES_PASSWORD, R2_*, ANTHROPIC_API_KEY, FRONTEND_URL...
```

Sửa **`Caddyfile`**: đổi `your-domain.com` và `admin@your-domain.com` thành domain/email thật.
Trỏ bản ghi DNS **A** của domain về IP VPS, mở port **80/443** trên firewall.

Khởi động lần đầu:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f backend   # xem migrate + khởi động
```

`docker-entrypoint.sh` tự chạy `prisma migrate deploy` mỗi lần backend khởi động.
Caddy tự xin chứng chỉ HTTPS Let's Encrypt cho domain.

(Tùy chọn) seed dữ liệu mẫu:
```bash
docker compose -f docker-compose.prod.yml exec backend npx ts-node prisma/seed.ts
```

---

## 4. CI/CD tự động (GitHub Actions)

Workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — mỗi khi push lên `main`:
1. Job **ci**: build thử backend + frontend (chặn deploy nếu lỗi).
2. Job **deploy**: SSH vào VPS → `git pull` → `docker compose ... up -d --build`.

Tạo **Repository Secrets** (GitHub → Settings → Secrets and variables → Actions):

| Secret | Giá trị |
|--------|---------|
| `VPS_HOST` | IP hoặc domain VPS |
| `VPS_USER` | user SSH (vd `ubuntu`) |
| `VPS_SSH_KEY` | **private key** SSH (toàn bộ nội dung) |
| `VPS_PORT` | (tùy chọn) port SSH nếu khác 22 |

Tạo SSH key cho Actions:
```bash
ssh-keygen -t ed25519 -f deploy_key -N ""
# Thêm deploy_key.pub vào ~/.ssh/authorized_keys trên VPS
# Dán nội dung deploy_key (private) vào secret VPS_SSH_KEY
```

Từ đó mỗi lần `git push origin main` là app tự cập nhật trên VPS.

---

## 5. Redis

Redis chạy như service trong [`docker-compose.prod.yml`](docker-compose.prod.yml), backend kết nối qua
`REDIS_HOST=redis` (BullMQ — xem [queue.module.ts](backend/src/queue/queue.module.ts)). Đặc điểm:
- **Không publish port 6379** ra Internet (chỉ trong mạng nội bộ Docker → an toàn).
- Bật **AOF persistence** (`--appendonly yes`), dữ liệu lưu ở volume `redisdata`.
- Không cần cài đặt thủ công gì thêm.

> Muốn thêm mật khẩu Redis: thêm `--requirepass <pass>` vào `command` của service redis, đặt
> `REDIS_PASSWORD` trong `.env`, và truyền `password` vào `connection` trong `queue.module.ts`.

---

## 6. Lệnh vận hành thường dùng

```bash
docker compose -f docker-compose.prod.yml ps           # trạng thái
docker compose -f docker-compose.prod.yml logs -f       # log realtime
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml down          # dừng (thêm -v để xoá data)
```

---

## 7. Kiểm thử sau deploy

1. Mở `https://your-domain.com` → đăng nhập được, HTTPS hợp lệ.
2. Chấm 1 bài (upload ảnh) → ảnh xuất hiện trong bucket R2, hiển thị được trên trang kết quả exam.
3. Sinh PDF (đề/bài tập) → Puppeteer chạy ok trong container.
4. Tác vụ AI (tạo bài) chạy qua hàng đợi BullMQ/Redis bình thường.
5. Push 1 commit nhỏ → Actions chạy xanh, app tự cập nhật.
