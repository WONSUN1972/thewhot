# 서버 비공개 테스트 배포 — 2026-11-10 (Asia/Seoul)

- 서버: 49.247.214.252 / Ubuntu 24.04 / x86_64 / 4 vCPU / 약 4GB RAM.
- Docker와 Compose를 Ubuntu 공식 패키지로 설치.
- 실행 소스: a0e485a (이후 e30b211은 부하 테스트 보고서만 추가).
- 서버 경로: /srv/thewhot/releases/a0e485a. Compose 프로젝트: thewhot-test.
- Next.js, Medusa, PostgreSQL, Redis 모두 healthy.
- Next.js 이미지: src + .next + public + node_modules 포함, .env.local 제외 확인.
- Medusa 이미지: 컴파일된 medusa-config.js + src + node_modules 포함, .env 제외 확인.
- DB·업로드는 명명된 볼륨. 비밀값은 서버 파일에 보관하며 원문은 이 기록에 포함하지 않음.
- 새 DB에 비주류 샘플 상품 4개(glass, tee, tote, mug)와 별도 테스트 관리자 생성.
- 로컬 고객·주문 데이터는 전송하지 않음. 실제 PG·소셜로그인 연결 없음.

## 접속
서버의 8790/9000은 127.0.0.1에만 바인딩. DB/Redis는 공개 포트 없음.
SSH 터널 연결 중인 사용자 컴퓨터에서:
- 사이트: http://127.0.0.1:18790/
- 관리자: http://127.0.0.1:19000/app/login

터널 재연결 예 (이미 실행 중이면 중복 실행하지 않음):
```sh
ssh -N -i ~/.ssh/lobstercode_thewhot -o ExitOnForwardFailure=yes \
  -L 127.0.0.1:18790:127.0.0.1:8790 \
  -L 127.0.0.1:19000:127.0.0.1:9000 root@49.247.214.252
```
최초 호스트 키는 별도 /private/tmp/thewhot-server-known-hosts에 저장됨.
기본 known_hosts로 재접속할 때는 해당 지문과 비교 후 등록한다.

## 검증
HTTP 200: /, /brand/BrandStory, /brand/Brewmaster, /brand/DesignbyUs,
/api/health, /api/products, 관리자 /app/login.
상품 API의 비주류 샘플 4개 확인. 네 컨테이너 healthcheck 정상.
초기 확인 시 컨테이너 메모리 합계 약 305MiB (OS 제외, 부하 시험 아님).
이번 검증은 HTTP/API 스모크 테스트이며 브라우저 시각 검수·서버 부하 테스트는 별도다.

## 공개 전 남은 사항
도메인과 HTTPS, 운영 비밀키·관리자 정책, 실제 상품 확정, 백업 외부 보관 및 예약,
운영 환경 설정·로그 정책·결제 연동 검증. 현재는 SSH 터널 전용 시연 설정이며
COOKIE_SECURE=false / ALLOW_LOCAL_HTTP=true와 loopback CORS를 사용한다.
도메인 공개 전에 이 설정을 운영 HTTPS 값으로 변경해야 한다.
관리자 자격증명은 서버에만 보관. 로컬 파일 복사는 명시적 승인 대기.
