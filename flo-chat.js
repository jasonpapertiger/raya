/* ============================================================================
   Flo — Voiceflow chatbot for The School of Raya
   Loaded site-wide from Webflow footer:
     <script src="https://jasonpapertiger.github.io/raya/flo-chat.js" defer></script>
   Injects the custom "Ask Flo" launcher pill, the admissions form extension,
   and the Voiceflow widget. Edit here, git push — no Webflow republish needed.
   ============================================================================ */
(function () {
  var PROJECT_ID = "663ca2254501af0901e553f5";

  function boot() {
    if (document.getElementById("chatFab")) return; // guard against double-injection

    /* ---- 1) Styles for the launcher pill ------------------------------------ */
    var style = document.createElement("style");
    style.textContent = `
    .chat-fab {
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 200;
        display: flex;
        align-items: center;
        gap: 10px;
        background: #1D1D1D;
        border: 1px solid rgba(236,231,228,0.15);
        color: #ECE7E4;
        padding: 13px 22px 13px 16px;
        border-radius: 100px;
        font-family: 'Tenon', 'DM Sans', sans-serif;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        cursor: pointer;
        text-decoration: none;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        opacity: 0;
        pointer-events: none;
        transition: background 0.25s ease, transform 0.2s ease, opacity 0.4s ease;
    }
    .chat-fab.is-visible { opacity: 1; pointer-events: auto; }
    .chat-fab:hover { background: #2e2e2e; transform: translateY(-2px); }
    .chat-fab__dot {
        width: 7px;
        height: 7px;
        background: #DC5E45;
        border-radius: 50%;
        flex-shrink: 0;
        animation: flo-pulse 2.4s ease-in-out infinite;
    }
    @keyframes flo-pulse {
        0%, 100% { opacity: 1;   transform: scale(1); }
        50%      { opacity: 0.5; transform: scale(0.75); }
    }
    .chat-fab.fab--chat-open { opacity: 0 !important; pointer-events: none !important; }
    `;
    document.head.appendChild(style);

    /* ---- 2) Launcher pill markup (replaces Voiceflow's round bubble) --------- */
    var fab = document.createElement("button");
    fab.className = "chat-fab";
    fab.id = "chatFab";
    fab.setAttribute("aria-label", "Chat with Flo");
    fab.innerHTML =
      '<span class="chat-fab__dot"></span>' +
      '<span class="chat-fab__label">Ask Flo</span>';
    document.body.appendChild(fab);

    /* ---- 3) Show the pill once the user scrolls past ~70% of the viewport --- */
    (function () {
      function check() {
        if (window.scrollY > window.innerHeight * 0.7) {
          fab.classList.add("is-visible");
        } else {
          fab.classList.remove("is-visible");
        }
      }
      window.addEventListener("scroll", check, { passive: true });
      check();
    })();

    /* ---- 4) Admissions form extension --------------------------------------- */
    var FormExtension = {
      name: "Forms",
      type: "response",
      match: ({ trace }) =>
        trace.type === "Custom_Form" || trace.payload?.name === "Custom_Form",
      render: ({ trace, element }) => {
        const formContainer = document.createElement("form");

        formContainer.innerHTML = `
          <style>
            form {
              font-family: UCity Pro, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
              max-width: 400px;
              margin: auto;
            }
            label {
              font-size: 0.9em;
              color: #000;
              margin-bottom: 4px;
              display: block;
            }
            input, select {
              width: 100%;
              border: none;
              border-bottom: 1px solid #ccc;
              background: transparent;
              padding: 10px 5px;
              margin-bottom: 20px;
              font-size: 1em;
              transition: border-color 0.3s;
              color: #000;
              font-family: inherit;
            }
            input:focus, select:focus {
              border-bottom: 1px solid #D77957;
              outline: none;
            }
            ::placeholder { color: #9aa0a6; }
            select:required:invalid { color: #9aa0a6; }
            option[value=""] { color: #9aa0a6; }
            option { color: #000; }
            option[disabled][value=""] { display: none; }
            .invalid { border-color: red !important; }
            .submit {
              background: linear-gradient(to right, #786054, #967969);
              border: none;
              color: white;
              padding: 12px;
              border-radius: 5px;
              width: 100%;
              font-size: 1em;
              cursor: pointer;
              transition: background 0.3s;
            }
            .submit:hover {
              background: linear-gradient(to right, #967969, #AB9387);
            }
          </style>

          <label>Student Name</label>
          <input type="text" class="studentName" required
          pattern="[A-Za-z\\s]+" placeholder="Student name">

          <label>Parent / Guardian Name</label>
          <input type="text" class="guardianName" required
          pattern="[A-Za-z\\s]+" placeholder="Parent or guardian">

          <label>Email</label>
          <input type="email" class="email" required
          placeholder="you@example.com">

          <label>Country Code</label>
          <input type="tel"
          class="countryCode"
          placeholder="+91"
          pattern="^\\+[1-9]\\d{0,3}$">

          <label>Phone Number</label>
          <input type="tel"
          class="phone"
          pattern="^\\d{7,15}$"
          placeholder="xxxxxxxxxx">

          <label>Grade Applying For</label>
          <select class="grade" required>
            <option value="" selected disabled>Select grade</option>
            <option>Pre-K (PY1)</option>
            <option>LKG (PY2)</option>
            <option>UKG (PY3)</option>
            <option>Grade 1 (PY4)</option>
            <option>Grade 2 (PY5)</option>
            <option>Grade 3 (PY6)</option>
            <option>Grade 4 (PY7)</option>
            <option>Grade 5 (PY8)</option>
            <option>Grade 6 (MY1)</option>
            <option>Grade 7 (MY2)</option>
            <option>Grade 8 (MY3)</option>
            <option>Grade 9 (MY4)</option>
            <option>Grade 11 (DP1)</option>
          </select>

          <input type="submit" class="submit" value="Submit">
        `;

        formContainer.addEventListener("input", function () {
          const email = formContainer.querySelector(".email");
          const cc = formContainer.querySelector(".countryCode");

          if (email) email.value = email.value.toLowerCase();

          if (cc) {
            let val = cc.value.replace(/\s+/g, "");
            const hasPlus = val.startsWith("+");
            val = val.replace(/\+/g, "");
            if (val.length)
              val = "+" + val.replace(/\D/g, "").slice(0, 4);
            else if (hasPlus)
              val = "+";
            cc.value = val;
          }

          const inputs = formContainer.querySelectorAll("input, select");
          inputs.forEach((input) => {
            if (!input.value.trim() || input.checkValidity()) {
              input.classList.remove("invalid");
            }
          });
        });

        formContainer.addEventListener("submit", function (event) {
          event.preventDefault();

          const studentName = formContainer.querySelector(".studentName");
          const guardianName = formContainer.querySelector(".guardianName");
          const email = formContainer.querySelector(".email");
          const countryCode = formContainer.querySelector(".countryCode");
          const phone = formContainer.querySelector(".phone");
          const grade = formContainer.querySelector(".grade");

          let hasError = false;

          [studentName, guardianName, email, grade].forEach((el) => {
            if (!el.checkValidity()) {
              el.classList.add("invalid");
              hasError = true;
            }
          });

          const phoneProvided = phone && phone.value.trim().length > 0;

          if (phoneProvided) {
            if (!phone.checkValidity()) {
              phone.classList.add("invalid");
              hasError = true;
            }
            if (!countryCode.value.trim() || !countryCode.checkValidity()) {
              countryCode.classList.add("invalid");
              hasError = true;
            }
          }

          if (hasError) return;

          formContainer.querySelector(".submit").remove();

          window.voiceflow.chat.interact({
            type: "complete",
            payload: {
              studentName: studentName.value.trim(),
              guardianName: guardianName.value.trim(),
              email: email.value.trim(),
              countryCode: countryCode.value.trim(),
              phone: phone.value.trim(),
              grade: grade.value
            },
          });
        });

        (element || document.body).appendChild(formContainer);
      },
    };

    /* ---- 5) Voiceflow loader + pill wiring ---------------------------------- */
    (function (d, t) {
      if (d.getElementById("vf-bundle")) return;
      var v = d.createElement(t), s = d.getElementsByTagName(t)[0];
      v.id = "vf-bundle";
      v.type = "text/javascript";
      v.async = true;
      v.onload = function () {
        try {
          window.voiceflow.chat.load({
            verify: { projectID: PROJECT_ID },
            url: "https://general-runtime.voiceflow.com",
            versionID: "production",
            launch: {
              event: {
                type: "launch",
                payload: {
                  browser_url: window.location.href,
                  referrer: document.referrer || ""
                }
              }
            },
            assistant: { extensions: [FormExtension] },
            voice: { url: "https://runtime-api.voiceflow.com" }
          });
        } catch (err) {
          console.error("[Flo] Voiceflow load failed:", err);
        }
      };
      v.onerror = function () { console.error("[Flo] Voiceflow bundle failed to load."); };
      v.src = "https://cdn.voiceflow.com/widget-next/bundle.mjs";
      s.parentNode.insertBefore(v, s);
    })(document, "script");

    function vfReady() {
      return !!(window.voiceflow && window.voiceflow.chat &&
                typeof window.voiceflow.chat.open === "function");
    }
    function vfHost() { return document.getElementById("voiceflow-chat"); }

    /* Hide Voiceflow's own round launcher (keeps the chat window working).
       Re-applied via observer so it survives the widget re-rendering. */
    var styleObserver = null;
    function injectHideStyle(root) {
      if (root.getElementById("flo-hide-launcher")) return;
      var st = document.createElement("style");
      st.id = "flo-hide-launcher";
      st.textContent = ".vfrc-launcher{display:none!important;}";
      root.appendChild(st);
    }
    function ensureLauncherHidden() {
      var host = vfHost();
      if (!host || !host.shadowRoot) return false;
      var root = host.shadowRoot;
      injectHideStyle(root);
      if (!styleObserver && window.MutationObserver) {
        styleObserver = new MutationObserver(function () { injectHideStyle(root); });
        styleObserver.observe(root, { childList: true });
      }
      return true;
    }
    var hideTries = 0;
    var hideTimer = setInterval(function () {
      if (ensureLauncherHidden() || ++hideTries > 200) clearInterval(hideTimer);
    }, 150);

    function chatIsOpen() {
      var host = vfHost();
      if (!host || !host.shadowRoot) return false;
      var nodes = host.shadowRoot.querySelectorAll(
        '.vfrc-widget, .vfrc-chat, [class*="chat--"], [role="dialog"]'
      );
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (el.offsetHeight < 300) continue;
        var cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        if (parseFloat(cs.opacity || '1') < 0.1) continue;
        if (cs.pointerEvents === 'none') continue;
        return true;
      }
      return false;
    }

    /* Open the real chat — waits for the widget if it isn't ready yet */
    function openChat() {
      if (vfReady()) { try { window.voiceflow.chat.open(); } catch (e) {} return; }
      var n = 0, id = setInterval(function () {
        if (vfReady()) {
          clearInterval(id);
          try { window.voiceflow.chat.open(); } catch (e) {}
        } else if (++n > 200) {
          clearInterval(id);
        }
      }, 150);
    }

    /* Wire the pill */
    fab.addEventListener("click", function (e) {
      e.preventDefault();
      openChat();
    });
    /* Hide the pill while the chat window is open; restore on close */
    setInterval(function () {
      fab.classList.toggle("fab--chat-open", chatIsOpen());
    }, 400);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
