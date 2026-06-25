function createQuizApp(config) {
  const questions = config.questions || [];
  const totalTime = (config.timeMinutes || 25) * 60;
  let timeLeft = totalTime;
  let timer = null;

  function formatMathText(text) {
    let t = String(text || "");
    t = t.replace(/\$(.*?)\$/g, (_, expr) => `\\(${expr}\\)`);
    if (!t.includes("\\(") && /\\\\|\^|_|\{.*\}/.test(t)) {
      t = `\\(${t}\\)`;
    }
    return t;
  }

  function renderQuestionText(text) {
    return formatMathText(text).replace(/\?\s*$/, " ?");
  }

  function typesetMath(target) {
    if (window.MathJax && window.MathJax.typesetPromise) {
      MathJax.typesetClear([target]);
      MathJax.typesetPromise([target]).catch(() => {});
    }
  }

  function updateProgress() {
    const answered = questions.filter((_, i) => !!document.querySelector(`input[name=\"q${i}\"]:checked`)).length;
    const percentByAnswer = (answered / questions.length) * 100;
    const percentByTime = ((totalTime - timeLeft) / totalTime) * 100;
    const fill = document.getElementById("progress-fill");
    if (fill) {
      fill.style.width = `${Math.max(percentByAnswer, percentByTime)}%`;
    }
  }

  function drawTimer() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    const time = document.getElementById("time");
    if (time) {
      time.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    updateProgress();
  }

  function renderQuestions() {
    const box = document.getElementById("questions-container");
    let html = "";

    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      html += `
        <article class="question" id="q-${i}">
          <div class="q-head">
            <div class="q-no">${i + 1}</div>
            <div class="q-text">${renderQuestionText(q.q)}</div>
          </div>
          <ul class="option-list">
            ${q.opts
              .map(
                (opt, j) => `
              <li class="option">
                <input type="radio" name="q${i}" id="q${i}-o${j}" value="${j}" onchange="window.quizApp.updateProgress()" />
                <label class="option-label" for="q${i}-o${j}">${String.fromCharCode(97 + j)}) ${formatMathText(opt)}</label>
              </li>
            `
              )
              .join("")}
          </ul>
        </article>
      `;
    }

    box.innerHTML = html;
    typesetMath(box);
    updateProgress();
  }

  function startTimer() {
    timer = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        timeLeft = 0;
        submitQuiz(true);
        return;
      }
      drawTimer();
    }, 1000);
    drawTimer();
  }

  function startQuiz() {
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("quiz-screen").classList.remove("hidden");

    const statusBar = document.getElementById("status-bar");
    statusBar.classList.remove("hidden");
    statusBar.style.display = "flex";

    renderQuestions();
    startTimer();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function spawnConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8', '#f06595'];
    for (let i = 0; i < 90; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = (Math.random() * 100) + '%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.width = (6 + Math.random() * 8) + 'px';
      piece.style.height = (6 + Math.random() * 8) + 'px';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      piece.style.animationDuration = (1.8 + Math.random() * 2) + 's';
      piece.style.animationDelay = (Math.random() * 0.8) + 's';
      container.appendChild(piece);
    }
    setTimeout(function () { container.remove(); }, 5000);
  }

  function animateScore(targetScore, duration) {
    const el = document.getElementById('score');
    if (!el) return;
    let current = 0;
    const steps = Math.max(targetScore, 1);
    const intervalMs = Math.max(Math.floor(duration / steps), 20);
    const tick = setInterval(function () {
      current = Math.min(current + 1, targetScore);
      el.textContent = String(current);
      if (current >= targetScore) clearInterval(tick);
    }, intervalMs);
  }

  function submitQuiz(autoSubmit) {
    clearInterval(timer);
    timer = null;

    document.getElementById("quiz-screen").classList.add("hidden");
    document.getElementById("status-bar").classList.add("hidden");

    const overlay = document.createElement('div');
    overlay.className = 'submit-overlay';
    overlay.innerHTML =
      '<div class="submit-loader">' +
        '<div class="loader-ring"></div>' +
        '<span class="loader-panda">&#x1F43C;</span>' +
        '<p class="loader-text">&#x09AB;&#x09B2;&#x09BE;&#x09AB;&#x09B2; &#x09A4;&#x09C8;&#x09B0;&#x09BF; &#x09B9;&#x099A;&#x09CD;&#x099B;&#x09C7;&#x2026;</p>' +
      '</div>';
    document.body.appendChild(overlay);

    let score = 0;
    let review = "";

    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      const checked = document.querySelector(`input[name=\"q${i}\"]:checked`);
      const selected = checked ? Number(checked.value) : -1;

      if (selected === q.ans) {
        score += 1;
      }

      review += `
        <article class="question">
          <div class="q-head">
            <div class="q-no">${i + 1}</div>
            <div class="q-text">${renderQuestionText(q.q)}</div>
          </div>
          <ul class="option-list">
            ${q.opts
              .map((opt, j) => {
                let cls = "option-label";
                if (j === q.ans) cls += " correct-answer";
                else if (j === selected) cls += " incorrect-answer";
                return `<li><div class=\"${cls}\">${String.fromCharCode(97 + j)}) ${formatMathText(opt)}</div></li>`;
              })
              .join("")}
          </ul>
          ${selected === -1 ? '<p class="muted" style="margin:8px 0 0; color:#b53d3d;">এই প্রশ্নের উত্তর দেওয়া হয়নি।</p>' : ""}
        </article>
      `;
    }

    const isHappy = score > 18;

    setTimeout(function () {
      overlay.classList.add('fade-out');
      setTimeout(function () {
        overlay.remove();

        const resultScreen = document.getElementById("result-screen");
        resultScreen.classList.remove("hidden");
        resultScreen.classList.add("result-animate-in");

        const resultBox = resultScreen.querySelector('.result-box');
        const existing = resultBox.querySelector('.panda-wrap');
        if (existing) existing.remove();

        const pandaWrap = document.createElement('div');
        pandaWrap.className = 'panda-wrap';
        pandaWrap.innerHTML = isHappy
          ? '<span class="panda-emoji happy">&#x1F43C;</span><p class="panda-msg happy-msg">&#x1F389; &#x1F31F; &#x1F43C; &#x0985;&#x09AD;&#x09BF;&#x09A8;&#x09A8;&#x09CD;&#x09A6;&#x09A8;! &#x09A6;&#x09BE;&#x09B0;&#x09C1;&#x09A3; &#x0995;&#x09B0;&#x09C7;&#x099B;! &#x1F38A;</p>'
          : '<span class="panda-emoji sad">&#x1F43C;</span><p class="panda-msg sad-msg">&#x1F614; &#x09B9;&#x09A4;&#x09BE;&#x09B6; &#x09B9;&#x09AF;&#x09BC;&#x09CB; &#x09A8;&#x09BE;, &#x0986;&#x09AC;&#x09BE;&#x09B0; &#x099A;&#x09C7;&#x09B7;&#x09CD;&#x099F;&#x09BE; &#x0995;&#x09B0;&#x09CB;! &#x1F4AA;&#x1F4DA;</p>';
        resultBox.insertBefore(pandaWrap, resultBox.firstChild);

        document.getElementById("result-message").textContent = autoSubmit
          ? "\u09B8\u09AE\u09AF\u09BC \u09B6\u09C7\u09B7\u0964 \u09A8\u09BF\u099A\u09C7 \u09B8\u09A0\u09BF\u0995 \u0989\u09A4\u09CD\u09A4\u09B0\u09B8\u09B9 \u09AB\u09B2\u09BE\u09AB\u09B2 \u09A6\u09C7\u0996\u09C1\u09A8\u0964"
          : "\u09B8\u09BE\u09AC\u09AE\u09BF\u099F \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8\u0964 \u09A8\u09BF\u099A\u09C7 \u09B8\u09A0\u09BF\u0995 \u0989\u09A4\u09CD\u09A4\u09B0\u09B8\u09B9 \u09AB\u09B2\u09BE\u09AB\u09B2 \u09A6\u09C7\u0996\u09C1\u09A8\u0964";

        const reviewBox = document.getElementById("review-container");
        reviewBox.innerHTML = review;
        typesetMath(reviewBox);

        animateScore(score, 600);
        if (isHappy) spawnConfetti();

        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 320);
    }, 950);
  }

  return {
    startQuiz,
    submitQuiz,
    updateProgress
  };
}
