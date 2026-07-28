import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderStyle, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Examples","description":"","frontmatter":{"title":"Examples"},"headers":[],"relativePath":"web-sdk/examples.md","filePath":"web-sdk/examples.md","lastUpdated":1769535535000}');
const _sfc_main = { name: "web-sdk/examples.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_CopyOrDownloadAsMarkdownButtons = resolveComponent("CopyOrDownloadAsMarkdownButtons");
  _push(`<div${ssrRenderAttrs(_attrs)}><div style="${ssrRenderStyle({ "display": "none" })}" hidden="true" aria-hidden="true">Are you an LLM? You can read better optimized documentation at /web-sdk/examples.md for this page in Markdown format</div><h1 id="examples" tabindex="-1">Examples <a class="header-anchor" href="#examples" aria-label="Permalink to “Examples”">​</a></h1>`);
  _push(ssrRenderComponent(_component_CopyOrDownloadAsMarkdownButtons, null, null, _parent));
  _push(`<p>Documentation coming soon.</p><p>Practical examples and use cases for the Web SDK.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("web-sdk/examples.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const examples = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  examples as default
};
