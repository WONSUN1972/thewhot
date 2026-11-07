# THE WHOT · 브랜드 + 비주류 굿즈 시제품

기존 아임웹 브랜드 본문 18개와 원본 이미지 보관본을 유지합니다. BREWMASTER는 독립 메뉴이며 SHOP만 비주류 굿즈 화면으로 이동합니다. 가로형 이미지 워드마크, Pretendard, Material Symbols Outlined 100을 사용합니다.

## 현재 구성
- Next.js 16 / React 19 / TypeScript: 화면과 동일 출처 API 어댑터.
- Medusa 2.22.4: 실제 상품·가격·재고·고객 인증·시연 주문·관리자 API.
- PostgreSQL 17: Medusa 데이터와 어댑터 세션/재시도 기록. Redis 7: 이벤트·워크플로·잠금.
- 기존 자체 상품/회원/주문 DB는 백업 보존하며 현재 경로에서는 사용하지 않습니다.
- 외부 Firebase·소셜로그인·실결제 PG·배송 서비스는 연결하지 않았습니다.
- 샘플 글라스·티셔츠·에코백·머그만 주문 가능합니다. Medusa system provider는 시연용이며 금전 이동이 없습니다.
- 시연 주문은 Medusa 원본 order와 재고 예약을 생성합니다. 화면 재고는 가용 수량입니다. 상태 변경은 `metadata.demo_status`이며 실제 배송/결제 상태 변경이 아닙니다.

## 로컬 실행
Node 22.22 이상, PostgreSQL 17, Redis 7이 필요합니다. 두 앱에서 `npm ci`를 실행합니다.
1. `medusa-backend/.env.example`을 `.env`로 복사하고 전용 DB, Redis, 무작위 JWT/쿠키 비밀값 및 관리자 계정을 설정합니다. 기존 DB를 재사용하지 마세요.
로컬 HTTP에서는 `ALLOW_LOCAL_HTTP=true`로 설정합니다. 이 옵션은 모든 CORS 주소가 loopback일 때만 허용됩니다. 서버 HTTPS 배포에서는 false를 유지합니다.
2. Medusa 폴더에서 `npx medusa db:migrate`, `npm run seed`, `npx medusa exec ./src/scripts/bootstrap-admin.ts` 순서로 실행합니다. seed 재실행은 기존 상품·가격·재고를 보존합니다.
3. `npx medusa develop --host 127.0.0.1 --port 9000`으로 실행합니다. Medusa 관리자 URL은 `http://127.0.0.1:9000/app`입니다.
4. 관리자에서 THE WHOT Local Goods 공개 API 키를 확인합니다. 이 키는 굿즈 판매 채널 하나에만 연결해야 합니다.
5. `goods-store/.env.example`을 `.env.local`로 복사하고 같은 Medusa DB와 공개 API 키를 설정합니다. `node --env-file=.env.local scripts/migrate.mjs` 실행 후 `npm run dev`.
6. 화면 `http://127.0.0.1:8790`, 운영 화면 `/#admin`. Medusa 관리자 이메일·비밀번호로 로그인합니다. 비밀번호 없는 관리자 입구는 제거했습니다.

로컬 기존 데이터베이스는 `thewhot-goods-local-db`, Medusa DB는 `goods_medusa`, Redis는 `thewhot-goods-local-redis`. 독립 검증 DB `goods_medusa_review`와 포트 8791/9001은 QA 전용입니다. 운영에 QA DB/계정을 복사하지 마세요. 관리자 초기 설정 비밀값은 사용 후 환경에서 제거하고 안전한 암호 관리자에 보관합니다. 환경파일은 Git 제외입니다.

## 배포 준비 절차 (실제 서버 배포 미실행)
저장소 루트 `compose.yaml`과 양쪽 `Dockerfile`을 제공합니다. 각 이미지에는 환경파일을 포함하지 않습니다. Docker Compose v2가 서버에 필요합니다. 이 Mac의 기존 standalone docker-compose 5.5.1로 실제 Compose 기동을 추가 검증했습니다. 별도 환경파일·포트·이미지 태그 override와 새 DB/볼륨을 사용했고, 네 서비스 상태와 상품·시연 주문·관리자 조회가 통과했습니다. 서버에서는 docker compose 또는 호환 standalone 실행 파일이 필요합니다. 기존 전체 검수 3회와 별도인 보완 결과는 review/compose-supplement/summary.json에 있습니다.

1. 비밀값을 별도 주입하고 `DB_PASSWORD`를 서버 전용 무작위 값으로 설정합니다. URL에 쓰는 DB 암호는 URL 안전 문자로 생성하거나 인코딩합니다.
2. `docker compose up -d db redis` → `docker compose build`.
3. `docker compose run --rm medusa npx medusa db:migrate`.
4. `docker compose run --rm medusa npx medusa exec ./src/scripts/seed.js`.
5. `docker compose run --rm medusa npx medusa exec ./src/scripts/bootstrap-admin.js`.
6. 굿즈 채널의 공개 API 키를 storefront 환경파일에 설정한 후 `docker compose run --rm storefront node scripts/migrate.mjs`.
7. `docker compose up -d medusa storefront`. `/health`와 `/api/health`를 확인합니다.
8. TLS reverse proxy 앞에서 `APP_ORIGIN`, STORE/ADMIN/AUTH CORS를 실제 정확한 주소로 설정하고 `COOKIE_SECURE=true`. DB와 Redis는 외부 포트를 열지 않습니다. Medusa 관리자도 제한된 운영자 접근 경로를 권장합니다.

`DATABASE_SSL=false`는 동일 호스트의 사설 Docker DB 연결용입니다. 원격 DB 사용 시 TLS 인증서 검증을 활성화하세요. 로컬 예시 암호를 서버에 재사용하지 마세요. 외부 서비스 연결이 없어도 로컬 계정·굿즈·재고·시연 주문·관리자 흐름은 작동하지만, 실제 판매 개시는 범위 밖입니다.

## 백업·복구·재시작
- 배포 전 DB를 `pg_dump -Fc`로 별도 암호화 저장소에 백업하고 이미지 태그/커밋 SHA를 함께 기록합니다.
- 복구는 비어 있는 별도 DB에 `pg_restore --no-owner`로 실행하고 행 수·상품·주문·로그인을 확인한 뒤 전환합니다. 검증 전에 기존 DB를 덮어쓰지 않습니다.
- Redis는 AOF 영속 볼륨을 사용합니다. DB 백업과 Redis 볼륨 스냅샷은 쓰기 작업이 없는 시점에 맞추는 것이 안전합니다.
- 프로세스 재시작: `docker compose restart medusa storefront`. 볼륨을 제거하는 down 옵션은 사용하지 않습니다.
- 되돌리기: 이전 이미지 태그로 다시 기동합니다. 스키마 호환성 확인 없이 이전 앱을 새 스키마에 연결하지 않습니다.

## 시험
`npm test`, `npm run typecheck`, `npm run build`, `node tests/content.mjs`.
통합 시험: `TEST_BASE_URL=http://127.0.0.1:8790 node --env-file=../medusa-backend/.env tests/integration.mjs`.
관리자 비밀값을 출력하지 않으며 QA 회원은 `qa-…@example.test`, 주문은 시연 metadata로 구분됩니다. 시험은 전용 DB에서 수행하고 운영에 이관하지 않습니다.
전체 회차 결과는 `review/round-1`, `round-2`, `round-3`; 누적 상태는 `review/scheduled-rounds.json`.

