# 감각 심리테스트 (sense-test)

이름·성별·생년월일 입력 → 심리테스트 → 결과 표시. 응답은 Upstash Redis에 저장되고, `도메인/rufrhkrhksflwkvpdlwl/`에서 비밀번호로 조회·CSV 다운로드.
- 비밀번호는 서버에서 확인 (페이지 소스에 없음). 같은 IP에서 10분간 5회 실패 시 잠금.
- 검색엔진 비노출(noindex) 헤더 적용.

## 파일 구성
| 파일 | 역할 |
|---|---|
| `data.js` | **질문·결과·동의문구 설정 (콘텐츠는 이 파일만 수정)** |
| `index.html` / `app.js` / `style.css` | 참여자 화면 |
| `rufrhkrhksflwkvpdlwl/index.html` | 관리자 화면 (`/rufrhkrhksflwkvpdlwl/`, 홈페이지 어디에도 링크 없음) |
| `api/submit.js` | 응답 저장 |
| `api/admin.js` | 비밀번호 확인 후 응답 목록·CTA 클릭 수 반환 |
| `api/track.js` | 결과 화면 '크리에이터 지원하기' 클릭 수 집계 (결과 유형별) |
| `api/_redis.js` | Redis 호출 헬퍼 (함수로 배포되지 않음) |
| `api/_scoring.js` | **비공개 점수표·결과 판정** (서버 전용, 브라우저로 전달되지 않음) |

## Vercel 배포 순서
1. 이 폴더를 GitHub 레포로 올린 뒤 Vercel에서 Import (Framework: Other, 빌드 설정 없음)
2. Vercel 프로젝트 → Storage → Marketplace에서 **Upstash for Redis** 연결
   - 연결 시 `KV_REST_API_URL`, `KV_REST_API_TOKEN` 환경변수가 자동 추가됨 (`UPSTASH_REDIS_REST_URL/TOKEN`도 지원)
3. Settings → Environment Variables에 `ADMIN_PASSWORD` 추가 (관리자 비밀번호)
4. Redeploy

## 결과 판정 (서버에서만 계산)
- 참여자 화면·브라우저에는 점수표와 점수가 전달되지 않음. 서버는 결과 유형 key만 반환.
- 질문·선택지 순서를 바꾸면 `api/_scoring.js`의 SCORES 순서도 똑같이 수정.
- 8문항 × 4지선다, 선택지 1개 = 해당 유형 1점. 선택지 순서는 참여자마다 무작위.
- 최고점 유형이 결과. 동점이면 동점 유형 중 가장 최근 문항에서 고른 유형.

## 광고 유입 추적
광고 링크에 `?utm_source=instagram` / `?utm_source=threads` 를 붙이면 관리자 화면 '유입' 열에 기록됨.

## 운영 전 확인
- 배포 후 `https://도메인/api/_scoring.js` 접속 시 404인지 확인 (점수표 비노출 확인)
- `data.js`의 `cta.url`에 구글폼 링크 입력 (비어 있으면 버튼 비활성). 미리 채워진 링크 사용 시 `{name}` `{result}` 자동 치환
- `data.js`의 `privacy.period`(보유기간) 문구를 운영 방침에 맞게 확정
- 공유 썸네일: `og.png`(1200×630) 준비 후 index.html의 og:image 주석 해제
