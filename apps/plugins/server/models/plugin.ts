import mongoose, {Document} from 'mongoose'

export interface IPlugin extends Document {
  encodePath();

  tenant: string;
  name: string;
  description?: string;
  apiPath: string;
  user: string;
  token: string;
  proxyUrl: string;
  authAcquire: {
    refreshTokenUrl: string;
    refreshTokenKey: string;
    accessTokenKey: string;
  };
  auth: {
    refreshTokenIdentifier?: string;
  };
  manifestUrl: string,
  callbackUrl?: string,
  subscribedEvents: {
    source?: string,
    kind?: string,
    eventName?: string,
    hookUrl: string;
  }[]
  microFrontends: {
    name: string;
    description: string;
    url: string;
    active: boolean;
    opened: boolean;
    roles: string[],
    route?: {
      name: string;
      path: string;
      roles: string[],
      navBarPosition: 'top' | 'bottom';
    };
    component?: {
      page: string;
      position: 'top' | 'left' | 'right' | 'bottom';
    };
    modal?: {
      name: string;
      params: string[] | Record<string, string>; // schema / hints for props
      size: 'sm' | 'md' | 'lg' | 'full'
    }
  }[]
}

const MicroFrontendSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  manifestUrl: String,
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
    required: true
  },
  roles: [String],
  route: {
    name: String,
    path: String,
    navBarPosition: {
      type: String,
      enum: ['top', 'bottom'],
    },
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
    required: true
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
  microFrontends: [MicroFrontendSchema]
});

PluginSchema.index({tenant: 1, apiPath: 1}, {unique: true});

PluginSchema.methods.encodePath = function encodePath() {
  // make sure name doesn't have any sort of slashes.
  if (this.apiPath.includes('/') || this.apiPath.includes('\\')) {
    this.apiPath = this.apiPath.replace(/[\/\\]/g, ':');
  }
};

PluginSchema.pre('save', function () {
  this.encodePath();
})

const Plugin = mongoose.model<IPlugin>('Plugin', PluginSchema);

export default Plugin;
