import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderStyle, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Pre-Designed Frontends","description":"","frontmatter":{"title":"Pre-Designed Frontends","editLink":true},"headers":[],"relativePath":"plugins/pre-designed-frontends.md","filePath":"plugins/pre-designed-frontends.md","lastUpdated":1769535535000}');
const _sfc_main = { name: "plugins/pre-designed-frontends.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_CopyOrDownloadAsMarkdownButtons = resolveComponent("CopyOrDownloadAsMarkdownButtons");
  _push(`<div${ssrRenderAttrs(_attrs)}><div style="${ssrRenderStyle({ "display": "none" })}" hidden="true" aria-hidden="true">Are you an LLM? You can read better optimized documentation at /plugins/pre-designed-frontends.md for this page in Markdown format</div><h1 id="pre-designed-frontends" tabindex="-1">Pre-Designed Frontends <a class="header-anchor" href="#pre-designed-frontends" aria-label="Permalink to “Pre-Designed Frontends”">​</a></h1>`);
  _push(ssrRenderComponent(_component_CopyOrDownloadAsMarkdownButtons, null, null, _parent));
  _push(`</div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("plugins/pre-designed-frontends.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const preDesignedFrontends = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  preDesignedFrontends as default
};
