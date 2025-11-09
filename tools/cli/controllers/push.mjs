import fs from 'node:fs'
import {createJiti} from 'jiti';

const jiti = createJiti(import.meta.url);

export default async function pushController({ type, path }) {

  const QelosAdministratorSDK = await jiti('@qelos/sdk/src/administrator/index.ts');

  const sdk = new QelosAdministratorSDK.default({
    appUrl: process.env.QELOS_URL || "http://localhost:3000",
  })

  await sdk.authentication.oAuthSignin({
    username: process.env.QELOS_USERNAME || 'test@test.com',
    password: process.env.QELOS_PASSWORD || 'admin',
  })

  // if type === 'components' - load all vue files from path and push them using sdk
  if (type === 'components') {
    const files = fs.readdirSync(path)
    const existingComponents = await sdk.components.getList()
    await Promise.all(files.map(async (file) => {
      if (file.endsWith('.vue')) {
        const content = fs.readFileSync(path + '/' + file, 'utf-8')
        console.log('Pushing component:', file.replace('.vue', ''))
        const existingComponent = existingComponents.find(component => component.identifier === file.replace('.vue', ''))
        if (existingComponent) {
          await sdk.components.update(existingComponent._id, {
            content,
            description: 'Component description'
          })
          console.log('Component updated:', file.replace('.vue', ''))
        } else {
          await sdk.components.create({
            identifier: file.replace('.vue', ''),
            componentName: file.replace('.vue', ''),
            content,
            description: 'Component description'
          })
          console.log('Component pushed:', file.replace('.vue', ''))
        }
      }
    }))
    console.log('All components pushed')
  }
}