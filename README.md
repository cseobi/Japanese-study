# 비즈니스 일본어 퀴즈

회의·메일·서류 발송에 쓰는 정중 표현을 브라우저에서 푸는 정적 퀴즈입니다.

https://cseobi.github.io/japanese-study/

## 세트 추가

1. `quizzes/set-01.json`을 복사해 `quizzes/set-02.json`을 만듭니다.
2. `id`, `title`, `questions`를 바꿉니다. 각 문항은 `instruction`, `prompt`, `answers`(복수 정답), `explanation`이 있으면 됩니다. 한자는 `readings`에 `[표기, 히라가나]`로 넣으면 가나 답도 인정됩니다.
3. `index.html`의 세트 목록에 버튼을 추가합니다.

```html
<button type="button" class="set-card" data-file="quizzes/set-02.json" data-id="set-02">Set 02 · 제목</button>
```

별도 빌드는 없습니다. `quiz.js`와 `quiz.css`를 그대로 씁니다.

## GitHub Pages

Settings > Pages > Build and deployment > Source: **Deploy from a branch** > Branch: **main** / **(root)** > Save.

저장소 루트의 `.nojekyll` 때문에 Jekyll이 파일을 빼먹지 않습니다.
