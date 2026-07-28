import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderStyle, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Connections Command","description":"","frontmatter":{"title":"Connections Command","editLink":true},"headers":[],"relativePath":"cli/connections.md","filePath":"cli/connections.md","lastUpdated":1784792042000}');
const _sfc_main = { name: "cli/connections.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_CopyOrDownloadAsMarkdownButtons = resolveComponent("CopyOrDownloadAsMarkdownButtons");
  _push(`<div${ssrRenderAttrs(_attrs)}><div style="${ssrRenderStyle({ "display": "none" })}" hidden="true" aria-hidden="true">Are you an LLM? You can read better optimized documentation at /cli/connections.md for this page in Markdown format</div><h1 id="connections-command" tabindex="-1">Connections Command <a class="header-anchor" href="#connections-command" aria-label="Permalink to “Connections Command”">​</a></h1>`);
  _push(ssrRenderComponent(_component_CopyOrDownloadAsMarkdownButtons, null, null, _parent));
  _push(`<p>The <code>qelos connections</code> command inspects the integration source connections (Sumit, PayPal, OpenAI, Email, AWS, Cloudflare, HTTP, …) configured for your tenant, directly from the terminal.</p><h2 id="qelos-connections-status" tabindex="-1"><code>qelos connections status</code> <a class="header-anchor" href="#qelos-connections-status" aria-label="Permalink to “qelos connections status”">​</a></h2><p>Prints a table of every connection with its ID, name, kind, and live connection status.</p><div class="language-bash"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark" style="${ssrRenderStyle({ "--shiki-light": "#24292e", "--shiki-dark": "#e1e4e8", "--shiki-light-bg": "#fff", "--shiki-dark-bg": "#24292e" })}" tabindex="0" dir="ltr"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#6F42C1", "--shiki-dark": "#B392F0" })}">qelos</span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}"> connections</span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}"> status</span></span></code></pre></div><p>Example output:</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark" style="${ssrRenderStyle({ "--shiki-light": "#24292e", "--shiki-dark": "#e1e4e8", "--shiki-light-bg": "#fff", "--shiki-dark-bg": "#24292e" })}" tabindex="0" dir="ltr"><code><span class="line"><span>Connections status</span></span>
<span class="line"><span></span></span>
<span class="line"><span>ID                        NAME              KIND      STATUS</span></span>
<span class="line"><span>------------------------  ----------------  --------  -----------</span></span>
<span class="line"><span>64f1c2b8e4b0a1a2b3c4d5e6  Production Sumit  sumit     connected</span></span>
<span class="line"><span>64f1c2b8e4b0a1a2b3c4d5e7  Support Inbox     email     connected</span></span>
<span class="line"><span>64f1c2b8e4b0a1a2b3c4d5e8  Legacy PayPal     paypal    failed</span></span>
<span class="line"><span>64f1c2b8e4b0a1a2b3c4d5e9  GitHub OAuth      github    unsupported</span></span>
<span class="line"><span></span></span>
<span class="line"><span>3/4 connected</span></span></code></pre></div><p>Status is computed the same way as <strong>Test connection</strong> / <strong>Check connection</strong> in the admin panel — it uses each connection&#39;s already-saved credentials to make a real (side-effect-free) call to the provider. See <a href="/integrations/status-check">Connection Status Checks</a> for exactly what&#39;s checked per kind, and which kinds return <code>unsupported</code>.</p><p>A connection that fails to check (e.g. missing credentials) is shown with an <code>error: &lt;message&gt;</code> status instead of aborting the whole table.</p><h2 id="authentication" tabindex="-1">Authentication <a class="header-anchor" href="#authentication" aria-label="Permalink to “Authentication”">​</a></h2><p>Like every other command, <code>qelos connections status</code> authenticates using your stored credentials, <code>QELOS_API_TOKEN</code>/<code>QELOS_USERNAME</code>+<code>QELOS_PASSWORD</code> environment variables, or a <code>--global</code> environment. See the <a href="/cli/">CLI Introduction</a> for the full authentication precedence.</p><h2 id="related" tabindex="-1">Related <a class="header-anchor" href="#related" aria-label="Permalink to “Related”">​</a></h2><ul><li><a href="/integrations/status-check">Connection Status Checks</a> — what each provider kind checks, and the underlying API/SDK methods</li><li><a href="/cli/global">Global Environments</a> — run this command against a registered project from any directory</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("cli/connections.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const connections = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  connections as default
};
