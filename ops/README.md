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
