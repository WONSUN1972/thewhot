# 더홋 Docker 개발·운영 안내

## 구성
Next.js + Medusa 2.22.4 + PostgreSQL 17 + Redis 7. Spring Boot는 사용하지 않는다.
기존 compose.yaml은 운영 빌드, compose.dev.yaml은 소스 수정이 반영되는 개발용 오버라이드다.
실제 PG·소셜로그인·외부 배포는 보류 상태다.

## 환경 설정
루트 .env.example → .env, 각 앱 .env.example → 해당 앱의 .env / .env.local로 복사한다.
기존 파일이 있으면 덮어쓰지 않는다. 비밀번호·JWT·쿠키 키는 고유 난수로 설정한다.
DB_PASSWORD는 URL에 안전한 난수(hex 권장)를 사용한다. 예제 값을 실제 서비스에 쓰지 않는다.
.env 및 백업은 Git에 포함하지 않는다. 백업에는 개인정보가 포함될 수 있으므로 접근을 제한한다.

## 별도 개발 환경
```sh
docker-compose -p thewhot-dev -f compose.yaml -f compose.dev.yaml config --quiet
docker-compose -p thewhot-dev -f compose.yaml -f compose.dev.yaml up -d db redis
docker-compose -p thewhot-dev -f compose.yaml -f compose.dev.yaml run --rm medusa sh -c 'npm ci --no-audit --no-fund && npx medusa db:migrate'
docker-compose -p thewhot-dev -f compose.yaml -f compose.dev.yaml run --rm storefront sh -c 'npm ci --no-audit --no-fund && npm run migrate'
docker-compose -p thewhot-dev -f compose.yaml -f compose.dev.yaml up -d --build
```
개발 서비스 포트는 8790/9000이며 현재 검토용 8791/9001과 분리된다.
새 DB에는 기존 상품·사용자 데이터가 자동 복사되지 않는다. 필요 시 별도 복제 절차를 수행한다.
최초 관리자 및 상품 데이터는 기존 Medusa 운영 절차로 생성하며 임의 시드를 운영 DB에 실행하지 않는다.

## 운영 빌드 준비
```sh
docker-compose -p thewhot-prod -f compose.yaml config --quiet
docker-compose -p thewhot-prod -f compose.yaml build
```
위 명령은 준비 단계다. 서버 배포 전 HTTPS 도메인, 역방향 프록시, STORE/ADMIN/AUTH_CORS,
APP_ORIGIN, FILE_PUBLIC_URL을 실제 주소로 설정하고 COOKIE_SECURE=true, ALLOW_LOCAL_HTTP=false로 설정한다.
내부 Docker DB 연결에는 DATABASE_SSL=false를 사용하며 외부 DB에는 검증 가능한 TLS를 사용한다.
새 설치에서는 DB/Redis 시작 → Medusa db:migrate → storefront migrate → 서비스 시작 순서를 따른다.
운영 업데이트에서는 쓰기 중지 및 백업 후 마이그레이션을 수행하고, 재시작 후 상태를 확인한다.
DB/Redis는 외부 포트를 노출하지 않는다. 앱 포트는 loopback으로 제한되어 있어 프록시가 필요하다.
프로젝트 이름 변경은 다른 볼륨을 만들므로 운영 이름은 고정한다. `down -v`는 사용하지 않는다.

## 백업과 복원 검증
현재 검토 환경을 읽기 전용으로 백업하는 예:
```sh
./ops/backup.sh thewhot-goods-local-db thewhot-medusa-review ./ops/backups goods_medusa_review
./ops/verify-restore.sh ./ops/backups/생성된폴더
```
DB는 트랜잭션 스냅샷, 업로드는 별도 파일 스냅샷이다. 완전한 일관성이 필요한 백업은
점검 시간에 모든 쓰기를 중지하고 진행한다. Redis의 대기 작업·진행 중 워크플로는 포함하지 않는다.
복구 전 대기 작업을 정리하고 별도 Redis 백업·복구 정책을 수립해야 한다.
검증 도구는 네트워크/공개 포트가 없는 임시 PostgreSQL에서 복원하고 해당 임시 자원만 삭제한다.
실제 운영 DB를 덮어쓰는 기능은 제공하지 않는다. 복구는 새 DB/볼륨에 검증 후 연결을 전환한다.
환경 비밀키는 별도 보안 저장소에 보관한다. 로컬 백업만으로 서버 장애에 대비할 수 없으므로
배포 전 암호화된 외부 보관 위치와 보존 기간을 정한다. 자동 예약은 아직 등록하지 않았다.

