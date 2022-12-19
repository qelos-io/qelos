import {addMicroFrontend} from '@qelos/plugin-play'

addMicroFrontend({
  name: 'Demo Plugin UI',
  description: 'Description for the user',
  url: '/index.html',
  roles: ['*'],
  route: {
    name: 'example',
    path: 'example',
    navBarPosition: 'top'
  }
})