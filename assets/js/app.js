(() => {
  "use strict";

  const DATA = window.FR1528_DATA;
  const STORAGE_KEY = "fr1528-revision-state-v1";
  const defaultState = {
    completedModules: [],
    practiceAnswers: {},
    workshop: { mandate: {}, draft: "", rubric: [] },
    simulations: {},
    theme: "light",
    express: false
  };

  const loadState = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        ...defaultState,
        ...saved,
        workshop: { ...defaultState.workshop, ...(saved.workshop || {}) },
        simulations: saved.simulations || {}
      };
    } catch (_) {
      return structuredClone(defaultState);
    }
  };

  let state = loadState();
  let activeModule = DATA.modules[0].id;
  let activePracticeCategory = "Tout";
  let activeSimulation = DATA.simulations[0].id;
  let timerInterval = null;
  let timerRemaining = 0;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHTML = (value = "") => String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const saveState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateProgress();
  };

  const toast = message => {
    const element = $("#toast");
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toast.timeout);
    toast.timeout = setTimeout(() => element.classList.remove("show"), 2600);
  };

  function routeTo(route) {
    const allowed = ["accueil", "modules", "atelier", "pratique", "simulations", "ressources"];
    const target = allowed.includes(route) ? route : "accueil";
    $$(".view").forEach(view => view.classList.toggle("active", view.dataset.view === target));
    $$(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.route === target));
    $("#sidebar").classList.remove("open");
    $("#menu-button").setAttribute("aria-expanded", "false");
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.title = `${target === "accueil" ? "Cap sur l’Examen 1" : $("#view-" + target + " h1")?.textContent.trim()} — FR1528`;
  }

  function initRouting() {
    document.addEventListener("click", event => {
      const link = event.target.closest("[data-route]");
      if (!link) return;
      event.preventDefault();
      const route = link.dataset.route;
      history.pushState(null, "", `#${route}`);
      routeTo(route);
    });
    window.addEventListener("popstate", () => routeTo(location.hash.slice(1)));
    routeTo(location.hash.slice(1) || "accueil");
  }

  function updateProgress() {
    const modulePoints = state.completedModules.length;
    const answeredPractice = Object.keys(state.practiceAnswers).length;
    const practicePoints = Math.min(3, Math.floor(answeredPractice / 5));
    const workshopPoints = state.workshop.draft.trim().split(/\s+/).filter(Boolean).length >= 150 ? 1 : 0;
    const simPoints = Object.values(state.simulations).filter(item => item.submitted).length;
    const total = 6 + 3 + 1 + 3;
    const done = modulePoints + practicePoints + workshopPoints + simPoints;
    const percent = Math.round((done / total) * 100);
    $("#progress-label").textContent = `${percent} %`;
    $("#progress-bar").style.width = `${percent}%`;
    $("#progress-detail").textContent = percent === 100
      ? "Parcours terminé — relisez vos erreurs."
      : `${state.completedModules.length}/6 modules · ${answeredPractice}/${DATA.practice.length} exercices · ${simPoints}/3 simulations`;
    renderHomeRoute();
  }

  function renderHomeRoute() {
    const root = $("#home-route-grid");
    if (!root) return;
    root.innerHTML = DATA.modules.map(module => `
      <article class="route-card ${state.completedModules.includes(module.id) ? "done" : ""}">
        <div class="route-card-number"><span>${module.number} · ${module.duration}</span><span class="completion-dot" aria-hidden="true"></span></div>
        <h3>${escapeHTML(module.short)}</h3>
        <p>${escapeHTML(module.description)}</p>
        <button type="button" aria-label="Ouvrir le module ${escapeHTML(module.title)}" data-open-module="${module.id}"></button>
      </article>
    `).join("");
    $$('[data-open-module]', root).forEach(button => button.addEventListener("click", () => {
      activeModule = button.dataset.openModule;
      renderModules();
      history.pushState(null, "", "#modules");
      routeTo("modules");
    }));
  }

  function renderModules() {
    const tabs = $("#module-tabs");
    tabs.innerHTML = DATA.modules.map(module => `
      <button class="module-tab ${module.id === activeModule ? "active" : ""}" type="button" role="tab" aria-selected="${module.id === activeModule}" data-module="${module.id}">
        <strong>${module.number} · ${escapeHTML(module.short)}</strong><span>${module.duration}</span>
      </button>
    `).join("");
    $$('[data-module]', tabs).forEach(button => button.addEventListener("click", () => {
      activeModule = button.dataset.module;
      renderModules();
    }));

    const module = DATA.modules.find(item => item.id === activeModule);
    const done = state.completedModules.includes(module.id);
    $("#module-content").innerHTML = `
      <article class="module-header">
        <div class="module-header-top">
          <div><p class="eyebrow">Module ${module.number}</p><h2>${escapeHTML(module.title)}</h2><p>${escapeHTML(module.description)}</p></div>
          <span class="module-duration">${module.duration}</span>
        </div>
        <div class="module-actions">
          <span class="module-source">Source principale : ${escapeHTML(module.source)}</span>
          <button class="button small ${done ? "ghost" : "primary"}" type="button" data-toggle-module="${module.id}">${done ? "✓ Module terminé" : "Marquer comme terminé"}</button>
        </div>
      </article>
      <div class="concept-stack">
        ${module.concepts.map((concept, index) => `
          <article class="concept-card">
            <h3><span class="concept-index">${String(index + 1).padStart(2, "0")}</span>${escapeHTML(concept.title)}</h3>
            <div class="concept-grid">
              <div class="info-block"><h4>Ce qu’il faut comprendre</h4><p>${escapeHTML(concept.understand)}</p></div>
              <div class="info-block"><h4>Pourquoi cela compte</h4><p>${escapeHTML(concept.why)}</p></div>
              <div class="info-block error"><h4>Erreurs fréquentes</h4><p>${escapeHTML(concept.errors)}</p></div>
              <div class="info-block example"><h4>Exemple concret</h4><p>${escapeHTML(concept.example)}</p></div>
            </div>
            <div class="source-line"><span>Source : ${escapeHTML(concept.source)}</span><a href="${concept.url}" target="_blank" rel="noopener">Voir la ressource ↗</a></div>
          </article>
        `).join("")}
      </div>
    `;
    $("[data-toggle-module]").addEventListener("click", () => {
      if (done) state.completedModules = state.completedModules.filter(id => id !== module.id);
      else state.completedModules = [...new Set([...state.completedModules, module.id])];
      saveState();
      renderModules();
      toast(done ? "Module rouvert." : "Module ajouté à votre progression.");
    });
  }

  function renderWorkshop() {
    const w = DATA.workshop;
    const draft = state.workshop.draft || "";
    const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
    $("#workshop-root").innerHTML = `
      <div class="workshop-grid">
        <section class="panel">
          <p class="eyebrow">Étape 1 · 10 minutes</p><h3>Analyser le mandat</h3>
          <div class="brief-box"><p>${escapeHTML(w.brief)}</p></div>
          <div class="mandate-list">
            ${w.mandate.map(field => `<label><span>${field}</span><input type="text" value="${escapeHTML(state.workshop.mandate[field] || "")}" data-mandate-field="${field}" placeholder="Votre analyse"></label>`).join("")}
          </div>
        </section>
        <section class="panel">
          <div class="editor-meta"><div><p class="eyebrow">Étape 2 · 45 minutes</p><h3>Rédiger la lettre</h3></div><strong id="word-count" class="${words >= w.wordTarget[0] && words <= w.wordTarget[1] ? "good" : ""}">${words} mots</strong></div>
          <textarea class="letter-editor" id="letter-editor" placeholder="Commencez par les coordonnées de l’expéditeur…">${escapeHTML(draft)}</textarea>
          <div class="editor-actions">
            <button class="button small primary" type="button" id="save-letter">Enregistrer</button>
            <button class="button small ghost" type="button" id="print-letter">Imprimer</button>
            <button class="button small ghost" type="button" id="toggle-model">Afficher le modèle</button>
          </div>
        </section>
      </div>
      <div class="workshop-lower">
        <section class="panel"><p class="eyebrow">Étape 3 · 10 minutes</p><h3>Autoévaluation</h3><div class="rubric-list">
          ${w.rubric.map((criterion, index) => `<label class="rubric-item"><input type="checkbox" data-rubric="${index}" ${state.workshop.rubric.includes(index) ? "checked" : ""}><span>${escapeHTML(criterion)}</span></label>`).join("")}
        </div></section>
        <section class="panel hidden" id="model-panel"><p class="eyebrow">Modèle original</p><h3>Une réponse possible</h3><p class="module-source">${escapeHTML(w.source)}</p><div class="model-answer">${escapeHTML(w.model)}</div></section>
      </div>
    `;

    $$('[data-mandate-field]').forEach(input => input.addEventListener("input", () => {
      state.workshop.mandate[input.dataset.mandateField] = input.value;
      saveState();
    }));
    $("#letter-editor").addEventListener("input", event => {
      state.workshop.draft = event.target.value;
      const count = event.target.value.trim() ? event.target.value.trim().split(/\s+/).length : 0;
      $("#word-count").textContent = `${count} mots`;
      $("#word-count").style.color = count >= w.wordTarget[0] && count <= w.wordTarget[1] ? "var(--success)" : "";
    });
    $("#save-letter").addEventListener("click", () => { saveState(); toast("Brouillon enregistré dans ce navigateur."); });
    $("#print-letter").addEventListener("click", () => window.print());
    $("#toggle-model").addEventListener("click", event => {
      $("#model-panel").classList.toggle("hidden");
      event.target.textContent = $("#model-panel").classList.contains("hidden") ? "Afficher le modèle" : "Masquer le modèle";
    });
    $$('[data-rubric]').forEach(input => input.addEventListener("change", () => {
      const index = Number(input.dataset.rubric);
      state.workshop.rubric = input.checked ? [...new Set([...state.workshop.rubric, index])] : state.workshop.rubric.filter(i => i !== index);
      saveState();
    }));
  }

  function renderPractice() {
    const categories = ["Tout", ...new Set(DATA.practice.map(item => item.category))];
    $("#practice-filter").innerHTML = categories.map(category => `<button type="button" class="filter-chip ${category === activePracticeCategory ? "active" : ""}" data-category="${category}">${category}</button>`).join("");
    $$('[data-category]').forEach(button => button.addEventListener("click", () => { activePracticeCategory = button.dataset.category; renderPractice(); }));
    const items = DATA.practice.filter(item => activePracticeCategory === "Tout" || item.category === activePracticeCategory);
    const answered = items.filter(item => state.practiceAnswers[item.id]).length;
    $("#practice-root").innerHTML = `
      <div class="practice-summary"><p>${items.length} exercices · ${answered} répondus · rétroaction immédiate</p><button type="button" class="button small ghost" id="reset-practice">Réinitialiser</button></div>
      <div class="question-list">${items.map(renderPracticeItem).join("")}</div>
    `;
    bindPracticeEvents();
    $("#reset-practice").addEventListener("click", () => {
      items.forEach(item => delete state.practiceAnswers[item.id]);
      saveState(); renderPractice(); toast("Réponses réinitialisées pour ce filtre.");
    });
  }

  function renderPracticeItem(item, index) {
    const saved = state.practiceAnswers[item.id];
    const header = `<div class="question-meta"><span>${item.category} · ${String(index + 1).padStart(2, "0")}</span><span>Source : ${escapeHTML(item.source)}</span></div><h3>${escapeHTML(item.prompt)}</h3>`;
    if (item.type === "qcm") {
      return `<article class="question-card" data-question="${item.id}">${header}<div class="options">${item.options.map((option, i) => `<label class="option ${saved ? (i === item.answer ? "correct" : (saved.value === i ? "incorrect" : "")) : ""}"><input type="radio" name="${item.id}" value="${i}" ${saved?.value === i ? "checked" : ""} ${saved ? "disabled" : ""}><span>${escapeHTML(option)}</span></label>`).join("")}</div><div class="feedback ${saved ? `show ${saved.correct ? "good" : "bad"}` : ""}">${saved ? escapeHTML(item.explanation) : ""}</div></article>`;
    }
    if (item.type === "fill") {
      return `<article class="question-card" data-question="${item.id}">${header}<div class="fill-row"><span>${escapeHTML(item.before)}</span><input type="text" value="${escapeHTML(saved?.value || "")}" ${saved ? "disabled" : ""} aria-label="Réponse à compléter"><span>${escapeHTML(item.after)}</span><button class="button small primary" type="button" data-check-fill ${saved ? "disabled" : ""}>Vérifier</button></div><div class="feedback ${saved ? `show ${saved.correct ? "good" : "bad"}` : ""}">${saved ? escapeHTML(item.explanation) : ""}</div></article>`;
    }
    if (item.type === "correction") {
      return `<article class="question-card" data-question="${item.id}">${header}<textarea class="correction-area" placeholder="Votre reformulation…" ${saved ? "disabled" : ""}>${escapeHTML(saved?.value || "")}</textarea><div class="editor-actions"><button class="button small primary" type="button" data-check-correction ${saved ? "disabled" : ""}>Comparer au modèle</button></div><div class="feedback ${saved ? "show good" : ""}">${saved ? `<strong>Modèle :</strong> ${escapeHTML(item.model)}<br><strong>À vérifier :</strong> ${escapeHTML(item.criteria.join(" · "))}<br>${escapeHTML(item.explanation)}` : ""}</div></article>`;
    }
    const order = saved?.value || item.items.map((_, i) => i);
    return `<article class="question-card" data-question="${item.id}">${header}<ol class="reorder-list">${order.map((itemIndex, position) => `<li class="reorder-item" data-item-index="${itemIndex}"><span>${escapeHTML(item.items[itemIndex])}</span><div><button type="button" data-move="up" data-position="${position}" aria-label="Monter">↑</button><button type="button" data-move="down" data-position="${position}" aria-label="Descendre">↓</button></div></li>`).join("")}</ol><button class="button small primary" type="button" data-check-reorder ${saved ? "disabled" : ""}>Vérifier l’ordre</button><div class="feedback ${saved ? `show ${saved.correct ? "good" : "bad"}` : ""}">${saved ? escapeHTML(item.explanation) : ""}</div></article>`;
  }

  function bindPracticeEvents() {
    $$('[data-question]').forEach(card => {
      const item = DATA.practice.find(entry => entry.id === card.dataset.question);
      if (item.type === "qcm") {
        $$('input[type="radio"]', card).forEach(input => input.addEventListener("change", () => {
          const value = Number(input.value);
          state.practiceAnswers[item.id] = { value, correct: value === item.answer };
          saveState(); renderPractice();
        }));
      } else if (item.type === "fill") {
        $("[data-check-fill]", card)?.addEventListener("click", () => {
          const value = $("input", card).value.trim();
          const normalized = value.toLocaleLowerCase("fr");
          const correct = item.answers.some(answer => answer.toLocaleLowerCase("fr") === normalized);
          state.practiceAnswers[item.id] = { value, correct }; saveState(); renderPractice();
        });
      } else if (item.type === "correction") {
        $("[data-check-correction]", card)?.addEventListener("click", () => {
          const value = $("textarea", card).value.trim();
          if (!value) return toast("Rédigez d’abord une proposition.");
          state.practiceAnswers[item.id] = { value, correct: true }; saveState(); renderPractice();
        });
      } else {
        let currentOrder = [...$$('[data-item-index]', card).map(node => Number(node.dataset.itemIndex))];
        $$('[data-move]', card).forEach(button => button.addEventListener("click", () => {
          const position = Number(button.dataset.position);
          const next = button.dataset.move === "up" ? position - 1 : position + 1;
          if (next < 0 || next >= currentOrder.length) return;
          [currentOrder[position], currentOrder[next]] = [currentOrder[next], currentOrder[position]];
          state.practiceAnswers[item.id] = { value: currentOrder, correct: false, draft: true };
          renderPractice();
        }));
        $("[data-check-reorder]", card)?.addEventListener("click", () => {
          const correct = currentOrder.every((value, i) => value === item.order[i]);
          state.practiceAnswers[item.id] = { value: currentOrder, correct }; saveState(); renderPractice();
        });
      }
    });
  }

  function renderSimulations() {
    const root = $("#simulation-root");
    const simulation = DATA.simulations.find(item => item.id === activeSimulation);
    const saved = state.simulations[simulation.id] || { answers: {}, rewrites: {}, draft: "", submitted: false };
    root.innerHTML = `
      <div class="simulation-picker">${DATA.simulations.map((sim, index) => `<button type="button" class="sim-card ${sim.id === activeSimulation ? "active" : ""}" data-simulation="${sim.id}"><span class="sim-number">SIMULATION ${String(index + 1).padStart(2, "0")}</span><h3>${escapeHTML(sim.title)}</h3><p>${escapeHTML(sim.subtitle)}</p></button>`).join("")}</div>
      <div class="sim-toolbar"><div><strong>${escapeHTML(simulation.title)}</strong><small style="display:block;color:#b8c0d0">${escapeHTML(simulation.focus)}</small></div><div class="timer" id="timer">03:00:00</div><div><button class="button small ghost" type="button" id="timer-toggle">Démarrer</button></div></div>
      <div class="sim-instructions"><h3>Consignes</h3><p>Durée conseillée : 3 heures. Répondez d’abord aux QCM, effectuez les trois réécritures, puis rédigez la lettre. Aucun document n’est requis pour cet entraînement; en situation réelle, seuls un dictionnaire unilingue et votre carte étudiante sont autorisés.</p></div>
      <div class="sim-section-title"><h2>Partie 1 — Grammaire</h2><span>${simulation.questions.length} QCM · correction automatique</span></div>
      <div class="question-list">${simulation.questions.map((question, index) => renderSimQuestion(simulation, question, index, saved)).join("")}</div>
      <div class="sim-section-title"><h2>Partie 2A — Réécriture</h2><span>3 réponses · modèles après soumission</span></div>
      <div class="question-list">${simulation.rewrite.map((prompt, index) => {
        const solution = simulation.rewriteSolutions?.[index];
        return `<article class="question-card"><div class="question-meta"><span>Réécriture ${index + 1}</span><span>Réponse ouverte</span></div><h3>${escapeHTML(prompt)}</h3><textarea class="correction-area" data-sim-rewrite="${index}" ${saved.submitted ? "disabled" : ""}>${escapeHTML(saved.rewrites[index] || "")}</textarea>${saved.submitted && solution ? `<div class="solution-box"><p class="solution-label">Proposition de réponse</p><strong>${escapeHTML(solution.answer)}</strong><p>${escapeHTML(solution.explanation)}</p></div>` : ""}</article>`;
      }).join("")}</div>
      <div class="sim-section-title"><h2>Partie 2B — Lettre administrative</h2><span>250 à 300 mots conseillés</span></div>
      <article class="writing-task"><h3>Mandat</h3><p>${escapeHTML(simulation.task)}</p><textarea class="sim-answer" data-sim-draft placeholder="Rédigez votre lettre complète…" ${saved.submitted ? "disabled" : ""}>${escapeHTML(saved.draft || "")}</textarea><div class="editor-actions"><button class="button primary" type="button" id="submit-simulation" ${saved.submitted ? "disabled" : ""}>Soumettre la simulation</button><button class="button ghost" type="button" id="save-simulation">Enregistrer</button></div></article>
      ${saved.submitted ? renderSimulationResult(simulation, saved) : ""}
    `;
    $$('[data-simulation]').forEach(button => button.addEventListener("click", () => { activeSimulation = button.dataset.simulation; stopTimer(); renderSimulations(); }));
    $$('[data-sim-q]').forEach(input => input.addEventListener("change", () => {
      const index = Number(input.dataset.simQ);
      saved.answers[index] = Number(input.value);
      state.simulations[simulation.id] = saved; saveState();
    }));
    $$('[data-sim-rewrite]').forEach(area => area.addEventListener("input", () => { saved.rewrites[area.dataset.simRewrite] = area.value; state.simulations[simulation.id] = saved; }));
    $("[data-sim-draft]").addEventListener("input", event => { saved.draft = event.target.value; state.simulations[simulation.id] = saved; });
    $("#save-simulation").addEventListener("click", () => { saveState(); toast("Simulation enregistrée dans ce navigateur."); });
    $("#submit-simulation")?.addEventListener("click", () => {
      saved.submitted = true;
      state.simulations[simulation.id] = saved;
      saveState(); stopTimer(); renderSimulations(); toast("Simulation corrigée. Analysez maintenant vos erreurs.");
    });
    $("#timer-toggle").addEventListener("click", toggleTimer);
    timerRemaining = simulation.minutes * 60;
    updateTimerDisplay();
  }

  function renderSimQuestion(simulation, question, index, saved) {
    const [prompt, options, answer] = question;
    const selected = saved.answers[index];
    return `<article class="question-card"><div class="question-meta"><span>QCM ${String(index + 1).padStart(2, "0")}</span><span>1 point</span></div><h3>${escapeHTML(prompt)}</h3><div class="options">${options.map((option, optionIndex) => `<label class="option ${saved.submitted ? (optionIndex === answer ? "correct" : (selected === optionIndex ? "incorrect" : "")) : ""}"><input type="radio" name="${simulation.id}-q${index}" value="${optionIndex}" data-sim-q="${index}" ${selected === optionIndex ? "checked" : ""} ${saved.submitted ? "disabled" : ""}><span>${escapeHTML(option)}</span></label>`).join("")}</div>${saved.submitted ? `<div class="feedback show ${selected === answer ? "good" : "bad"}">${escapeHTML(question[3])}</div>` : ""}</article>`;
  }

  function renderSimulationResult(simulation, saved) {
    const correct = simulation.questions.filter((question, index) => saved.answers[index] === question[2]).length;
    const percent = Math.round((correct / simulation.questions.length) * 100);
    return `<section class="sim-result"><p class="eyebrow">Résultat objectif</p><div class="score-big">${correct}/${simulation.questions.length} · ${percent} %</div><p>La partie rédaction doit être autoévaluée avec la grille ci-dessous. Relisez aussi chaque explication affichée sous les QCM.</p><div class="answer-review"><div><strong>Réécriture :</strong> vérifiez la précision, la règle appliquée et l’absence de données inventées.</div>${simulation.rubric.map(item => `<div>□ ${escapeHTML(item)}</div>`).join("")}</div><div class="editor-actions"><button class="button small ghost" type="button" data-retry-sim>Recommencer cette simulation</button></div></section>`;
  }

  function toggleTimer() {
    const button = $("#timer-toggle");
    if (timerInterval) { stopTimer(); button.textContent = "Reprendre"; return; }
    if (timerRemaining <= 0) timerRemaining = DATA.simulations.find(item => item.id === activeSimulation).minutes * 60;
    timerInterval = setInterval(() => {
      timerRemaining -= 1;
      updateTimerDisplay();
      if (timerRemaining <= 0) { stopTimer(); toast("Temps écoulé. Terminez la phrase en cours, puis soumettez."); }
    }, 1000);
    button.textContent = "Pause";
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  function updateTimerDisplay() {
    const element = $("#timer");
    if (!element) return;
    const hours = Math.floor(timerRemaining / 3600);
    const minutes = Math.floor((timerRemaining % 3600) / 60);
    const seconds = timerRemaining % 60;
    element.textContent = [hours, minutes, seconds].map(value => String(value).padStart(2, "0")).join(":");
    element.classList.toggle("warning", timerRemaining <= 15 * 60);
  }

  function renderReferences() {
    const groups = [...new Set(DATA.references.map(item => item.group))];
    $("#references-root").innerHTML = groups.map(group => `
      <section class="reference-group"><h2>${escapeHTML(group)}</h2><div class="reference-list">${DATA.references.filter(item => item.group === group).map(item => `
        <article class="reference-item"><div><h3>${escapeHTML(item.title)}${item.mandatory ? '<span class="resource-flag">À lire</span>' : ""}${item.unreadable ? '<span class="resource-flag">Texte non extractible</span>' : ""}</h3><p>${escapeHTML(item.role)}${item.unreadable ? " — le contenu précis n’a pas été repris dans le site." : ""}</p></div><a href="${item.url}" target="_blank" rel="noopener">Ouvrir dans Drive ↗</a></article>
      `).join("")}</div></section>
    `).join("");
  }

  function initGlobalControls() {
    $("#menu-button").addEventListener("click", event => {
      const open = $("#sidebar").classList.toggle("open");
      event.currentTarget.setAttribute("aria-expanded", String(open));
    });
    $("#theme-toggle").addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      document.body.classList.toggle("dark", state.theme === "dark");
      $("#theme-toggle").setAttribute("aria-label", state.theme === "dark" ? "Activer le thème clair" : "Activer le thème sombre");
      saveState();
    });
    document.body.classList.toggle("dark", state.theme === "dark");
    $("[data-start-express]").addEventListener("click", () => {
      state.express = true; saveState();
      toast("Priorité enregistrée : commencez par les modules 01, 03, 04 et 06.");
      activeModule = "format"; renderModules(); history.pushState(null, "", "#modules"); routeTo("modules");
    });
    document.addEventListener("click", event => {
      if (event.target.matches("[data-retry-sim]")) {
        delete state.simulations[activeSimulation]; saveState(); renderSimulations(); toast("Simulation réinitialisée.");
      }
    });
  }

  function init() {
    renderHomeRoute();
    renderModules();
    renderWorkshop();
    renderPractice();
    renderSimulations();
    renderReferences();
    initGlobalControls();
    initRouting();
    updateProgress();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

