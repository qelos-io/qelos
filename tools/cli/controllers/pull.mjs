import fs from 'node:fs'
import path from 'node:path'
import {createJiti} from 'jiti';

const jiti = createJiti(import.meta.url);

export default async function pullController({ type, path: targetPath }) {

  const QelosAdministratorSDK = await jiti('@qelos/sdk/src/administrator/index.ts');

  const sdk = new QelosAdministratorSDK.default({
    appUrl: process.env.QELOS_URL || "http://localhost:3000",
  })

  await sdk.authentication.oAuthSignin({
    username: process.env.QELOS_USERNAME || 'test@test.com',
    password: process.env.QELOS_PASSWORD || 'admin',
  })

  // if type === 'components' - fetch all components and save them as vue files
  if (type === 'components') {
    // Create directory if it doesn't exist
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true })
      console.log('Created directory:', targetPath)
    }

    const components = await sdk.components.getList()
    console.log(`Found ${components.length} components to pull`)

    await Promise.all(components.map(async (component) => {
      const fileName = `${component.identifier}.vue`
      const filePath = path.join(targetPath, fileName)

      const {content} = await sdk.components.getComponent(component._id);
      
      fs.writeFileSync(filePath, content, 'utf-8')
      console.log('Pulled component:', component.identifier)
    }))

    console.log(`All ${components.length} components pulled to ${targetPath}`)
  }
}
