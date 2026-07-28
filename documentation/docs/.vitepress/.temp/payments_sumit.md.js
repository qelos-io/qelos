import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderStyle, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Sumit Integration","description":"","frontmatter":{"title":"Sumit Integration"},"headers":[],"relativePath":"payments/sumit.md","filePath":"payments/sumit.md","lastUpdated":1766322836000}');
const _sfc_main = { name: "payments/sumit.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_CopyOrDownloadAsMarkdownButtons = resolveComponent("CopyOrDownloadAsMarkdownButtons");
  _push(`<div${ssrRenderAttrs(_attrs)}><div style="${ssrRenderStyle({ "display": "none" })}" hidden="true" aria-hidden="true">Are you an LLM? You can read better optimized documentation at /payments/sumit.md for this page in Markdown format</div><h1 id="sumit-integration" tabindex="-1">Sumit Integration <a class="header-anchor" href="#sumit-integration" aria-label="Permalink to “Sumit Integration”">​</a></h1>`);
  _push(ssrRenderComponent(_component_CopyOrDownloadAsMarkdownButtons, null, null, _parent));
  _push(`<p>This guide will walk you through setting up and using the Sumit integration.</p><h2 id="setup" tabindex="-1">Setup <a class="header-anchor" href="#setup" aria-label="Permalink to “Setup”">​</a></h2><p>To connect your Sumit account, you will need to provide the following information:</p><ul><li><strong>API Key</strong>: You can find your API key in your Sumit account settings.</li></ul><h2 id="usage" tabindex="-1">Usage <a class="header-anchor" href="#usage" aria-label="Permalink to “Usage”">​</a></h2><p>The Sumit integration provides the following operations:</p><ul><li><strong>Create Customer</strong>: Create a new customer in your Sumit account.</li><li><strong>Set Payment Details</strong>: Set the payment details for a customer.</li><li><strong>Payment Methods</strong>: Manage customer payment methods.</li><li><strong>Payments</strong>: Manage payments.</li><li><strong>Recurring Payments</strong>: Manage recurring payments.</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("payments/sumit.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const sumit = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  sumit as default
};