## 변경 기준
2026-11-09, codex/goods-local. origin/main 32cabb15924e941f041795d8432abea0ac7cc6db를 fetch하고
HEAD에 포함됨을 확인했다. 기존 검토 컨테이너는 교체하지 않는다.

백업 대상 DB 이름은 실행 중 앱의 DATABASE_URL과 대조한다. 컨테이너의 POSTGRES_DB는 초기 DB이므로 실제 앱 DB와 다를 수 있다.

## new.thewhot.com HTTPS / 2026-11-10
Caddy를 호스트 서비스로 실행하며 127.0.0.1:8790으로 프록시한다.
인증서는 Caddy가 자동 발급·갱신한다. 별도 certbot 갱신 작업을 중복 설치하지 않는다.
`systemctl is-enabled caddy` 및 `systemctl is-active caddy`가 모두 정상이어야 한다.
인증서 저장 위치 `/var/lib/caddy/.local/share/caddy`를 유지한다. 개인키는 Git에 넣지 않는다.
DNS A 레코드는 49.247.214.252 유지, 외부 80/443 및 서버의 DNS/HTTPS 통신 허용이 필요하다.
현재 인증서 만료는 2027-02-08이며 실제 갱신 주기 도래 전 강제 재발급은 하지 않았다.

추가 점검: `ops/check-tls.sh` → `/usr/local/sbin/thewhot-check-tls`,
`ops/systemd/thewhot-tls-check.*` → `/etc/systemd/system/`에 설치한다.
`systemctl enable --now thewhot-tls-check.timer`로 매일 한국시간 09시~09시10분에 검사한다.
HTTPS 신뢰 검증 실패 또는 잔여기간 14일 이하는 서비스 실패로 기록한다.
확인: `journalctl -u thewhot-tls-check.service`, `systemctl list-timers thewhot-tls-check.timer`.
메일·메신저 알림은 연결하지 않았으므로 로그 확인 또는 추후 외부 모니터링 연결이 필요하다.

## 소셜로그인 연결 준비 / 2026-11-10
Google·카카오·네이버를 대상으로 `goods-store/src/integrations/social.ts`에
설정 검사 및 준비 상태 모델을 추가했다. `.env.example`에 서버 전용 키 이름을 정의했다.
현재는 준비 단계이며 키 입력만으로 활성화되지 않는다. 기존 이메일 테스트 로그인은 유지한다.
Firebase 신규 설정은 수행하지 않았다. Medusa 고객 인증과 연결하는 구조를 우선 사용한다.

예정 콜백 (아직 동작하는 API가 아니며 연결 구현 후 제공자 콘솔에 등록):
- Google: https://new.thewhot.com/api/auth/social/google/callback
- 카카오: https://new.thewhot.com/api/auth/social/kakao/callback
- 네이버: https://new.thewhot.com/api/auth/social/naver/callback

연결에 필요한 운영자 준비:
1. 각 제공자의 개발자 콘솔에서 더홋 소유 앱 등록 및 웹사이트 주소 설정.
2. 앱 ID/Client ID와 서버용 Client Secret을 서버 비공개 환경 파일에 저장. 채팅/Git에 공유하지 않는다.
3. 개인정보처리방침·서비스약관 URL, 동의 화면, 제공자 심사/테스트 계정을 확인한다.
4. 고객 식별에 필요한 최소 항목만 요청하고 이메일이 없거나 동의가 거절된 경우도 처리한다.

