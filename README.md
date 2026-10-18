# 작은 계산대

`Pictures/`의 장난감 계산대 사진을 참고한 Three.js 웹앱. 아이폰 Safari에서 사용할 정적 웹으로 개발하며 GitHub Pages 배포 경로는 `/test_3js/`이다.

현재 구현 범위는 `PLAN.md`의 1단계 개발·배포 기반과 2단계 전체 외형·기본 장면이다. 정상 화면에는 제목과 설명 없이 고정된 시점의 3D 모형만 크게 표시한다. 회전·확대·축소, 버튼 입력과 실제 계산은 후속 단계다. OPEN·스캐너·MIC는 외형만 제공한다. 스티커는 단순화한 임시 그래픽이며 사진 텍스처의 정밀 보정은 5단계다.

**로컬 실행**

Node.js 24와 npm이 필요하다. PowerShell에서 `npm.ps1` 실행 정책 문제가 있으면 아래 명령의 `npm`을 `npm.cmd`로 실행한다.

```sh
npm ci
npm run dev
```

개발 주소: <http://localhost:5173/test_3js/>. 서버는 네트워크 접속을 허용하는 설정으로 실행된다. 같은 Wi-Fi 또는 연결 가능한 로컬 네트워크의 아이폰에서는 터미널에 표시되는 Network 주소 뒤의 `/test_3js/`로 접속한다. PC의 방화벽 설정과 네트워크 분리에 따라 접근 가능 여부가 달라진다. `localhost`를 아이폰에 입력하면 PC로 연결되지 않는다. Windows에서 `npm ci`로 재설치하기 전에는 dev·preview 서버를 종료해 네이티브 패키지 파일의 점유를 해제한다.

**검사와 빌드**

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

프로덕션 미리보기: <http://localhost:4173/test_3js/>. `build`는 타입 검사를 포함하며 결과는 `dist/`에 생성한다. `preview`는 로컬 확인용이다. 테스트는 Node 내장 테스트 러너를 사용하며 현재 테스트 파일은 디스크 임시 파일을 만들지 않는다. 추후 파일이 필요한 테스트는 `AGENTS.md`의 `.tmp/tests/<실행별 디렉터리>/` 생성·정리 규칙을 따른다.

외형 검토용 고정 시점은 `?view=front`, `?view=back`, `?view=left`, `?view=right`로 선택할 수 있다. 예: <http://localhost:4173/test_3js/?view=back>. 이는 외형 비교를 위한 정적 시점이며 3단계의 사용자 회전 조작과는 별개다.

**구조**

| 경로 | 역할 |
|---|---|
| `src/main.ts` | 화면 시작과 초기화 실패 안내 |
| `src/scene.ts` | 조명·재질 환경, 카메라 맞춤, 크기 변경·자원 정리 |
| `src/model/register.ts` | 본체, 독립된 키, LCD, 주변 부품의 3D 형상 |
| `src/model/layout.ts` | 사진에 맞춘 키 배열과 배치 |
| `src/model/textures.ts` | 키 문자와 단순화한 스티커 그래픽 |
| `tests/` | 키 배열·모델 구조와 좌표 검증 |
| `Pictures/` | 보존하는 원본 참고 사진; 빌드에 포함되지 않음 |
| `docs/verification/` | 선별한 화면과 검증 기록 |

**GitHub Pages**

`.github/workflows/deploy.yml`은 main 푸시 또는 수동 실행으로 의존성 설치, 타입 검사, 테스트, 빌드 후 `dist/`를 배포한다. Node 버전은 `.nvmrc`를 따른다. 원격 반영·공개 단계에서 저장소 Settings → Pages → Source를 GitHub Actions로 설정하고 Actions 실행·Pages 사용 가능 여부를 확인해야 한다.

공개 주소: <https://graycat82.github.io/test_3js/>. Pages의 Source는 반드시 GitHub Actions로 설정한다. Deploy from a branch의 main 루트를 사용하면 Vite로 변환되지 않은 원본 HTML이 제공되어 CSS와 모델이 표시되지 않는다. Source 변경 후 Actions → Deploy to GitHub Pages → Run workflow로 main을 실행하거나 새 커밋의 배포가 성공했는지 확인한다. Pages 활성화 전에 실패한 실행은 자동으로 재개되지 않는다. 아이폰 실기기 확인을 포함한 최종 검증은 `PLAN.md` 7단계에서 진행한다.

Vite의 `base`는 `/test_3js/`다. 새 자산은 import, `new URL(..., import.meta.url)` 또는 `import.meta.env.BASE_URL`을 사용해 하위 경로를 유지한다. manifest·홈 화면 아이콘은 5단계에 추가한다.

**외형과 기기 확인**

전체 치수와 곡률은 실측 없이 사진에서 추정한 값이다. 주요 색상·부품·키 배치는 재현하되 작은 성형 흔적과 바닥 내부는 단순화한다. WebGL 2가 필요하며 기본 빌드 대상은 Safari 16.4다. 이 대상 설정이 모든 기기에서 동작함을 보장하지 않으므로 아이폰 기종·iOS 버전별 실기기 확인은 별도로 기록한다.

현재 Three.js 엔진 청크는 약 574 kB(압축 전)로 Vite의 기본 크기 경고가 발생한다. 기능 구현 이후 5단계에서 실제 기기의 로딩·렌더링 성능과 함께 추가 최적화를 판단한다.

작업 기준은 [AGENTS.md](AGENTS.md), 단계별 범위와 완료 기준은 [PLAN.md](PLAN.md)를 참고한다. 배포 기반은 [Vite 공식 안내](https://vite.dev/guide/static-deploy)를 따른다.
