<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Workspace architecture
- Keep conversation and outline state in-session; real AI calls use a server function with a server-held provider key, never simulated generation.
- Use AI Elements for messages and the composer to retain accessible, transport-compatible chat primitives.
- Define appearance palettes and layout preferences centrally in the global design system to keep all preview swatches and surfaces consistent.
- Theme previews must render their own scoped palette with prominent accent and surface swatches; the shared header remains a compact translucent toolbar so theme differences are inspectable without changing the chat layout.
- Keep empty-state typography, starter icon tones and viewport-specific spacing in the global design system; keep the existing composer and chat workflow shared between welcome and document states.
- Reuse the decorative workspace loader for asynchronous UI feedback (including the opening splash); decorative motion obeys OS reduced-motion, but the loader stays animated as essential feedback and only the in-app Motion switch stops it, so users always see work is happening.
- Mirror active request feedback beside the pinned composer and trigger welcome motion after hydration so loading stays visible during long documents and entry effects are not missed before the screen is ready.

- Keep the document workflow in one chat surface with sequential preference questions and an editable outline; this prevents separate settings screens and keeps attention on one decision at a time.
- Keep the question sequence and answer validation in a browser-safe shared module so the chat and flow tests use the same transitions.
- Use the custom provider's documented GET JSON contract through a server function rather than AI SDK transport because this API is not an OpenAI-compatible or streaming endpoint; send complete in-session history on every call.
- Reject provider diagnostics inside successful response envelopes and never replace failed outlines with canned content; this keeps recovery tied to real writing requests.
- Generate the full document in one automatic run of small sequential requests (sized by the page plan) with stop/resume, because the writing provider fails on long single replies.
- Export PDFs by compiling generated LaTeX on the server through a public TeX compile service, retrying in a safe mode when compilation fails.
- Own bounded, status-aware writing retries in the browser-safe writing-retry module for every AI entry point; avoid nested retries so visible countdowns match actual attempts.
- Track the next unfinished writing task and pending extra pages in-session; resume without clearing completed text so failures cannot force a full rewrite.
- Email the PDF via Nodemailer SMTP in a server function; SMTP credentials stay in server env vars.
- Normalize generated Markdown through the shared document-order module; group continued sections, keep the bibliography last, and store movable added-page boundaries as Markdown markers so display and PDF exports share one order.
- Start main document sections and added pages on clean LaTeX pages to prevent neighbouring sections from mixing across boundaries.
- Size the fixed workspace with an explicit visualViewport height and offset after hydration, with window resize/focus fallbacks; mixing keyboard height and dvh bottom calculations can displace the header and composer.
- Keep the academic message renderer free of eager Mermaid/graphlib imports; unused diagram dependencies must not block initial workspace loading.