구현·활성화 게이트:
- 제공자별 OAuth 어댑터 및 서버 콜백, 일회용 state·PKCE·만료·재사용 방지 구현.
- 콜백의 사용자 입력 이메일을 신뢰하지 않고 제공자 검증 결과와 고유 subject로 식별.
- Medusa 인증 모듈을 통해 고객을 생성·연결하며 관리자 role을 소셜가입으로 부여하지 않는다.
- 같은 이메일의 기존 계정은 자동 병합하지 않고 기존 계정 재인증 후 연결.
- 기존 SameSite=strict 회원 세션과 별도로 OAuth 왕복용 제한된 수명의 쿠키 정책 검토.
- 인증 성공/취소/실패/중복콜백/탈퇴/기존가입자 연결 및 로그아웃 통합 테스트 후 활성화.
- OAuth 토큰·비밀키를 브라우저 저장소나 로그로 출력하지 않는다.

이번 변경 기준: codex/goods-local, origin/main 32cabb15924e941f041795d8432abea0ac7cc6db
fetch 및 HEAD 포함 확인. SSL 점검은 서버 적용, 소셜 준비 코드는 로컬에만 존재한다.

추가 제공자 준비: 2026-11-10 사용자 요청에 따라 Apple·Facebook 설정 항목을 추가했다.
Apple은 Services ID, Team ID, Key ID, 서버 전용 .p8 키 경로를 준비한다.
예정 콜백은 /api/auth/social/apple/callback 및 /api/auth/social/facebook/callback이다.
Apple 웹 연결은 Apple 개발자 계정의 Sign in with Apple App ID / Services ID 설정을 확인해야 한다.
Instagram은 일반 고객 소셜로그인 제공자로 포함하지 않는다. 프로 계정용 콘텐츠 연동은 별도 검토한다.
단위 테스트 18개 통과. 로컬 .next/types에 남아 있던 중복 생성 파일(* 3.ts)은
/private/tmp/thewhot-next-duplicate-types에 보존 이동해 타입 중복을 해소했다.

## Kakao implementation / 2026-11-11
Kakao auth provider implemented in Medusa; credentials are backend-only.
Storefront POST /api/auth/social/kakao/start uses same-origin validation and a 10-minute
HttpOnly Secure SameSite=Lax browser state cookie. Callback consumes a PostgreSQL attempt
atomically, then exchanges the code through the private Medusa provider. Provider uses
Kakao user ID for identity and verified email for first-time registration. Existing email
conflicts do not merge accounts. Customer session stays HttpOnly/Secure/SameSite=Strict.
Provider rejects administrator authentication. Kakao access tokens are not persisted.
Enable KAKAO_ENABLED=true in both services; set backend SOCIAL_KAKAO_CLIENT_ID,
SOCIAL_KAKAO_CLIENT_SECRET and KAKAO_CALLBACK_URL. Apply adapter migration before restart.
No new customer is created by deployment; actual login requires user consent in Kakao.
Future apex migration: change APP_ORIGIN and KAKAO_CALLBACK_URL together after DNS/TLS
are ready; leave both callback addresses registered in Kakao during transition.
Local verification: 24 storefront tests (including mocked callback integration), 5 provider
tests, frontend production build and Medusa production build passed. Actual provider
consent flow still requires browser verification with the configured app.

Server verification: release fb940ea deployed at /srv/thewhot/releases/fb940ea,
project thewhot-test unchanged. Previous images tagged before-kakao and DB backed up
in /root/thewhot-backups/before-kakao-20261111.dump. Root/app environment files mode 600.
HTTPS /, /api/health, /api/products return 200; /api/admin stays 404. Foreign-origin
login start returns 403, invalid callback returns the expired-request redirect, valid
start returns 303 to kauth.kakao.com with the expected new.thewhot.com callback.
Browser button reached accounts.kakao.com login page. Real user login, consent,
code exchange, and customer creation remain unverified until user signs in.
