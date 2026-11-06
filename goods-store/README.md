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
