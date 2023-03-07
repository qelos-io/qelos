export interface ILayoutContent {
  component: string;
  predefined: boolean;
  stick?: boolean; // can't be removed or dragged
  classes: string;
  supportChildren?: boolean;
  props: {
    [key: string]: any;
  };
  children?: ILayoutContent[];
}

export interface ILayout {
  connectedData: {
    kind: string;
    identifier: string;
    reference: string;
    context?: any;
  }[];
  content: ILayoutContent[];
  [key: string]: any;
}
