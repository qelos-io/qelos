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
      mainColor: "#84a98c",
      textColor: "#000",
      secondaryColor: "#84a98c",
      thirdColor: "#c6dccc",
      bgColor: "#2f3e46",
      bordersColor: "#354f52",
      linksColor: "#84a98c",
      navigationBgColor: "#354f52",
      negativeColor: "#fff",
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

console.log("initiate content");

Promise.all([
  configuration.save(),
  wsConfiguration.save(),
  ssrConfiguration.save(),
])
  .then(() => {
    console.log("content created successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });

