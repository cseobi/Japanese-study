(function () {
  var list = typeof document !== "undefined" ? document.getElementById("set-list") : null;
  var root = typeof document !== "undefined" ? document.getElementById("quiz") : null;
  var state = { set: null, file: "" };

  function storageKey(id) {
    return "jp-quiz:" + id;
  }

  function loadSaved(id) {
    try {
      return JSON.parse(localStorage.getItem(storageKey(id))) || {};
    } catch (e) {
      return {};
    }
  }

  function save(id, data) {
    localStorage.setItem(storageKey(id), JSON.stringify(data));
  }

  function kataToHira(s) {
    return s.replace(/[\u30a1-\u30f6]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0x60);
    });
  }

  function normalize(s, readings) {
    s = String(s || "").normalize("NFKC");
    s = s.replace(/[\s\u3000]/g, "");
    s = s.replace(/[。．.！!？?、，,「」『』""''（）()・]/g, "");
    s = kataToHira(s);
    var pairs = (readings || []).slice().sort(function (a, b) {
      return b[0].length - a[0].length;
    });
    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < pairs.length; i++) {
        s = s.split(pairs[i][0]).join(pairs[i][1]);
      }
    }
    return s;
  }

  function isCorrect(input, answers, readings) {
    var got = normalize(input, readings);
    if (!got) return false;
    return answers.some(function (a) {
      return normalize(a, readings) === got;
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function updateScore() {
    var qs = state.set.questions;
    var data = loadSaved(state.set.id);
    var results = data.results || {};
    var correct = 0;
    qs.forEach(function (q) {
      if (results[q.id] === true) correct += 1;
    });
    var el = document.getElementById("score");
    if (el) el.textContent = "점수 " + correct + " / " + qs.length;
  }

  function render() {
    var set = state.set;
    var data = loadSaved(set.id);
    var answers = data.answers || {};
    var results = data.results || {};
    var html = "";
    html += '<div class="quiz-head"><h2>' + escapeHtml(set.title) + "</h2>";
    html += '<p id="score" class="score"></p>';
    html += '<div class="actions">';
    html += '<button type="button" id="copy">결과 복사</button>';
    html += '<button type="button" id="reset" class="secondary">다시 풀기</button>';
    html += "</div></div>";
    set.questions.forEach(function (q, i) {
      var marked = Object.prototype.hasOwnProperty.call(results, q.id);
      var ok = results[q.id] === true;
      html += '<article class="q" data-id="' + escapeHtml(q.id) + '">';
      html += "<p class=\"inst\"><span>" + (i + 1) + ".</span> " + escapeHtml(q.instruction) + "</p>";
      html += '<p class="prompt">' + (q.promptHtml || escapeHtml(q.prompt)) + "</p>";
      html += '<label class="sr" for="a-' + q.id + '">답</label>';
      html += '<textarea id="a-' + q.id + '" rows="2" autocomplete="off" autocapitalize="off" spellcheck="false">';
      html += escapeHtml(answers[q.id] || "");
      html += "</textarea>";
      html += '<button type="button" class="grade">채점</button>';
      html += '<div class="result' + (marked ? (ok ? " ok" : " bad") : "") + '"' + (marked ? "" : " hidden") + ">";
      if (marked) {
        html += "<p><strong>" + (ok ? "정답" : "오답") + "</strong></p>";
        html += "<p>정답: " + escapeHtml(q.answers[0]) + "</p>";
        html += "<p class=\"explain\">" + escapeHtml(q.explanation) + "</p>";
      }
      html += "</div></article>";
    });
    root.innerHTML = html;
    root.hidden = false;
    updateScore();

    root.querySelectorAll(".q").forEach(function (article) {
      var id = article.getAttribute("data-id");
      var q = set.questions.filter(function (item) { return item.id === id; })[0];
      var input = article.querySelector("textarea");
      var box = article.querySelector(".result");
      input.addEventListener("input", function () {
        var saved = loadSaved(set.id);
        saved.answers = saved.answers || {};
        saved.results = saved.results || {};
        saved.answers[id] = input.value;
        delete saved.results[id];
        save(set.id, saved);
        box.hidden = true;
        box.innerHTML = "";
        box.className = "result";
        updateScore();
      });
      function grade() {
        var saved = loadSaved(set.id);
        saved.answers = saved.answers || {};
        saved.results = saved.results || {};
        saved.answers[id] = input.value;
        var ok = isCorrect(input.value, q.answers, set.readings);
        saved.results[id] = ok;
        save(set.id, saved);
        box.hidden = false;
        box.className = "result " + (ok ? "ok" : "bad");
        box.innerHTML =
          "<p><strong>" + (ok ? "정답" : "오답") + "</strong></p>" +
          "<p>정답: " + escapeHtml(q.answers[0]) + "</p>" +
          "<p class=\"explain\">" + escapeHtml(q.explanation) + "</p>";
        updateScore();
      }
      article.querySelector(".grade").addEventListener("click", grade);
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          grade();
        }
      });
    });

    document.getElementById("reset").addEventListener("click", function () {
      localStorage.removeItem(storageKey(set.id));
      render();
    });
    document.getElementById("copy").addEventListener("click", function () {
      var saved = loadSaved(set.id);
      var text = summary(set, saved);
      var btn = document.getElementById("copy");
      function done() {
        btn.textContent = "복사함";
        setTimeout(function () { btn.textContent = "결과 복사"; }, 1200);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else {
        fallbackCopy(text);
        done();
      }
    });
  }

  function summary(set, saved) {
    var answers = (saved && saved.answers) || {};
    var results = (saved && saved.results) || {};
    var lines = ["세트: " + set.title, ""];
    var correct = 0;
    set.questions.forEach(function (q, i) {
      var value = answers[q.id] || "";
      var status = "미채점";
      if (results[q.id] === true) {
        status = "정답";
        correct += 1;
      } else if (results[q.id] === false) {
        status = "오답";
      }
      lines.push((i + 1) + ". " + q.instruction);
      lines.push("문제: " + q.prompt);
      lines.push("내 답: " + (value.trim() ? value.trim() : "(없음)"));
      lines.push("결과: " + status);
      lines.push("정답: " + q.answers[0]);
      lines.push("");
    });
    lines.push("점수: " + correct + "/" + set.questions.length);
    return lines.join("\n");
  }

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }

  function openSet(file) {
    fetch(file)
      .then(function (res) {
        if (!res.ok) throw new Error("load failed");
        return res.json();
      })
      .then(function (set) {
        state.set = set;
        state.file = file;
        list.querySelectorAll(".set-card").forEach(function (btn) {
          btn.classList.toggle("active", btn.getAttribute("data-file") === file);
        });
        render();
      })
      .catch(function () {
        root.hidden = false;
        root.textContent = "퀴즈를 불러오지 못했습니다.";
      });
  }

  if (list && root) {
    list.addEventListener("click", function (e) {
      var btn = e.target.closest(".set-card");
      if (!btn) return;
      openSet(btn.getAttribute("data-file"));
    });

    var first = list.querySelector(".set-card");
    if (first) openSet(first.getAttribute("data-file"));
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { normalize: normalize, isCorrect: isCorrect };
  }
})();
