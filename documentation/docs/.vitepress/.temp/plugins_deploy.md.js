import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderStyle, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Deploy your Plugin","description":"","frontmatter":{"title":"Deploy your Plugin","editLink":true},"headers":[],"relativePath":"plugins/deploy.md","filePath":"plugins/deploy.md","lastUpdated":1769535535000}');
const _sfc_main = { name: "plugins/deploy.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_CopyOrDownloadAsMarkdownButtons = resolveComponent("CopyOrDownloadAsMarkdownButtons");
  _push(`<div${ssrRenderAttrs(_attrs)}><div style="${ssrRenderStyle({ "display": "none" })}" hidden="true" aria-hidden="true">Are you an LLM? You can read better optimized documentation at /plugins/deploy.md for this page in Markdown format</div><h1 id="deploy-your-plugin" tabindex="-1">Deploy your Plugin <a class="header-anchor" href="#deploy-your-plugin" aria-label="Permalink to “Deploy your Plugin”">​</a></h1>`);
  _push(ssrRenderComponent(_component_CopyOrDownloadAsMarkdownButtons, null, null, _parent));
  _push(`</div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("plugins/deploy.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const deploy = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  deploy as default
};
