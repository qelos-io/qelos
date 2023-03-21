/**
 * this file used to initiate basic data inside the authentication service
 */
const config = require('../config');
const mongoose = require('mongoose');
const { appConfiguration } = require('../config');
require('../server/models').connect(config.mongoUri);

const TENANT = process.env.TENANT || '0';
const HOST = process.env.HOST || '127.0.0.1';
const SLOGAN = process.env.SLOGAN;
const LOGO_URL = process.env.LOGO_URL;

const Configuration = mongoose.model('Configuration');

const configuration = new Configuration({
	tenant: TENANT,
	key: appConfiguration,
	public: true,
	metadata: {
		name: TENANT !== '0' ? HOST : TENANT,
		language: 'en',
		direction: 'ltr',
		logoUrl: LOGO_URL || 'https://subscribe.qelos.io/qelos.svg',
		description: 'Software as a Service',
		slogan: SLOGAN || 'Amazing SaaS platform',
		keywords: 'saas, platform, node, vue, fastify',
		themeStylesUrl: '',
		scriptUrl: '',
    homeScreen: '',
		websiteUrls: [HOST],
    colorsPalette: {
      mainColor: '#84a98c',
      secondaryColor: '#84a98c',
      thirdColor: '#c6dccc',
      bgColor: '#2f3e46',
      bordersColor: '#354f52',
      linksColor: '#84a98c',
      navigationBgColor: '#354f52',
      negativeColor: '#fff',
    }
	}
})

console.log('initiate content');

Promise.all([
	configuration.save(),
])
	.then(() => {
		console.log('content created successfully');
		process.exit(0);
	})
	.catch((err) => {
		console.log(err);
		process.exit(1);
	});

