import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderStyle, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Styling","description":"","frontmatter":{"title":"Styling"},"headers":[],"relativePath":"web-sdk/styling.md","filePath":"web-sdk/styling.md","lastUpdated":1769535535000}');
const _sfc_main = { name: "web-sdk/styling.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_CopyOrDownloadAsMarkdownButtons = resolveComponent("CopyOrDownloadAsMarkdownButtons");
  _push(`<div${ssrRenderAttrs(_attrs)}><div style="${ssrRenderStyle({ "display": "none" })}" hidden="true" aria-hidden="true">Are you an LLM? You can read better optimized documentation at /web-sdk/styling.md for this page in Markdown format</div><h1 id="styling" tabindex="-1">Styling <a class="header-anchor" href="#styling" aria-label="Permalink to “Styling”">​</a></h1>`);
  _push(ssrRenderComponent(_component_CopyOrDownloadAsMarkdownButtons, null, null, _parent));
  _push(`<p>Documentation coming soon.</p><p>The Web SDK automatically loads shared styles from the host application to ensure your micro-frontend matches the application&#39;s theme.</p><p>Styles are automatically injected into a <code>&lt;style id=&quot;app-style&quot;&gt;</code> element in your document.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("web-sdk/styling.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const styling = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  styling as default
};
