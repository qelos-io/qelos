import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderStyle, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Cross-domain Authentication","description":"","frontmatter":{"title":"Cross-domain Authentication","editLink":true},"headers":[],"relativePath":"mfe/cross-domain-authorization.md","filePath":"mfe/cross-domain-authorization.md","lastUpdated":1769535535000}');
const _sfc_main = { name: "mfe/cross-domain-authorization.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_CopyOrDownloadAsMarkdownButtons = resolveComponent("CopyOrDownloadAsMarkdownButtons");
  _push(`<div${ssrRenderAttrs(_attrs)}><div style="${ssrRenderStyle({ "display": "none" })}" hidden="true" aria-hidden="true">Are you an LLM? You can read better optimized documentation at /mfe/cross-domain-authorization.md for this page in Markdown format</div><h1 id="cross-domain-authentication" tabindex="-1">Cross-domain Authentication <a class="header-anchor" href="#cross-domain-authentication" aria-label="Permalink to “Cross-domain Authentication”">​</a></h1>`);
  _push(ssrRenderComponent(_component_CopyOrDownloadAsMarkdownButtons, null, null, _parent));
  _push(`</div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("mfe/cross-domain-authorization.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const crossDomainAuthorization = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  crossDomainAuthorization as default
};
