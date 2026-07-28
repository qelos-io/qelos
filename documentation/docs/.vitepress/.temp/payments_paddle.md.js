import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderStyle, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Paddle Integration","description":"","frontmatter":{"title":"Paddle Integration"},"headers":[],"relativePath":"payments/paddle.md","filePath":"payments/paddle.md","lastUpdated":1773058867000}');
const _sfc_main = { name: "payments/paddle.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_CopyOrDownloadAsMarkdownButtons = resolveComponent("CopyOrDownloadAsMarkdownButtons");
  _push(`<div${ssrRenderAttrs(_attrs)}><div style="${ssrRenderStyle({ "display": "none" })}" hidden="true" aria-hidden="true">Are you an LLM? You can read better optimized documentation at /payments/paddle.md for this page in Markdown format</div><h1 id="paddle-integration" tabindex="-1">Paddle Integration <a class="header-anchor" href="#paddle-integration" aria-label="Permalink to “Paddle Integration”">​</a></h1>`);
  _push(ssrRenderComponent(_component_CopyOrDownloadAsMarkdownButtons, null, null, _parent));
  _push(`<p>This guide will walk you through setting up and using the Paddle integration.</p><h2 id="setup" tabindex="-1">Setup <a class="header-anchor" href="#setup" aria-label="Permalink to “Setup”">​</a></h2><p>To connect your Paddle account, you will need to provide the following information:</p><ul><li><strong>API Key</strong>: You can find your API key in the Paddle dashboard under <strong>Developer Tools</strong> &gt; <strong>Authentication</strong>.</li><li><strong>Environment</strong>: Choose between <code>sandbox</code> (for testing) and <code>live</code> (for production).</li></ul><h2 id="usage" tabindex="-1">Usage <a class="header-anchor" href="#usage" aria-label="Permalink to “Usage”">​</a></h2><p>The Paddle integration provides the following operations:</p><ul><li><strong>Create Product</strong>: Create a new product in your Paddle catalog.</li><li><strong>List Products</strong>: List all products in your Paddle catalog.</li><li><strong>Create Price</strong>: Create a new price for a product.</li><li><strong>List Prices</strong>: List all prices.</li><li><strong>Create Subscription</strong>: Create a new subscription.</li><li><strong>Get Subscription</strong>: Retrieve details of a specific subscription.</li><li><strong>List Subscriptions</strong>: List all subscriptions.</li><li><strong>Cancel Subscription</strong>: Cancel an existing subscription.</li><li><strong>List Transactions</strong>: List all transactions.</li><li><strong>Get Transaction</strong>: Retrieve details of a specific transaction.</li><li><strong>Create Customer</strong>: Create a new customer.</li><li><strong>List Customers</strong>: List all customers.</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("payments/paddle.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const paddle = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  paddle as default
};