## 알려진 범위
브랜드 본문은 이전 수집 보관본 기준입니다. 실시간 Imweb과 최신 내용 일치를 보증하지 않습니다. 이미지 안의 텍스트는 원본 보존이며 편집 가능한 텍스트로 전환하지 않았습니다. Vimeo 영상은 외부 서비스이므로 네트워크·제공자 정책에 영향을 받습니다. 실제 서버의 DNS/TLS/방화벽/백업 저장소와 외부 인증·PG는 아직 검증/연동하지 않았습니다. 샘플 사양·가격·배송 규칙은 실제 판매 정보가 아닙니다.

### 이미지 업로드 및 공통 메뉴 보완 (2026-11-07)
- Medusa Docker 이미지에서 `/app/static`을 node 사용자 소유로 생성합니다. Compose의 `goods_uploads` 볼륨이 재생성 후에도 공개 상품 이미지를 유지합니다.
- `FILE_PUBLIC_URL`은 브라우저에서 접근하는 백엔드 주소에 `/static`을 붙여 설정합니다. 로컬 검수는 `http://127.0.0.1:9001/static`입니다. 서버의 도메인·HTTPS 주소와 별도로 맞춰야 합니다.
- 이 로컬 파일 제공자는 공개 상품 이미지 시연용입니다. 실제 서비스 저장소 선택은 서버 배포 시 검토하며, 업로드 볼륨도 DB와 함께 백업합니다.
- 홈과 브랜드 상세가 `SiteHeader`를 공유합니다. 상단 18개 링크 실제 이동, 19개 화면의 3개 너비, 푸터 6개 링크를 확인했습니다. 세부 기록: `review/menu-upload-fix/summary.json`.

#### 공개 이미지 볼륨 백업·복구
1. 배포 환경의 실제 볼륨 이름을 `docker inspect`의 Mounts에서 확인합니다. Compose 기본 이름은 `<프로젝트>_goods_uploads`이며 `/app/static`에 연결됩니다. 검수 환경은 `thewhot-compose-review_goods_uploads`입니다.
2. 유지보수 시간에 이미지 쓰기를 중지합니다. 이 로컬 단일 인스턴스에서는 Medusa를 정지한 뒤 DB 덤프와 파일 백업을 같은 시점에 생성합니다. DB와 이미지 양쪽의 복구 지점을 함께 기록합니다.
3. 업로드 볼륨을 보조 컨테이너 `/data`에 **읽기 전용**으로, 접근 제한된 백업 폴더를 `/backup`에 연결하고 `tar -czpf /backup/public-images.tar.gz -C /data .`로 소유권·권한을 보존합니다. 백업 파일의 SHA256을 기록합니다. DB와 환경 비밀값은 Git에 저장하지 않습니다.
4. 복구는 새 named volume에 수행합니다. 원본 볼륨을 비우거나 덮어쓰지 않습니다. 보조 컨테이너에서 `tar -xzpf /backup/public-images.tar.gz -C /data`로 복구하고 node(UID 1000) 사용자가 읽고 쓸 수 있는지 확인합니다.
5. 격리된 Medusa 컨테이너에 복구 볼륨을 `/app/static`으로 연결합니다. `FILE_PUBLIC_URL`의 도메인/포트가 브라우저 주소와 일치하는지 확인하고 기존 파일 URL의 HTTP 200 및 원본 SHA256 일치를 검증합니다. DB 파일 메타데이터와 상품 연결도 함께 복구해야 합니다.
6. 검증 통과 후에만 운영 전환합니다. 기존 볼륨·백업은 보존합니다. `down -v` 또는 원본 볼륨 삭제를 복구 절차에 사용하지 않습니다.

2026-11-07 보완 검수는 기존 전체 3회 검수를 늘리지 않는 영향 범위 검사입니다. 실제 컨테이너 재생성, 별도 볼륨 복구, 모듈 변경 후 핵심 API 회귀 결과 및 시험 대상 커밋은 `review/upload-persistence/`에 기록합니다. 실제 서버의 DNS·TLS·프록시·방화벽은 여전히 별도 사전점검 대상입니다.
