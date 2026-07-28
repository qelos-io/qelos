import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderStyle, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Helm Chart Structure","description":"","frontmatter":{},"headers":[],"relativePath":"deployment/chart-structure.md","filePath":"deployment/chart-structure.md","lastUpdated":1743003852000}');
const _sfc_main = { name: "deployment/chart-structure.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_CopyOrDownloadAsMarkdownButtons = resolveComponent("CopyOrDownloadAsMarkdownButtons");
  _push(`<div${ssrRenderAttrs(_attrs)}><div style="${ssrRenderStyle({ "display": "none" })}" hidden="true" aria-hidden="true">Are you an LLM? You can read better optimized documentation at /deployment/chart-structure.md for this page in Markdown format</div><h1 id="helm-chart-structure" tabindex="-1">Helm Chart Structure <a class="header-anchor" href="#helm-chart-structure" aria-label="Permalink to “Helm Chart Structure”">​</a></h1>`);
  _push(ssrRenderComponent(_component_CopyOrDownloadAsMarkdownButtons, null, null, _parent));
  _push(`<h2 id="directory-organization" tabindex="-1">Directory Organization <a class="header-anchor" href="#directory-organization" aria-label="Permalink to “Directory Organization”">​</a></h2><p>The Qelos Helm chart is organized as follows:</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark" style="${ssrRenderStyle({ "--shiki-light": "#24292e", "--shiki-dark": "#e1e4e8", "--shiki-light-bg": "#fff", "--shiki-dark-bg": "#24292e" })}" tabindex="0" dir="ltr"><code><span class="line"><span>helm/qelos/</span></span>
<span class="line"><span>├── Chart.yaml</span></span>
<span class="line"><span>├── values.yaml         # Default configuration values</span></span>
<span class="line"><span>├── values-env.yaml    # Environment-specific values</span></span>
<span class="line"><span>└── templates/</span></span>
<span class="line"><span>    ├── microservices.yaml</span></span>
<span class="line"><span>    └── _microservice.tpl</span></span></code></pre></div><h2 id="key-components" tabindex="-1">Key Components <a class="header-anchor" href="#key-components" aria-label="Permalink to “Key Components”">​</a></h2><h3 id="chart-yaml" tabindex="-1">Chart.yaml <a class="header-anchor" href="#chart-yaml" aria-label="Permalink to “Chart.yaml”">​</a></h3><p>Defines the chart metadata, version, and dependencies.</p><h3 id="values-yaml" tabindex="-1">values.yaml <a class="header-anchor" href="#values-yaml" aria-label="Permalink to “values.yaml”">​</a></h3><p>Contains the default configuration values for all components of Qelos.</p><h3 id="values-env-yaml" tabindex="-1">values-env.yaml <a class="header-anchor" href="#values-env-yaml" aria-label="Permalink to “values-env.yaml”">​</a></h3><p>Environment-specific configuration values, generated from your <code>.env</code> file.</p><h3 id="templates" tabindex="-1">Templates <a class="header-anchor" href="#templates" aria-label="Permalink to “Templates”">​</a></h3><ul><li><code>microservices.yaml</code>: Main template for deploying Qelos microservices</li><li><code>_microservice.tpl</code>: Helper template for microservice configuration</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("deployment/chart-structure.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const chartStructure = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  chartStructure as default
};
