const mongoose = require('mongoose')
const { appConfiguration } = require('../../../config')
const TENANT = process.env.TENANT || '0'

const Configuration = mongoose.model('Configuration')

/**
 * create site configuration
 */

/**
 * check potential changes to migrate
 */
async function check() {
  const hasConfig = await Configuration.countDocuments({ key: appConfiguration })
  return !hasConfig
}

/**
 * migrate relevant db rows to fit the new upgrade
 */
function migrate() {
  const row = new Configuration({
    tenant: TENANT,
    key: appConfiguration,
    public: true,
    metadata: {
      name: 'QELOS',
      language: 'en',
      direction: 'ltr',
      logoUrl: "https://qelos.io/_nuxt/qelos_logo.WhVlx9V7.jpg",
      description: 'building SaaS products',
      slogan: 'building platforms with ease',
      keywords: 'saas, platform, micro-frontends, vue',
      themeStylesUrl: '',
      homeScreen: '/',
      scriptUrl: '',
      websiteUrls: ['localhost:3000', '127.0.0.1'],
      colorsPalette: {
        mainColor: "#4d1438",
        textColor: "#000",
        secondaryColor: "#ffffff",
        thirdColor: "#e2c7f0",
        bgColor: "#ffffff",
        bordersColor: "#354f52",
        linksColor: "#4d1438",
        navigationBgColor: "#000000",
        negativeColor: "#ededed",
        inputsTextColor: "#000",
        inputsBgColor: "#ffffff"
      }
    }
  })
  return row.save()
}

/**
 * check if all migration changes done as expected
 */
function verify() {
  return Configuration.countDocuments({ key: appConfiguration }).then(count => {
    if (!count) return Promise.reject()
  })
}

module.exports = {
  check, migrate, verify
}
