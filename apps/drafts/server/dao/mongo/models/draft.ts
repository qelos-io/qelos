import mongoose from 'mongoose';

export interface IDraft {
  user: string;
  tenant: string;
  contextId: string | null;
  contextType: string;
  contextDisplayName?: string;
  contextRouteParams?: any;
  contextData: any;
}

const DraftSchema = new mongoose.Schema<IDraft>({
  user: {
    type: String,
    required: true,
  },
  tenant: {
    type: String,
    required: true,
  },
  contextDisplayName: String,
  contextRouteParams: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  contextType: {
    type: String,
    required: true,
  },
  contextId: {
    type: String,
    required: function () {
      // @ts-ignore
      return this.contextId != null && typeof this.contextId !== 'string';
    },
  },
  contextData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

// @ts-ignore
export default mongoose.model<IDraft>('Draft', DraftSchema);
