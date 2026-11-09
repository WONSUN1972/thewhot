# Docker 구성 검증 — 2026-11-09

- 기준: origin/main 32cabb15924e941f041795d8432abea0ac7cc6db 포함 확인.
- 개발/운영 Compose: docker-compose 5.5.1 config --quiet 통과.
- 개발 이미지: thewhot-medusa:dev-env, thewhot-store:dev-env 빌드 통과.
- 스크립트: bash 문법 검사 및 git diff --check 통과.
- 단위 테스트: 11개 통과.
- 콘텐츠: 18페이지 / 이미지 참조 201 / 내부 링크 28, 실패 0.
- 실제 앱과 프런트엔드 DB 이름: goods_medusa_review.
- 백업: ops/backups/backup-20261109T073909Z-d8tPCx (Git 제외).
- SHA256 검증, 임시 PostgreSQL 복원: public 테이블 150개, 업로드 압축 해제 통과.
- 최초 기본 DB 스냅샷은 앱 DB가 아니므로 복구 대상으로 사용하지 않는다.
- 기존 8791/9001 서비스 및 볼륨은 변경하지 않음.

## 검증 범위의 한계
새 개발 스택 전체를 시작하거나 운영 서버에 배포하지 않았다.
개발 이미지 빌드와 Compose 설정 검사까지 완료했으며, 신규 설치의 패키지 설치·마이그레이션·
핫 리로드 통합 실행은 별도 검증 대상이다. 백업 시 쓰기 중지는 하지 않았으므로 DB와 파일의
동시 시점 일관성을 보증하지 않는다. Redis 작업 및 비밀키는 백업에 포함하지 않는다.
