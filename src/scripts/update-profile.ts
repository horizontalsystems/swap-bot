import { ChatClient } from 'simplex-chat'
import fs from 'fs'

async function main(): Promise<void> {
  const client = await ChatClient.create('ws://localhost:3030')

  const user = await client.apiGetActiveUser()
  if (!user) {
    console.error('No active user found.')
    process.exit(1)
  }
  console.log(`Logged in as: ${user.localDisplayName}`)

  const imageBuffer = fs.readFileSync('./avatar.jpg')
  const base64Image = imageBuffer.toString('base64')
  console.log(`Image size: ${base64Image.length} chars`)

  await client.apiUpdateProfile(user.userId, {
    ...user.profile,
    displayName: `Unstoppable Swap`,
    fullName: ``,
    image: `data:image/jpg;base64,${base64Image}`
  })

  console.log('Profile updated.')

  await client.disconnect()
  process.exit(0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
