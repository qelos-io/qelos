import * as monaco from 'monaco-editor'

import 'monaco-editor/esm/vs/basic-languages/css/css.contribution'
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution'

import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'
//@ts-ignore
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
//@ts-ignore

import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
//@ts-ignore
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
//@ts-ignore
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
//@ts-ignore
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
// @ts-ignore
self.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker()
    if (label === 'json') return new JsonWorker()
    if (label === 'css') return new CssWorker()
    if (label === 'html') return new HtmlWorker()
    return new EditorWorker()
  }
}

export default monaco;