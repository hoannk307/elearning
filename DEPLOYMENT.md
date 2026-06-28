# Triển khai E-Learning lên VPS Ubuntu

Hệ thống chạy bằng **Docker Compose** (Postgres + Redis + Backend NestJS + Frontend Next.js + Caddy),
lưu file lên **Cloudflare R2**.

## Kiến trúc CI/CD (tóm tắt)

```
git push origin main
      │
      ▼
GitHub Actions ─ job build-and-push : build image backend + frontend ─► push lên GHCR
               └ job deploy          : scp compose+Caddyfile ─► SSH vào VPS
                                        docker login ghcr ─► docker compose pull ─► up -d
      │
      ▼
VPS (chỉ chạy container, KHÔNG build, KHÔNG cần source code / git)
   Postgres · Redis · backend · frontend · Caddy(:8080)
      │
      ▼
Cloudflare proxy ──► https://elearning.nhatranglands.vn  (Cloudflare lo HTTPS)
```

**Nguyên tắc cốt lõi:**
- **Build ở CI, không build ở VPS.** Runner build image rồi đẩy lên GHCR; VPS chỉ `pull`.
- **Secret KHÔNG nằm trên VPS.** Mọi secret lưu trong **GitHub Secrets**, được Actions bơm thành
  biến môi trường lúc `docker compose up` → Docker lưu vào cấu hình container. **Không có file `.env`** trên VPS.
- **VPS chỉ cần Docker + thư mục `/opt/elearning`.** File `docker-compose.prod.yml` và `Caddyfile`
  do Actions tự `scp` lên mỗi lần deploy (đừng sửa tay trên VPS — sẽ bị ghi đè).
- **Caddy chạy cổng `8080`** (không phải 80/443) vì 80/443 đã thuộc stack khác (`nginx_proxy_prod` của batdongsan).
  HTTPS + URL sạch do **Cloudflare proxy** đảm nhiệm.

---

## 1. Chuẩn bị Cloudflare R2 (lưu ảnh bài làm)

1. Cloudflare Dashboard → **R2** → tạo bucket (vd `elearning`).
2. **Manage R2 API Tokens** → tạo token quyền *Object Read & Write* → lấy `Access Key ID` + `Secret Access Key`.
3. Để hiển thị ảnh công khai, chọn 1 trong 2:
   - Bật **Public Development URL** (r2.dev) cho bucket, rồi đặt `R2_PUBLIC_BASE_URL` = URL r2.dev đó; **hoặc**
   - Gắn **Custom Domain** (vd `cdn.your-domain.com`) cho bucket, rồi đặt `R2_PUBLIC_BASE_URL` = `https://cdn.your-domain.com`.
4. `R2_ENDPOINT` có dạng `https://<account_id>.r2.cloudflarestorage.com`.

> ⚠️ Nếu R2 key từng bị lộ (commit vào git, chia sẻ plaintext...) thì **tạo lại token mới** rồi mới dùng.

---

## 2. Khai báo Secrets trên GitHub (làm 1 lần)

Toàn bộ secret production lưu ở: GitHub repo → **Settings → Secrets and variables → Actions**.
Nhanh nhất là dùng `gh` CLI (chạy ở thư mục repo trên máy local, điền giá trị thật):

```bash
# SSH key để Actions vào VPS (xem mục 4 để tạo)
gh secret set VPS_SSH_KEY < deploy_key

# Secret bơm vào container lúc deploy
gh secret set POSTGRES_USER        --body "postgres"
gh secret set POSTGRES_PASSWORD    --body "<mat-khau-postgres-manh>"
gh secret set POSTGRES_DB          --body "kids_lms"
gh secret set FRONTEND_URL         --body "https://elearning.nhatranglands.vn"
gh secret set ANTHROPIC_API_KEY    --body "sk-ant-..."
gh secret set GEMINI_API_KEY       --body ""
gh secret set AI_DEFAULT_MODEL     --body "claude-sonnet-4-6"
gh secret set APP_PIN              --body "1234"
gh secret set R2_ENDPOINT          --body "https://<account_id>.r2.cloudflarestorage.com"
gh secret set R2_ACCESS_KEY_ID     --body "<r2-access-key>"
gh secret set R2_SECRET_ACCESS_KEY --body "<r2-secret-key>"
gh secret set R2_BUCKET            --body "elearning"
gh secret set R2_PUBLIC_BASE_URL   --body "https://nhatranglands.vn"
```

