import type { IScreenRequirement } from '@qelos/global-types';
import type { EditorComponent } from '../compositions/editor-components';
import { getElementByQlId, parseStructure, qlIdOf, serializeStructure } from './structure-ops';

export type DataSource = 'cruds' | 'blueprints';

export interface BuiltComponent {
  /** tag name of the new block */
  component: string;
  props: Record<string, any>;
  /** data the block needs, by requirement key */
  requirements: Record<string, IScreenRequirement>;
  classes?: string;
  innerHTML: string | null;
}

export type PropValues = Record<string, any>;

/** the starting values of the property form of a component */
export function initialPropValues(descriptor: Pick<EditorComponent, 'requiredProps'>): PropValues {
  return descriptor.requiredProps.reduce<PropValues>((acc, prop) => {
    if (prop.source === 'requirements') acc[prop.prop] = prop.value || '';
    else if (prop.type === 'array') acc[prop.prop] = prop.value || [{}];
    else acc[prop.prop] = prop.value ?? '';
    return acc;
  }, {});
}

/**
 * Turns what was typed in the property form into the attributes, data requirements and content of a new block.
 * `stamp` makes the generated requirement keys unique (and testable).
 */
export function buildComponent(key: string, descriptor: EditorComponent, values: PropValues, source: DataSource, stamp = Date.now().toString().substring(0, 5)): BuiltComponent {
  const requiredProps = descriptor.requiredProps;
  const props: Record<string, any> = {};
  const customData: Record<string, any> = {};

  for (const propName in values) {
    const propData = requiredProps.find((p) => p.prop === propName);
    if (!propData) continue;
    const val = propData.valueBuilder ? propData.valueBuilder(values[propName]) : values[propName];
    if (!val) continue;
    if (typeof val == 'object') {
      const keyName = propName + '_' + stamp;
      customData[keyName] = { key: keyName, fromData: val };
      props['v-bind:' + propName] = keyName;
    } else if (propData.source === 'requirements') {
      props['v-bind:' + propName] = val + '?.result';
    } else {
      props[propData.bind ? 'v-bind:' + propName : propName] = val;
    }
  }

  descriptor.extendProps?.(props);
  descriptor.extendRequirements?.(customData, props);
  const requirements = requiredProps
    .filter((prop) => prop.source === 'requirements' && values[prop.prop])
    .reduce<Record<string, any>>((acc, prop) => {
      acc[values[prop.prop]] = {
        key: values[prop.prop],
        [source === 'blueprints' ? 'fromBlueprint' : 'fromCrud']: { name: values[prop.prop] },
      };
      return acc;
    }, customData);

  return {
    component: descriptor.tag || key,
    props,
    requirements,
    classes: descriptor.classes,
    innerHTML: descriptor.getInnerHTML?.(values, props, requirements) || null,
  };
}

/** Adds requirements to the existing ones; a key that exists keeps its entry and merges its inline data. */
export function mergeRequirements(existing: IScreenRequirement[] | undefined, added: IScreenRequirement[]): IScreenRequirement[] {
  const unique: Record<string, IScreenRequirement> = {};
  [...(existing || []), ...added].forEach((req) => {
    if (!unique[req.key]) {
      unique[req.key] = req;
      return;
    }
    if (unique[req.key].fromData && req.fromData) {
      Object.assign(unique[req.key].fromData as object, req.fromData);
    }
  });
  return Object.values(unique);
}

export interface Anchor {
  beforeQlId?: string;
  afterQlId?: string;
}

export function createBlockElement(built: BuiltComponent): HTMLElement {
  const el = document.createElement(built.component);
  Object.keys(built.props).forEach((name) => {
    try {
      el.setAttribute(name, built.props[name]);
    } catch {
      /* an attribute name the browser refuses is skipped, as before */
    }
  });
  if (built.innerHTML) el.innerHTML = built.innerHTML;
  if (built.classes) el.classList.add(built.classes);
  return el;
}

/** The markup with the new block inserted at the anchor (end of page without one), and the id the block gets. */
export function insertBlock(html: string, built: BuiltComponent, anchor: Anchor = {}): { html: string; qlId?: string } {
  const template = parseStructure(html);
  const el = createBlockElement(built);
  const target = getElementByQlId(template, anchor.beforeQlId || anchor.afterQlId || null);
  if (anchor.beforeQlId && target) target.before(el);
  else if (anchor.afterQlId && target) target.after(el);
  else template.content.appendChild(el);
  return { html: serializeStructure(template), qlId: qlIdOf(template, el) };
}
