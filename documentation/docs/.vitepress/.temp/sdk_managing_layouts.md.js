import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderStyle, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Managing Layouts","description":"","frontmatter":{"title":"Managing Layouts"},"headers":[],"relativePath":"sdk/managing_layouts.md","filePath":"sdk/managing_layouts.md","lastUpdated":1773906441000}');
const _sfc_main = { name: "sdk/managing_layouts.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_CopyOrDownloadAsMarkdownButtons = resolveComponent("CopyOrDownloadAsMarkdownButtons");
  _push(`<div${ssrRenderAttrs(_attrs)}><div style="${ssrRenderStyle({ "display": "none" })}" hidden="true" aria-hidden="true">Are you an LLM? You can read better optimized documentation at /sdk/managing_layouts.md for this page in Markdown format</div><h1 id="managing-layouts" tabindex="-1">Managing Layouts <a class="header-anchor" href="#managing-layouts" aria-label="Permalink to “Managing Layouts”">​</a></h1>`);
  _push(ssrRenderComponent(_component_CopyOrDownloadAsMarkdownButtons, null, null, _parent));
  _push(`<p>Application layouts and page structure in Qelos are managed through <strong>blueprints</strong> and the <strong>no-code builder</strong> in the admin console, not through a separate <code>layouts</code> module in the TypeScript SDK.</p><h2 id="where-to-start" tabindex="-1">Where to start <a class="header-anchor" href="#where-to-start" aria-label="Permalink to “Where to start”">​</a></h2><ul><li><strong><a href="/sdk/blueprints_operations">Blueprints operations</a></strong> — programmatic blueprint and entity APIs.</li><li><strong><a href="/sdk/managing_blocks">Managing blocks</a></strong> — reusable content blocks used in pages.</li><li><strong><a href="/sdk/core_functionality">Core functionality</a></strong> — overview of SDK capabilities.</li></ul><p>For visual editing, use the admin <strong>Builder</strong> to compose pages, navigation, and components.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("sdk/managing_layouts.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const managing_layouts = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  managing_layouts as default
};
