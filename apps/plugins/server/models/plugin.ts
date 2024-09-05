import mongoose, { Document, Model } from 'mongoose'
import uniqid from 'uniqid';
import { cacheManager } from '../services/cache-manager';
import { IMicroFrontend, IPlugin as IPluginType } from '@qelos/global-types';

export interface IPlugin extends Document, IPluginType {
  encodePath();
}

interface PluginModel extends Model<IPlugin> {
  getPluginForRedirect(tenant: string, _id: string): Promise<IPluginType>
}

const MicroFrontendSchema = new mongoose.Schema<IMicroFrontend>({
  name: {
    type: String,
    required: true
  },
  description: String,
  manifestUrl: String,
  crud: String,
  use: String,
  structure: String,
  searchQuery: Boolean,
  searchPlaceholder: String,
  navigateAfterSubmit: {
    name: String,
    params: mongoose.Schema.Types.Mixed,
    query: mongoose.Schema.Types.Mixed,
  },
  requirements: [{
    key: {
      type: String,
      required: true
    },
    fromHTTP: {
      uri: String,
      method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'DELETE']
      },
      query: mongoose.Schema.Types.Mixed,
    },
    fromCrud: {
      name: String,
      identifier: String,
      query: mongoose.Schema.Types.Mixed,
    },
    fromBlueprint: {
      name: String,
      identifier: String,
      query: mongoose.Schema.Types.Mixed,
    },
    fromData: mongoose.Schema.Types.Mixed
  }],
  active: {
    type: Boolean,
    default: true,
  },
  opened: {
    type: Boolean,
    default: true,
  },
  url: {
    type: String,
  },
  roles: [String],
  workspaceRoles: [String],
  route: {
    name: String,
    path: String,
    navBarPosition: {
      type: mongoose.Schema.Types.Mixed,
      validate(position = false) {
        return ['top', 'bottom', 'user-dropdown', false].includes(position)
      },
    },
    group: String,
  },
  component: {
    page: String,
    position: {
      type: String,
      enum: ['top', 'left', 'right', 'bottom']
    }
  },
  modal: {
    name: String,
    params: {
      type: [String],
      required: false,
    },
    size: {
      type: String,
      enum: ['sm', 'md', 'lg', 'full']
    }
  },
})

const PluginSchema = new mongoose.Schema<IPlugin>({
  tenant: {
    type: String,
    index: true,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  manifestUrl: String,
  callbackUrl: String,
  registerUrl: String,
  apiPath: {
    type: String,
    required: true,
  },
  user: {
    type: String,
  },
  authAcquire: {
    refreshTokenUrl: {
      type: String,
    },
    refreshTokenKey: {
      type: String,
      required: true,
      default: 'refresh_token'
    },
    accessTokenKey: {
      type: String,
      required: true,
      default: 'access_token'
    }
  },
  auth: {
    refreshTokenIdentifier: String,
  },
  token: String,
  proxyUrl: {
    type: String,
    // required: true
  },
  subscribedEvents: [{
    source: String,
    kind: String,
    eventName: String,
    hookUrl: {
      type: String,
      required: true
    }
  }],
  microFrontends: [MicroFrontendSchema],
  injectables: [{
    name: String,
    description: String,
    html: String,
    active: Boolean
  }],
  navBarGroups: [{
    key: { type: String, required: true },
    name: { type: String, required: true },
    iconName: String,
    iconSvg: String,
    priority: Number
  }],
  cruds: [{
    name: { type: String, required: true },
    display: {
      name: String,
      plural: String,
      capitalized: String,
      capitalizedPlural: String,
    },
    identifierKey: String,
    schema: mongoose.SchemaTypes.Mixed,
  }]
});

PluginSchema.index({ tenant: 1, apiPath: 1 }, { unique: true });

PluginSchema.methods.encodePath = function encodePath() {

  // make sure name doesn't have any sort of slashes.
  if (this.apiPath.includes('/') || this.apiPath.includes('\\')) {
    this.apiPath = this.apiPath.replace(/[\/\\]/g, ':');
  }
};

PluginSchema.statics.getPluginForRedirect = function getPluginForRedirect(tenant: string, _id: string) {
  return cacheManager.wrap(`plugins:redirect:${tenant}:${_id}`, () => Plugin.findOne({ tenant, _id })
    .select('tenant user callbackUrl registerUrl apiPath authAcquire')
    .lean()
    .exec()
    .then(JSON.stringify)
  ).then(JSON.parse);
}

PluginSchema.pre('validate', function () {
  if (!this.apiPath) {
    this.apiPath = uniqid()
  }
})

PluginSchema.pre('save', function () {
  this.encodePath();
})

const Plugin = mongoose.model<IPlugin, PluginModel>('Plugin', PluginSchema);

export default Plugin;
