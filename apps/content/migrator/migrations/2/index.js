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
async function check () {
  const hasConfig = await Configuration.countDocuments({ key: appConfiguration })
  return !hasConfig
}

/**
 * migrate relevant db rows to fit the new upgrade
 */
function migrate () {
  const row = new Configuration({
    tenant: TENANT,
    key: appConfiguration,
    public: true,
    metadata: {
      name: 'QELOS',
      language: 'en',
      direction: 'ltr',
      logoUrl: '/logo.png',
      description: 'building SaaS products',
      slogan: 'building platforms with ease',
      keywords: 'saas, platform, micro-frontends, vue',
      themeStylesUrl: '',
      homeScreen: '/',
      scriptUrl: '',
      websiteUrls: ['localhost'],
      colorsPalette: {
        mainColor: '#84a98c',
        textColor: '#000',
        secondaryColor: '#84a98c',
        thirdColor: '#c6dccc',
        negativeColor: '#fff',
        bgColor: '#2f3e46',
        bordersColor: '#354f52',
        inputsTextColor: '#000',
        inputsBgColor: '#d6eedd',
        linksColor: '#84a98c',
        navigationBgColor: '#354f52',
      }
    }
  })
  return row.save()
}

/**
 * check if all migration changes done as expected
 */
function verify () {
  return Configuration.countDocuments({ key: appConfiguration }).then(count => {
    if (!count) return Promise.reject()
  })
}

module.exports = {
  check, migrate, verify
}
