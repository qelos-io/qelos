import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderStyle, ssrRenderComponent, ssrRenderAttr } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const _imports_0 = "/plugin/plugin46.png";
const _imports_1 = "/plugin/plugin47.png";
const _imports_2 = "/plugin/plugin48.png";
const _imports_3 = "/plugin/plugin49.png";
const _imports_4 = "/plugin/plugin50.png";
const _imports_5 = "/plugin/plugin51.png";
const _imports_6 = "/plugin/plugin52.png";
const _imports_7 = "/plugin/plugin53.png";
const __pageData = JSON.parse('{"title":"Quick Plugin Page Creator","description":"","frontmatter":{"title":"Quick Plugin Page Creator","editLink":true},"headers":[],"relativePath":"plugins/quick-create-page.md","filePath":"plugins/quick-create-page.md","lastUpdated":1769535535000}');
const _sfc_main = { name: "plugins/quick-create-page.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_CopyOrDownloadAsMarkdownButtons = resolveComponent("CopyOrDownloadAsMarkdownButtons");
  _push(`<div${ssrRenderAttrs(_attrs)}><div style="${ssrRenderStyle({ "display": "none" })}" hidden="true" aria-hidden="true">Are you an LLM? You can read better optimized documentation at /plugins/quick-create-page.md for this page in Markdown format</div><h1 id="quick-plugin-page-creator" tabindex="-1">Quick Plugin Page Creator <a class="header-anchor" href="#quick-plugin-page-creator" aria-label="Permalink to “Quick Plugin Page Creator”">​</a></h1>`);
  _push(ssrRenderComponent(_component_CopyOrDownloadAsMarkdownButtons, null, null, _parent));
  _push(`<p>Follow these steps to create your plugin page quickly and easily.</p><p>To create a plugin page, click <strong>Create New Page</strong>.</p><p><img${ssrRenderAttr("src", _imports_0)} alt="QELOS Plugin46"></p><p>Then, click <strong>Select Plugin List</strong>.</p><p><img${ssrRenderAttr("src", _imports_1)} alt="QELOS Plugin47"></p><p>and choose Add New Plugin.</p><p><img${ssrRenderAttr("src", _imports_2)} alt="QELOS Plugin48"></p><p>In the <strong>Navigation Link Position</strong> section, click <strong>No Link</strong> and select the position where the link to your plugin page will appear.<br> For example, you can choose <strong>Top area of Navbar</strong>.</p><p><img${ssrRenderAttr("src", _imports_3)} alt="QELOS Plugin49"></p><p>In the <strong>Page Name</strong> section, enter a name for your plugin page.</p><p><img${ssrRenderAttr("src", _imports_4)} alt="QELOS Plugin50"></p><p>Click <strong>Confirm</strong> to save your settings and create the page.</p><p><img${ssrRenderAttr("src", _imports_5)} alt="QELOS Plugin51"></p><p>Now, you can see your plugin page if you selected <strong>Top area of Navbar</strong>.</p><p><img${ssrRenderAttr("src", _imports_6)} alt="QELOS Plugin52"></p><p>Additionally, your plugin is available in the <strong>Plugins List</strong> section.</p><p><img${ssrRenderAttr("src", _imports_7)} alt="QELOS Plugin53"></p><p>Click the link below to start using the tools for quick page creation.</p><p><strong><a href="./plugin-page-editor">Plugin Page Editor</a></strong>: Learn how to effectively use the tools for quick page creation.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("plugins/quick-create-page.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const quickCreatePage = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  quickCreatePage as default
};
