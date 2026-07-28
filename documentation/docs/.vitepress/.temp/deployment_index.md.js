import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderStyle, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Qelos Deployment Guide","description":"","frontmatter":{},"headers":[],"relativePath":"deployment/index.md","filePath":"deployment/index.md","lastUpdated":1773181411000}');
const _sfc_main = { name: "deployment/index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_CopyOrDownloadAsMarkdownButtons = resolveComponent("CopyOrDownloadAsMarkdownButtons");
  _push(`<div${ssrRenderAttrs(_attrs)}><div style="${ssrRenderStyle({ "display": "none" })}" hidden="true" aria-hidden="true">Are you an LLM? You can read better optimized documentation at /deployment.md for this page in Markdown format</div><h1 id="qelos-deployment-guide" tabindex="-1">Qelos Deployment Guide <a class="header-anchor" href="#qelos-deployment-guide" aria-label="Permalink to “Qelos Deployment Guide”">​</a></h1>`);
  _push(ssrRenderComponent(_component_CopyOrDownloadAsMarkdownButtons, null, null, _parent));
  _push(`<p>This guide explains how to deploy Qelos using Helm charts, covering both local development and production deployments.</p><h2 id="overview" tabindex="-1">Overview <a class="header-anchor" href="#overview" aria-label="Permalink to “Overview”">​</a></h2><p>Qelos uses Helm charts for deployment, providing a flexible and configurable way to deploy the entire platform on Kubernetes clusters. This guide covers:</p><h2 id="getting-started" tabindex="-1">Getting Started <a class="header-anchor" href="#getting-started" aria-label="Permalink to “Getting Started”">​</a></h2><ul><li><a href="./quick-start">Quick Start</a> - Get Qelos running on Kubernetes in ~35 minutes</li><li><a href="./github-fork-setup">GitHub Fork Setup</a> - Fork the repository and set up GitHub Actions</li><li><a href="./kubernetes-cluster-management">Kubernetes Cluster Management</a> - Set up and manage your Kubernetes cluster</li></ul><h2 id="deployment" tabindex="-1">Deployment <a class="header-anchor" href="#deployment" aria-label="Permalink to “Deployment”">​</a></h2><ul><li><a href="./../plugins/api-proxy">API Proxy (Netlify)</a> - Deploy a Qelos frontend on Netlify and proxy <code>/api/*</code> to your Qelos API</li><li><a href="./chart-structure">Chart Structure</a> - Understanding the Helm chart organization</li><li><a href="./configuration">Configuration</a> - Configuring Qelos for your environment</li><li><a href="./deployment-process">Deployment Process</a> - Step-by-step deployment guide</li><li><a href="./production-guide">Production Guide</a> - Production deployment considerations</li><li><a href="./troubleshooting">Troubleshooting</a> - Common issues and solutions</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("deployment/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
