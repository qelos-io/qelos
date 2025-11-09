import QelosAdministratorSDK from "@qelos/sdk/src/administrator";
import fs from 'node:fs'
import path from 'node:path'

export default async function pullController({ type, path: targetPath }) {

  const sdk = new QelosAdministratorSDK({
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
      
      fs.writeFileSync(filePath, component.content, 'utf-8')
      console.log('Pulled component:', component.identifier)
    }))

    console.log(`All ${components.length} components pulled to ${targetPath}`)
  }
}