Bảng tổng hợp:

| Secret | Bắt buộc | Ghi chú |
|--------|:--------:|---------|
| `VPS_SSH_KEY` | ✅ | Private key SSH (RSA PEM, toàn bộ nội dung) để Actions vào VPS |
| `POSTGRES_PASSWORD` | ✅ | Mật khẩu DB. Xem cảnh báo đổi mật khẩu ở mục 6 |
| `FRONTEND_URL` | ✅ | Domain công khai, dùng cho CORS backend |
| `ANTHROPIC_API_KEY` | ✅ | Key Claude — thiếu thì tác vụ AI không chạy |
| `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | ✅ | Lưu ảnh lên R2 |
| `POSTGRES_USER`, `POSTGRES_DB` | ⬜ | Mặc định `postgres` / `kids_lms` nếu bỏ trống |
| `GEMINI_API_KEY`, `AI_DEFAULT_MODEL`, `APP_PIN`, `R2_PUBLIC_BASE_URL` | ⬜ | Tùy chọn / có giá trị mặc định |

> `host`/`username`/`port` của VPS đang ghi thẳng trong [`deploy.yml`](.github/workflows/deploy.yml)
> (`103.101.162.52` / `root` / `22`). Muốn giấu thì đổi sang `${{ secrets.VPS_HOST }}`...

---

## 3. Chuẩn bị VPS Ubuntu (làm 1 lần)

VPS **chỉ cần Docker và thư mục `/opt/elearning`** — không clone code, không git, không build, không `.env`.

```bash
# Cài Docker + compose plugin
curl -fsSL https://get.docker.com | sh

# Tạo thư mục chứa cấu hình (compose + Caddyfile do Actions tự copy vào đây)
mkdir -p /opt/elearning

# Mở cổng 8080 (Caddy của app) trên firewall
ufw allow 8080/tcp     # nếu dùng ufw
```

`docker-entrypoint.sh` (đã nằm trong image backend) tự chạy `prisma migrate deploy` mỗi lần backend khởi động,
nên không cần migrate thủ công.

---

## 4. Tạo SSH key cho GitHub Actions

Actions SSH vào VPS bằng key riêng (RSA dạng PEM — drone-ssh của appleboy parse ổn định nhất):

```bash
ssh-keygen -t rsa -b 4096 -m PEM -f deploy_key -N ""
```

- Thêm **public key** vào VPS (user `root`):
  ```bash
  # copy nội dung deploy_key.pub vào /root/.ssh/authorized_keys trên VPS
  chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys
  ```
- Dán **private key** (`deploy_key`) vào secret `VPS_SSH_KEY` (`gh secret set VPS_SSH_KEY < deploy_key`).
- Kiểm tra (ép chỉ dùng key này): nếu in ra `root` không hỏi mật khẩu là OK:
  ```bash
  ssh -i deploy_key -o IdentitiesOnly=yes -o PreferredAuthentications=publickey root@103.101.162.52 whoami
  ```

---

## 5. HTTPS qua Cloudflare (URL sạch, không đụng cổng 80/443)

Caddy chạy HTTP ở cổng `8080`. Để có `https://elearning.nhatranglands.vn` (không đuôi `:8080`),
dùng Cloudflare proxy:

1. Cloudflare DNS: bản ghi **A** `elearning` → `103.101.162.52`, bật **Proxy (đám mây cam)**.
2. Cloudflare → **Rules → Origin Rules**: với hostname `elearning.nhatranglands.vn` → **Rewrite to** port `8080`.
3. **SSL/TLS** mode: **Flexible** (Cloudflare lo HTTPS cho khách, kết nối về origin qua HTTP:8080).

> Bảo mật thêm: chặn cổng 8080 chỉ cho dải IP của Cloudflare (ufw allow from `<CF range>` to any port 8080),
> để không ai truy cập thẳng `http://IP:8080`.

---

## 6. CI/CD tự động (GitHub Actions)

Workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — mỗi khi push `main`
(hoặc bấm **Run workflow** thủ công):

1. **build-and-push**: build image backend + frontend trên runner → push lên GHCR
   (`ghcr.io/hoannk307/elearning-backend` & `...-frontend`, tag `latest` + commit SHA), có cache `type=gha`.
2. **deploy**: `scp` `docker-compose.prod.yml` + `Caddyfile` lên `/opt/elearning` →
   SSH vào VPS → `docker login ghcr.io` (bằng `GITHUB_TOKEN`) → `docker compose pull` → `up -d` → `image prune`.
   Secret được truyền qua `envs` của appleboy, compose nội suy vào container — **không ghi file `.env`**.

Đăng nhập GHCR dùng `secrets.GITHUB_TOKEN` (quyền `packages:write` khai trong workflow), **không cần PAT**.

> ⚠️ **Vận hành thủ công trên VPS:** vì secret chỉ tồn tại trong shell lúc Actions chạy, **đừng tự chạy
> `docker compose up`/`restart` trên VPS** mà không có biến môi trường — compose sẽ nội suy ra rỗng và
> recreate container với cấu hình sai. Cần thao tác tay thì `export` biến trước, hoặc **chỉ deploy qua Actions**.
> Lệnh chỉ đọc (`ps`, `logs`) thì an toàn.

### Đổi mật khẩu Postgres
Đổi `POSTGRES_PASSWORD` trong secret **không** đổi mật khẩu của DB đã khởi tạo (lưu trong volume `pgdata`) →
backend sẽ không kết nối được. Nếu DB chưa có dữ liệu thật, xóa volume tạo lại:
```bash
cd /opt/elearning
docker compose -f docker-compose.prod.yml down -v   # ⚠️ XÓA toàn bộ data DB
# rồi deploy lại để tạo DB mới khớp mật khẩu
```

---

## 7. Redis

Redis chạy như service trong [`docker-compose.prod.yml`](docker-compose.prod.yml), backend kết nối qua
`REDIS_HOST=redis` (BullMQ — xem [queue.module.ts](backend/src/queue/queue.module.ts)):
- **Không publish port 6379** ra Internet (chỉ trong mạng nội bộ Docker).
- Bật **AOF persistence** (`--appendonly yes`), dữ liệu ở volume `redisdata`.

---

## 8. Lệnh vận hành thường dùng (trên VPS)

```bash
cd /opt/elearning
docker compose -f docker-compose.prod.yml ps            # trạng thái
docker compose -f docker-compose.prod.yml logs -f        # log realtime
docker logs --tail 50 kids-lms-backend                   # log backend
# KHÔNG tự up/restart nếu thiếu biến môi trường — xem cảnh báo mục 6.
```

(Tùy chọn) seed dữ liệu mẫu — lưu ý image runtime đã loại devDependencies nên có thể thiếu `ts-node`:
```bash
docker compose -f docker-compose.prod.yml exec backend node dist/prisma/seed.js   # nếu seed đã build
```

---

## 9. Kiểm thử sau deploy

1. Mở `https://elearning.nhatranglands.vn` → đăng nhập được, HTTPS hợp lệ (khóa xanh Cloudflare).
2. Chấm 1 bài (upload ảnh) → ảnh xuất hiện trong bucket R2, hiển thị được trên trang kết quả exam.
3. Sinh PDF (đề/bài tập) → Puppeteer chạy ok trong container.
4. Tác vụ AI (tạo bài) chạy qua hàng đợi BullMQ/Redis bình thường.
5. Push 1 commit nhỏ → Actions chạy xanh (build → push → deploy), app tự cập nhật.

---

## 10. Chạy song song với stack khác trên cùng VPS

VPS này còn chạy stack **batdongsan** (`nginx_proxy_prod` giữ cổng 80/443). Hai stack **độc lập**:
- elearning dùng network riêng `elearning_default`, Caddy publish cổng `8080` → không đụng 80/443.
- Định tuyến domain elearning do **Cloudflare** lo (mục 5), không cần sửa `nginx_proxy_prod`.
- Mỗi stack có Postgres/volume riêng, không chia sẻ dữ liệu.
