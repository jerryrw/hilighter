(() => {
  "use strict";

  const languageRegistry = new Map();
  const options = {
    lineNumbers: false,
    copyButton: false,
  };

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toStickyRegex(pattern) {
    const source = pattern instanceof RegExp ? pattern.source : String(pattern);
    const baseFlags = pattern instanceof RegExp ? pattern.flags.replace(/g/g, "") : "";
    const flags = Array.from(new Set((baseFlags + "y").split(""))).join("");
    return new RegExp(source, flags);
  }

  function compileGrammar(grammar) {
    if (!grammar || !Array.isArray(grammar.tokens)) {
      throw new Error("Grammar must be an object with a tokens array.");
    }
    return {
      tokens: grammar.tokens.map((token) => {
        const rx = token.pattern instanceof RegExp ? token.pattern : token.regex;
        if (!(rx instanceof RegExp)) {
          throw new Error(`Invalid token regex for type "${token.type}"`);
        }
        return {
          type: token.type,
          regex: toStickyRegex(rx),
        };
      }),
    };
  }

  function registerLanguage(name, grammar) {
    try {
      languageRegistry.set(name.toLowerCase(), compileGrammar(grammar));
    } catch (err) {
      console.error(`[SimpleHighlighter] Failed to register language "${name}"`, err);
    }
  }

  function aliasLanguage(alias, target) {
    const grammar = languageRegistry.get(target.toLowerCase());
    if (grammar) languageRegistry.set(alias.toLowerCase(), grammar);
  }

  function normalizeLanguageName(name) {
    const n = (name || "").toLowerCase();
    if (n === "c++" || n === "cxx" || n === "cc") return "cpp";
    return n;
  }

  function detectLanguage(codeEl) {
    for (const cls of codeEl.classList) {
      if (cls.startsWith("language-")) {
        return normalizeLanguageName(cls.slice("language-".length));
      }
    }
    return "";
  }

  function wrapPre(pre) {
    if (pre.parentElement && pre.parentElement.classList.contains("hl-container")) {
      return pre.parentElement;
    }
    const container = document.createElement("div");
    container.className = "hl-container";
    pre.parentNode.insertBefore(container, pre);
    container.appendChild(pre);
    return container;
  }

  function addLineNumbers(pre, container, codeText) {
    if (container.querySelector(":scope > .hl-line-numbers")) return;
    const count = codeText.split(/\r\n|\r|\n/).length;
    const gutter = document.createElement("div");
    gutter.className = "hl-line-numbers";
    gutter.setAttribute("aria-hidden", "true");
    gutter.textContent = Array.from({ length: count }, (_, i) => String(i + 1)).join("\n");
    container.classList.add("has-lines");
    container.insertBefore(gutter, pre);
  }

  function addCopyButton(container, codeEl) {
    if (container.querySelector(":scope > .hl-copy-btn")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hl-copy-btn";
    btn.textContent = "Copy";
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(codeEl.textContent || "");
        btn.textContent = "Copied";
        setTimeout(() => (btn.textContent = "Copy"), 1200);
      } catch {
        btn.textContent = "Failed";
        setTimeout(() => (btn.textContent = "Copy"), 1200);
      }
    });
    container.appendChild(btn);
  }

  function tokenize(code, grammar) {
    const out = [];
    let i = 0;
    let plain = "";

    while (i < code.length) {
      let matched = false;

      for (const rule of grammar.tokens) {
        rule.regex.lastIndex = i;
        const m = rule.regex.exec(code);
        if (m && m.index === i && m[0].length > 0) {
          if (plain) {
            out.push({ type: null, value: plain });
            plain = "";
          }
          out.push({ type: rule.type, value: m[0] });
          i += m[0].length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        plain += code[i];
        i += 1;
      }
    }

    if (plain) out.push({ type: null, value: plain });
    return out;
  }

  function renderTokens(tokens) {
    return tokens
      .map((t) =>
        t.type
          ? `<span class="token ${t.type}">${escapeHtml(t.value)}</span>`
          : escapeHtml(t.value)
      )
      .join("");
  }

  function highlightElement(codeEl) {
    if (codeEl.dataset.hlDone === "1") return;

    const lang = detectLanguage(codeEl);
    const grammar = languageRegistry.get(lang);
    const rawCode = codeEl.textContent || "";
    const pre = codeEl.closest("pre");

    const useLines = !!(options.lineNumbers || (pre && pre.hasAttribute("data-line-numbers")));
    const useCopy = !!(options.copyButton || (pre && pre.hasAttribute("data-copy")));

    if (!grammar) {
      codeEl.innerHTML = escapeHtml(rawCode); // graceful fallback
      codeEl.dataset.hlDone = "1";

      if (pre && (useLines || useCopy)) {
        const container = wrapPre(pre);
        if (useLines) addLineNumbers(pre, container, rawCode);
        if (useCopy) addCopyButton(container, codeEl);
      }
      return;
    }

    codeEl.innerHTML = renderTokens(tokenize(rawCode, grammar));
    codeEl.dataset.hlDone = "1";

    if (pre && (useLines || useCopy)) {
      const container = wrapPre(pre);
      if (useLines) addLineNumbers(pre, container, rawCode);
      if (useCopy) addCopyButton(container, codeEl);
    }
  }

  function highlightAll(root = document) {
    const blocks = root.querySelectorAll("pre > code[class*='language-']");
    blocks.forEach(highlightElement);
  }

  function configure(newOptions = {}) {
    Object.assign(options, newOptions);
  }

  function words(list) {
    return new RegExp(`\\b(?:${list.join("|")})\\b`);
  }

  // --- Language definitions (modular) ---
  // Add new languages by calling:
  // registerLanguage("your-language", { tokens: [ { type: "keyword", pattern: /.../ }, ... ] });

  registerLanguage("javascript", {
    tokens: [
      { type: "comment", pattern: /\/\/[^\n]*|\/\*[\s\S]*?\*\// },
      { type: "string", pattern: /`(?:\\[\s\S]|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
      { type: "number", pattern: /\b(?:0x[\da-fA-F]+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/ },
      { type: "keyword", pattern: words(["break","case","catch","class","const","continue","debugger","default","delete","do","else","export","extends","finally","for","function","if","import","in","instanceof","let","new","return","super","switch","this","throw","try","typeof","var","void","while","with","yield","async","await","null","true","false"]) },
      { type: "function", pattern: /\b[A-Za-z_$][\w$]*(?=\s*\()/ },
      { type: "operator", pattern: /\+\+|--|\*\*|=>|===|!==|==|!=|<=|>=|&&|\|\||<<|>>|>>>|[+\-*/%&|^~!?=<>:]/ },
      { type: "punctuation", pattern: /[{}[\]();.,]/ },
    ],
  });

  registerLanguage("json", {
    tokens: [
      { type: "string", pattern: /"(?:\\.|[^"\\])*"/ },
      { type: "number", pattern: /\b-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?\b/ },
      { type: "keyword", pattern: /\b(?:true|false|null)\b/ },
      { type: "operator", pattern: /:/ },
      { type: "punctuation", pattern: /[{}\[\],]/ },
    ],
  });

  registerLanguage("python", {
    tokens: [
      { type: "comment", pattern: /#[^\n]*/ },
      { type: "string", pattern: /"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
      { type: "number", pattern: /\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/ },
      { type: "keyword", pattern: words(["and","as","assert","async","await","break","class","continue","def","del","elif","else","except","False","finally","for","from","global","if","import","in","is","lambda","None","nonlocal","not","or","pass","raise","return","True","try","while","with","yield"]) },
      { type: "function", pattern: /\b[A-Za-z_]\w*(?=\s*\()/ },
      { type: "operator", pattern: /\*\*|\/\/|==|!=|<=|>=|:=|[+\-*/%=&|^~<>]/ },
      { type: "punctuation", pattern: /[()[\]{},.:;]/ },
    ],
  });

  const cKeywords = [
    "auto","break","case","char","const","continue","default","do","double","else","enum","extern",
    "float","for","goto","if","inline","int","long","register","restrict","return","short","signed",
    "sizeof","static","struct","switch","typedef","union","unsigned","void","volatile","while"
  ];

  const cppKeywords = [
    ...cKeywords,
    "alignas","alignof","bool","catch","class","constexpr","const_cast","delete","dynamic_cast",
    "explicit","export","false","friend","mutable","namespace","new","noexcept","nullptr","operator",
    "private","protected","public","reinterpret_cast","static_assert","static_cast","template","this",
    "throw","true","try","typename","using","virtual","wchar_t"
  ];

  registerLanguage("c", {
    tokens: [
      { type: "comment", pattern: /\/\/[^\n]*|\/\*[\s\S]*?\*\// },
      { type: "string", pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
      { type: "number", pattern: /\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/ },
      { type: "keyword", pattern: words(cKeywords) },
      { type: "function", pattern: /\b[A-Za-z_]\w*(?=\s*\()/ },
      { type: "operator", pattern: /->|\+\+|--|==|!=|<=|>=|&&|\|\||<<|>>|[+\-*/%=&|^~!<>?:]/ },
      { type: "punctuation", pattern: /[()[\]{},.;]/ },
    ],
  });

  registerLanguage("cpp", {
    tokens: [
      { type: "comment", pattern: /\/\/[^\n]*|\/\*[\s\S]*?\*\// },
      { type: "string", pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
      { type: "number", pattern: /\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/ },
      { type: "keyword", pattern: words(cppKeywords) },
      { type: "function", pattern: /\b[A-Za-z_]\w*(?=\s*\()/ },
      { type: "operator", pattern: /::|->|\+\+|--|==|!=|<=|>=|&&|\|\||<<|>>|[+\-*/%=&|^~!<>?:]/ },
      { type: "punctuation", pattern: /[()[\]{},.;]/ },
    ],
  });

  aliasLanguage("c++", "cpp");
  aliasLanguage("cxx", "cpp");
  aliasLanguage("cc", "cpp");

  registerLanguage("bash", {
    tokens: [
      { type: "comment", pattern: /#[^\n]*/ },
      { type: "string", pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/ },
      { type: "number", pattern: /\b\d+\b/ },
      { type: "keyword", pattern: words(["if","then","else","elif","fi","for","while","do","done","case","esac","function","in","select","until","time","coproc"]) },
      { type: "function", pattern: /\b[A-Za-z_][\w-]*(?=\s*\(\s*\))/ },
      { type: "operator", pattern: /\|\||&&|<<|>>|[=|&;<>!+\-/*%]/ },
      { type: "punctuation", pattern: /[()[\]{}.,]/ },
    ],
  });

  registerLanguage("css", {
    tokens: [
      { type: "comment", pattern: /\/\*[\s\S]*?\*\// },
      { type: "string", pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
      { type: "number", pattern: /#(?:[0-9a-fA-F]{3,8})\b|\b\d+(?:\.\d+)?(?:%|px|em|rem|vh|vw|deg|ms|s)?\b/ },
      { type: "keyword", pattern: /@[a-zA-Z-]+|\b(?:display|position|color|background|font|grid|flex|margin|padding|border|width|height|content|transform|transition|animation|var)\b/ },
      { type: "function", pattern: /\b[a-zA-Z_-][\w-]*(?=\s*\()/ },
      { type: "operator", pattern: /[>~+*=|:/-]/ },
      { type: "punctuation", pattern: /[{}[\]();,.]/ },
    ],
  });

  registerLanguage("html", {
    tokens: [
      { type: "comment", pattern: /<!--[\s\S]*?-->/ },
      { type: "string", pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
      { type: "keyword", pattern: /<!DOCTYPE[^>]*>|<\/?[A-Za-z][A-Za-z0-9:-]*/ },
      { type: "function", pattern: /\b[A-Za-z_:][\w:.-]*(?==)/ },
      { type: "operator", pattern: /=/ },
      { type: "punctuation", pattern: /\/?>|[<>]/ },
    ],
  });

  registerLanguage("x86asm", {
    tokens: [
      { type: "comment", pattern: /;[^\n]*/ },
      { type: "string", pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
      { type: "number", pattern: /\b(?:0x[0-9a-fA-F]+|[0-9a-fA-F]+h|0b[01]+|\d+)\b/ },
      {
        type: "keyword",
        pattern: words([
          "mov","lea","push","pop","call","ret","jmp","je","jne","jg","jge","jl","jle","ja","jb",
          "cmp","test","add","sub","imul","idiv","inc","dec","and","or","xor","not","neg","shl",
          "shr","sar","rol","ror","nop","int","syscall","enter","leave","loop",
          "db","dw","dd","dq","dt","resb","resw","resd","resq","section","segment","global","extern"
        ]),
      },
      { type: "function", pattern: /\b[A-Za-z_.$?@][\w.$?@]*(?=\s*:)/ },
      { type: "operator", pattern: /[+\-*/%&|^~<>:=]/ },
      { type: "punctuation", pattern: /[[\](),.:]/ },
    ],
  });
  registerLanguage("x64asm", languageRegistry.get("x86asm")); // alias
  registerLanguage("asm", languageRegistry.get("x86asm"));    // generic alias

  registerLanguage("armasm", {
    tokens: [
      { type: "comment", pattern: /(?:;|@|\/\/)[^\n]*/ },
      { type: "string", pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
      { type: "number", pattern: /#?-?(?:0x[0-9a-fA-F]+|0b[01]+|\d+)\b/ },
      {
        type: "keyword",
        pattern: words([
          "mov","mvn","ldr","str","ldrb","strb","ldrh","strh","add","sub","mul","mla","smull",
          "umull","cmp","cmn","tst","teq","and","orr","eor","bic","lsl","lsr","asr","ror","rrx",
          "b","bl","bx","beq","bne","bgt","blt","bge","ble","svc","nop","push","pop",
          ".text",".data",".bss",".global",".globl",".extern",".align",".word",".byte",".asciz"
        ]),
      },
      { type: "function", pattern: /\b[A-Za-z_.$][\w.$]*(?=\s*:)/ },
      { type: "operator", pattern: /[+\-*/%&|^~<>:=#!]/ },
      { type: "punctuation", pattern: /[[\](),.:{}]/ },
    ],
  });
  registerLanguage("arm", languageRegistry.get("armasm")); // alias

  // Public API
  window.SimpleHighlighter = {
    registerLanguage,
    highlightAll,
    highlightElement,
    configure,
  };

  document.addEventListener("DOMContentLoaded", () => {
    highlightAll();
  });
})();
