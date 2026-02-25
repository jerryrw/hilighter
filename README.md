# Lightweight Syntax Highlighter (Vanilla JS)

A lightweight, modular, dependency-free syntax highlighting system for HTML `<pre><code>` blocks.

- ✅ Pure vanilla JavaScript + CSS
- ✅ Multi-language support
- ✅ Extensible grammar registry (`registerLanguage`)
- ✅ Safe HTML escaping (XSS-aware output)
- ✅ Light + dark themes
- ✅ Optional line numbers
- ✅ Optional copy-to-clipboard button
- ✅ Graceful fallback for unknown languages

---

## Features

- Detects language via class name:

  ```html
  <pre><code class="language-javascript">...</code></pre>
  ```

- Highlights semantic token types:
  - `keyword`
  - `string`
  - `comment`
  - `number`
  - `function`
  - `operator`
  - `punctuation`

- Highlights all supported code blocks on `DOMContentLoaded`.
- Single DOM rewrite per block for performance.

---

## Supported Languages

- HTML
- CSS
- JavaScript
- JSON
- Python
- C
- C++
- Bash
- x86/x64 Assembly
- ARM Assembly

### Language aliases

- `language-c++` → `cpp`
- `language-cxx` / `language-cc` → `cpp`
- `language-x64asm` / `language-asm` → `x86asm`
- `language-arm` → `armasm`

---

## Installation

No package manager required.

1. Copy these files into your project:
   - `highlighter.js`
   - `highlighter.css`
2. Include them in your HTML:

```html
<link rel="stylesheet" href="./highlighter.css" />
<script src="./highlighter.js"></script>
```

---

## Quick Usage

```html
<pre data-line-numbers data-copy>
  <code class="language-javascript">
const greet = (name) => {
  console.log(`Hello, ${name}`);
};
  </code>
</pre>
```

---

## Configuration

Optional global configuration:

```html
<script>
  SimpleHighlighter.configure({
    lineNumbers: true,
    copyButton: true
  });
</script>
```

Per-block toggles are also supported:

- `data-line-numbers`
- `data-copy`

---

## Add a New Language

The core engine is language-agnostic.  
To add a language, register a grammar object only.

```javascript
SimpleHighlighter.registerLanguage("ini", {
  tokens: [
    { type: "comment", pattern: /[;#][^\n]*/ },
    { type: "keyword", pattern: /\[[^\]\n]+\]/ },
    { type: "function", pattern: /^[A-Za-z0-9_.-]+(?=\s*=)/m },
    { type: "operator", pattern: /=/ },
    { type: "string", pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
    { type: "number", pattern: /\b\d+(?:\.\d+)?\b/ },
    { type: "punctuation", pattern: /[[\]]/ }
  ]
});
```

---

## Theming

The default theme is light.

Enable dark mode by adding `.theme-dark` to `<body>`:

```html
<body class="theme-dark">
```
