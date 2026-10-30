/* 閱讀小將：本程式只在本機瀏覽器組合答案，不傳送學生代號。 */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const booksByClass = Object.freeze({ "815": ["3803", "8729"], "816": ["5801", "5403"] });
  const stageOrder = Object.freeze({ STAR: ["S", "T", "A", "R"], ORID: ["O", "R", "I", "D"] });
  const reflectionOpeners = ["我覺得，", "特別是，", "像是，", "讀著故事，", "在我看來，", "說真的，", "對我來說，"];
  const state = { id: null, classNo: null, seat: null, bookCode: null, stageIndex: 0, revealed: false };
  const data = window.READING_DATA || {};
  const openers = window.READING_OPENERS || {};
  const countChinese = str => [...str.replace(/[\s，。！？、；：,.!?;:「」『』（）()－—…．·]/g, "")].length;
  const visible = (name) => {
    ["entry", "bookPanel", "answerPanel"].forEach(id => { $(id).hidden = id !== name; });
  };
  const setText = (id, text) => { $(id).textContent = text; };

  function compose(bookCode, stageKey, seat) {
    const book = data[bookCode];
    const stage = book.stages[stageKey];
    const idx = seat - 1;
    const depth = (seat + Number(bookCode) + stageOrder[book.method].indexOf(stageKey)) % 3;
    const starters = stageKey === "R" && book.method === "ORID" ? reflectionOpeners : openers[stageKey];
    const starter = starters[Math.floor(idx / 16) % starters.length];
    const answer = starter + stage.cores[depth] + stage.focus[idx % 4] + stage.tails[Math.floor(idx / 4) % 4];
    const length = countChinese(answer);
    if (length < 30 || length > 50) {
      throw new Error("答案長度驗證失敗：" + bookCode + "/" + stageKey + "，" + length + " 字");
    }
    return { answer, length };
  }

  function showBooks() {
    visible("bookPanel");
    const list = $("books");
    list.replaceChildren();
    const id = state.id;
    setText("studentBadge", id.slice(0, 3) + " 班 · " + id.slice(3) + " 號");
    booksByClass[state.classNo].forEach(code => {
      const b = data[code];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "book";
      const badge = document.createElement("span");
      badge.className = "book-code"; badge.textContent = "書籍編號 " + code;
      const title = document.createElement("strong");
      title.textContent = b.title;
      const small = document.createElement("small");
      small.textContent = b.method + " 學習單 · " + b.author;
      button.append(badge, title, small);
      button.addEventListener("click", () => { state.bookCode = code; state.stageIndex = 0; state.revealed = false; renderStage(); });
      list.append(button);
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function renderStage() {
    const b = data[state.bookCode];
    if (!b) return;
    visible("answerPanel");
    const stages = stageOrder[b.method];
    const key = stages[state.stageIndex];
    const stage = b.stages[key];
    state.revealed = false;
    setText("answerTitle", b.title);
    setText("answerStudent", state.classNo + " 班 · " + String(state.seat).padStart(2, "0") + " 號");
    setText("answerBookCode", "書籍 " + state.bookCode);
    setText("methodTag", b.method + " 原則");
    setText("questionNumber", "第 " + (state.stageIndex + 1) + "／" + stages.length + " 題");
    setText("stageTitle", stage.title);
    setText("questionText", stage.question);
    $("progressBar").style.width = ((state.stageIndex + 1) * 100 / stages.length) + "%";
    $("covered").hidden = false;
    $("uncovered").hidden = true;
    $("copyAnswer").hidden = true;
    $("previous").disabled = state.stageIndex === 0;
    setText("next", state.stageIndex === stages.length - 1 ? "完成並返回選書" : "下一題");
    setText("countInfo", "每題回答均為 30–50 字；顯示後可查看字數。");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function reveal() {
    try {
      const b = data[state.bookCode];
      const key = stageOrder[b.method][state.stageIndex];
      const { answer, length } = compose(state.bookCode, key, state.seat);
      setText("answerText", answer);
      setText("countInfo", "本題 " + length + " 字（不含標點與空白）");
      $("covered").hidden = true;
      $("uncovered").hidden = false;
      $("copyAnswer").hidden = false;
      state.revealed = true;
    } catch (err) {
      setText("countInfo", "暫時無法顯示這題，請聯絡管理者檢查資料。");
      console.error(err);
    }
  }

  async function copyCurrent() {
    if (!state.revealed) return;
    const text = $("answerText").textContent;
    const button = $("copyAnswer");
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement("textarea");
        el.value = text; el.style.position = "fixed"; el.style.left = "-9999px";
        document.body.append(el); el.focus(); el.select();
        const ok = document.execCommand("copy"); el.remove();
        if (!ok) throw new Error("複製功能不可用");
      }
      button.textContent = "已複製";
    } catch {
      button.textContent = "複製失敗，請長按文字";
    }
    window.setTimeout(() => { button.textContent = "複製本題回答"; }, 1900);
  }

  $("studentForm").addEventListener("submit", event => {
    event.preventDefault();
    const id = $("studentId").value.trim();
    $("idError").textContent = "";
    if (!/^(815|816)(0[1-9]|[1-9][0-9])$/.test(id)) {
      $("idError").textContent = "請輸入有效的五位數：815 或 816 班，座號 01–99（例如 81501）。";
      $("studentId").focus(); return;
    }
    state.id = id;
    state.classNo = id.slice(0, 3);
    state.seat = Number(id.slice(3));
    showBooks();
  });

  $("showAnswer").addEventListener("click", reveal);
  $("copyAnswer").addEventListener("click", copyCurrent);
  $("next").addEventListener("click", () => {
    const b = data[state.bookCode];
    if (state.stageIndex >= stageOrder[b.method].length - 1) {
      showBooks();
    } else {
      state.stageIndex++; renderStage();
    }
  });
  $("previous").addEventListener("click", () => {
    if (state.stageIndex > 0) { state.stageIndex--; renderStage(); }
  });
  $("changeBook").addEventListener("click", showBooks);
  function reset() {
    Object.assign(state, { id: null, classNo: null, seat: null, bookCode: null, stageIndex: 0, revealed: false });
    $("studentForm").reset(); setText("idError", "");
    visible("entry"); $("studentId").focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  $("restart").addEventListener("click", reset);
  $("changeStudent").addEventListener("click", reset);
  if (!Object.keys(data).length) {
    setText("idError", "書籍資料尚未載入，請重新整理頁面。");
    $("studentId").disabled = true;
  }
})();