# Triển khai E-Learning lên VPS Ubuntu

Hệ thống chạy bằng **Docker Compose** (Postgres + Redis + Backend NestJS + Frontend Next.js + Caddy),
lưu file lên **Cloudflare R2**.

**Kiến trúc CI/CD:** GitHub Actions **build image trên runner → push lên GHCR**
(GitHub Container Registry), sau đó SSH vào VPS để **`docker compose pull` + `up`**.
VPS **không build, không cần source code, không cần git** — chỉ cần Docker + file `.env`.

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

VPS chỉ cần **Docker**, thư mục `/opt/elearning` và file **`.env`**. Không cần clone code,
không cần git, không build gì cả — `docker-compose.prod.yml` và `Caddyfile` sẽ được
GitHub Actions tự copy lên mỗi lần deploy.

```bash
# Cài Docker + compose plugin
curl -fsSL https://get.docker.com | sh

# Tạo thư mục chứa cấu hình + .env
mkdir -p /opt/elearning
cd /opt/elearning

# Tạo file .env thật (điền POSTGRES_PASSWORD, R2_*, ANTHROPIC_API_KEY, FRONTEND_URL...)
nano .env
```

> Nội dung `.env` xem mẫu trong [`.env.prod.example`](.env.prod.example). File này **chỉ nằm
> trên VPS**, không commit và không bị Actions ghi đè.

Trỏ bản ghi DNS **A** của domain (`elearning.nhatranglands.vn`) về IP VPS, mở port **80/443** trên firewall.
Domain/email trong [`Caddyfile`](Caddyfile) đã điền sẵn — Caddy tự xin chứng chỉ HTTPS Let's Encrypt.

`docker-entrypoint.sh` (đã nằm trong image backend) tự chạy `prisma migrate deploy` mỗi lần backend khởi động.

(Tùy chọn) seed dữ liệu mẫu sau khi stack đã chạy:
```bash
cd /opt/elearning
docker compose -f docker-compose.prod.yml exec backend npx ts-node prisma/seed.ts
```

---

## 4. CI/CD tự động (GitHub Actions)

Workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — mỗi khi push lên `main`:
1. Job **build-and-push**: build image backend + frontend trên runner, push lên **GHCR**
   (`ghcr.io/hoannk307/elearning-backend` và `...-frontend`, tag `latest` + commit SHA).
2. Job **deploy**: `scp` `docker-compose.prod.yml` + `Caddyfile` lên VPS → SSH vào VPS →
   `docker login ghcr.io` → `docker compose pull` → `up -d` (VPS chỉ kéo image, **không build**).

Đăng nhập GHCR ở bước deploy dùng `secrets.GITHUB_TOKEN` (tự động có sẵn, quyền `packages:write`
được khai trong workflow), nên **không cần tạo PAT thủ công**.

Chỉ cần **một Repository Secret** (GitHub → Settings → Secrets and variables → Actions):

| Secret | Giá trị |
|--------|---------|
| `VPS_SSH_KEY` | **private key** SSH (toàn bộ nội dung) để Actions vào VPS |

> `host`/`username`/`port` đang ghi thẳng trong workflow (`103.101.162.52` / `root` / `22`).
> Muốn giấu thì chuyển lại thành `${{ secrets.VPS_HOST }}`, `${{ secrets.VPS_USER }}`, `${{ secrets.VPS_PORT }}`.

Tạo SSH key cho Actions:
```bash
ssh-keygen -t rsa -b 4096 -m PEM -f deploy_key -N ""
# Thêm deploy_key.pub vào ~/.ssh/authorized_keys trên VPS (user root)
# Dán nội dung deploy_key (private) vào secret VPS_SSH_KEY
```

Từ đó mỗi lần `git push origin main` là app tự build → push image → cập nhật trên VPS.

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
