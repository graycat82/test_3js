# 5·6단계 구현과 통합 검증

검증일: 2026-10-18. Windows Codex 내장 브라우저에서 프로덕션 빌드의 `/test_3js/` 경로를 확인했다. 실제 아이폰 Safari 확인은 7단계에 남긴다.

**외형과 모바일 보정**

- OPEN 버튼을 키패드 앞쪽의 독립된 공간으로 옮기고 본체 앞부분·서랍 깊이를 함께 맞췄다. 하단 키·문자를 가리거나 키 입력을 막지 않는다.
- LCD 프레임을 뒤·위로 조정하고 첫 줄 키를 앞쪽으로 이동해 `1·2·3·÷` 위에 여백을 확보했다. 4×4 배열과 왼쪽 기능 키 순서를 유지한다.
- 사진을 참고한 스티커 atlas를 패널·서랍·스캐너에 적용했다. imagegen으로 재구성한 파생 이미지이므로 원본 사진과 세부 문자·그림이 완전히 일치하지 않는다. 치수·곡률 역시 사진 비율을 보고 추정했다. 원본 사진은 변경하지 않았다.
- Standard 재질, 1024² 그림자, 최대 DPR 2를 사용한다. 고정 그림자는 최초·복구 시 갱신하고 카메라 조작만으로 다시 생성하지 않는다. 키·카메라·소등 전환 외에는 렌더링을 멈춘다.
- 조작 버튼은 44px이고 안전 영역을 반영한다. 화면 하단에 별도 공간을 확보해 초기 전체 모델과 조작 버튼이 겹치지 않게 했다. `100dvh`, ResizeObserver, visualViewport·pageshow 갱신을 연결했다.
- 홈 화면 manifest와 SVG·PNG 180/192/512 아이콘을 추가했다. 프로젝트 하위 경로에 맞춰 시작 주소·범위·자산 경로를 설정했다.

**자동 검사**

| 검사 | 결과 |
|---|---|
| npm test | 43개 통과 |
| npm run typecheck / npm run build | 통과 |
| 모델 회귀 | OPEN과 모든 키의 공간 분리, LCD·첫 줄 여백, 16개 계산 키의 시점 가림 판정 통과 |
| 홈 화면 자산 | manifest 범위·시작 경로와 PNG 실제 크기 검사 통과 |
| JS/CSS/WebP/manifest/SVG/PNG HTTP | `/test_3js/`에서 모두 200 |
| 직접 새로고침 / 후면 쿼리 | 렌더링·자산 로딩 정상 |
| 정지 상태 | 마지막 프레임 60 / draw 호출 4128 이후 400ms 동안 변화 없음 (통합 검사 관측치) |
| 임시 파일 | 테스트는 디스크 임시 파일을 생성하지 않음; 검사 서버 종료 |

Vite 엔진 청크 경고는 남는다. 엔진 593.11kB(gzip 149.06kB), 앱 54.53kB(gzip 22.34kB), CSS 1.71kB, 스티커 WebP 360.50kB. 경고 기준을 숨기거나 조정하지 않았다.

**프로덕션 통합 검사**

`npm run build` 후 `npm run test:browser`를 실행하고 `http://localhost:4174/__qa/`에서 세 검사 버튼을 각각 실행했다. 총 24개 체크가 통과했고 각 기록에 `INTEGRATION_COMPLETE`를 남겼다.

- [모바일 합성 터치: 11개 체크](mobile-integration.json): CSS 390×780 iframe에서 7 입력·빠른 반복 77, 드래그 취소, 두 포인터 핀치와 해제, pointercancel, 계산 46, 점등·소등 후 값 유지, 정지 렌더링, 런타임 오류 없음.
- [수명주기: 10개 체크](lifecycle-integration.json): 비활성 상태의 프레임 중지·복귀, 실제 `WEBGL_lose_context` 확장으로 GPU 손실, 입력 차단·복구 안내, 8초 초과 시 다시 열기 안내, GPU 복구 후 다시 렌더링·기존 46 유지·소등·후속 계산 56.
- [시작 실패: 3개 체크](failure-integration.json): WebGL 2 생성 실패와 이미지 decode 실패를 주입해 오류·다시 열기 안내를 확인하고, 정상 재시작을 확인했다. 의도한 실패 로그와 정상 앱의 런타임 오류를 구분한다.

테스트 전용 진단 코드는 로컬 서버가 iframe에만 삽입한다. 합성 포인터의 네이티브 캡처 예외를 테스트 영역에서만 처리하고, 비활성 상태는 document.hidden을 모의한다. 이 진단·테스트 화면은 dist에 포함하지 않는다. 실제 운영 코드의 타이머가 소등 시점 직전에 실행되는 사례를 발견해 남은 시간을 기준으로 다시 예약하도록 수정했고, 통합 검사에서 소등을 재확인했다.

**직접 마우스·화면 조작**

| 사례 | 결과 |
|---|---|
| 데스크톱 실제 3D 키 12 + 34 = | LCD 46, 7세그먼트와 백라이트 표시 |
| 키에서 드래그 / 확대 / 처음 보기 | 계산값 46 유지, 회전·거리 변경·보기 복귀 |
| 후면에서 본체 클릭 | LCD 0·소등 유지, 앞면 키 입력되지 않음 |
| 세로 390×844 실제 3D 키 7 + 8 = | LCD 15 |
| OFF 후 7 클릭 / OFF 중 회전 | LCD 비어 있음·소등 유지, 회전 가능 |
| ON 후 다시 7 + 8 = | 15로 정상 계산 |
| 키보드 9 ÷ 0, AC, 9 − 12, AC, 0.1 + 0.2 | Error → −3 → 0.3을 7세그먼트로 표시 |
| MIC·OPEN 클릭 | 15·소등 유지, 계산에 영향 없음 |
| 가로 844×390와 높이 390×560 | 모델·조작 UI 배치, 크기 변경 후 결과 15 유지 |
| 정상 앱 콘솔 | 관측된 실행 오류 없음 |

**화면 자료**

- [전체 모델과 보정한 간격](desktop.jpg), [실제 버튼 계산 46](desktop-result.jpg)
- [후면](back.jpg), [회전](rotated.jpg), [확대](zoomed.jpg)
- [세로 전체 화면](mobile-portrait.jpg), [세로 계산 15](mobile-result.jpg), [OFF](power-off.jpg)
- [가로 전체 화면](mobile-landscape.jpg), [가로 계산](landscape-result.jpg), [높이 축소](mobile-short.jpg)
- [오류](lcd-error.jpg), [음수](lcd-negative.jpg), [소수점](lcd-decimal.jpg)

초기 전체 보기에서는 마이크·스캐너·케이블을 화면에 맞춘다. 확대·계산 보기는 키와 LCD에 집중하므로 주변 부품이나 서랍 일부가 잘릴 수 있으며 처음 보기로 전체 모델에 복귀할 수 있다.

**남은 7단계**

이 기록은 로컬 검증 결과이며 공개 배포는 해당 커밋의 GitHub Actions 실행과 공개 페이지에서 별도로 확인한다. 실물 아이폰의 Safari·홈 화면 실행, 노치 안전 영역, 실제 주소창 변화·핀치·앱 전환, GPU 성능·메모리·발열과 30fps 목표를 확인해야 한다. 위 모바일 화면과 합성 터치·모의 비활성 검증은 실기기 확인을 대신하지 않는다.

참고: [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html), [MDN 컨텍스트 손실 이벤트](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event), [manifest 시작 주소](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/start_url).
