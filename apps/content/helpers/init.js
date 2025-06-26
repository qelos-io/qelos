/**
 * this file used to initiate basic data inside the authentication service
 */
const config = require('../config');
const mongoose = require('mongoose');
const {
  appConfiguration,
  workspaceConfiguration,
  ssrScriptsConfiguration,
} = require("../config");
require("../server/models").connect(config.mongoUri);

const TENANT = process.env.TENANT || "0";
const HOST = process.env.HOST || "127.0.0.1";
const SLOGAN = process.env.SLOGAN;
const LOGO_URL = process.env.LOGO_URL;
const IS_WORKSPACES_ACTIVE = process.env.IS_WORKSPACES_ACTIVE === "true";

const Configuration = mongoose.model("Configuration");

const configuration = new Configuration({
  tenant: TENANT,
  key: appConfiguration,
  public: true,
  metadata: {
    name: TENANT !== "0" ? HOST : TENANT,
    language: "en",
    direction: "ltr",
    logoUrl: LOGO_URL || "https://subscribe.qelos.io/qelos.svg",
    description: "Software as a Service",
    slogan: SLOGAN || "Amazing SaaS platform",
    keywords: "saas, platform, node, vue, fastify",
    themeStylesUrl: "",
    scriptUrl: "",
    homeScreen: "",
    websiteUrls: [HOST],
    colorsPalette: {
      mainColor: '#264653',
      mainColorLight: '#1c4252',
      textColor: '#1c4252',
      secondaryColor: '#2a9d8f',
      thirdColor: '#e9c46a',
      bgColor: '#ffffff',
      bordersColor: '#e2e8f0',
      inputsTextColor: '#1c4252',
      inputsBgColor: '#f8fafc',
      linksColor: '#2a9d8f',
      navigationBgColor: '#1c4252',
      negativeColor: '#9b7a3a',
      buttonTextColor: '#ffffff',
      buttonBgColor: '#264653',
      focusColor: '#2a9d8f',
      fontFamily: 'Helvetica, Arial, sans-serif',
      headingsFontFamily: 'Helvetica, Arial, sans-serif',
      baseFontSize: 16,
      borderRadius: 4,
      buttonRadius: 4,
      spacing: 'normal',
      shadowStyle: 'light',
      animationSpeed: 250
    },
  },
});

const wsConfiguration = new Configuration({
  tenant: TENANT,
  key: workspaceConfiguration,
  public: true,
  metadata: {
    isActive: IS_WORKSPACES_ACTIVE,
    creationPrivilegedRoles: ["*"],
    viewMembersPrivilegedWsRoles: ["*"],
  },
});

const ssrConfiguration = new Configuration({
  tenant: TENANT,
  key: ssrScriptsConfiguration,
  public: true,
  metadata: {
    head: "",
    body: "",
  },
});


const authConfiguration = new Configuration({
  tenant: TENANT,
  key: 'auth-configuration',
  public: true,
  metadata: {
    treatUsernameAs: 'email',
    showLoginPage: true,
    showRegisterPage: false,
    additionalUserFields: [],
    socialLoginsSources: {},
  },
});


console.log("initiate content");

Promise.all([
  configuration.save(),
  wsConfiguration.save(),
  ssrConfiguration.save(),
  authConfiguration.save(),
])
  .then(() => {
    console.log("content created successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });

