import { spawn as _spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

import AdmZip from 'adm-zip'
import * as dotenv from 'dotenv'
import { Blob, NFTStorage } from 'nft.storage'
import { renderFile } from 'template-file'

const spawn = async (cmd: string) =>
  new Promise<boolean>((resolve) => {
    console.log('> ' + cmd)
    const spawned = _spawn(cmd.split(' ')[0], cmd.split(' ').slice(1))

    spawned.stdout.on('data', (data) => {
      process.stdout.write(data)
    })
    spawned.stderr.on('data', (data) => {
      process.stderr.write(data)
    })
    spawned.on('close', (code) => {
      if (code > 0) {
        console.log(`exited with ${code}`)
      }
      resolve(code === 0)
    })
  })

const CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@$%^&*()-_+[]{};:,.<>'
const randomPassword = (length = 32) =>
  [...Array(length)]
    .map(() => CHARS[Math.floor(Math.random() * CHARS.length)])
    .join('')

const main = async () => {
  if (process.argv.length !== 4) {
    throw new Error('SYNTAX: yarn containerify <indexer folder> <indexer port>')
  }

  // const akashDeployTemplate = path.join(
  //   __dirname,
  //   './akash.deploy.template.yml'
  // )
  // if (!fs.existsSync(akashDeployTemplate)) {
  //   throw new Error(`${akashDeployTemplate} not found.`)
  // }

  const dockerComposeDeployTemplate = path.join(
    __dirname,
    './docker-compose.deploy.template.yml'
  )
  if (!fs.existsSync(dockerComposeDeployTemplate)) {
    throw new Error(`${dockerComposeDeployTemplate} not found.`)
  }

  // Import env variables from .env.
  dotenv.config({ path: path.join(__dirname, '.env') })

  const NFT_STORAGE_API_KEY = process.env.NFT_STORAGE_API_KEY
  const BACKUP_BUCKET = process.env.BACKUP_BUCKET
  const BACKUP_KEY = process.env.BACKUP_KEY
  const BACKUP_SECRET = process.env.BACKUP_SECRET
  const BACKUP_ENCRYPTION_PASSPHRASE = process.env.BACKUP_ENCRYPTION_PASSPHRASE
  const BACKUP_HOST = process.env.BACKUP_HOST
  const BACKUP_SCHEDULE = process.env.BACKUP_SCHEDULE
  const BACKUP_RETAIN = process.env.BACKUP_RETAIN
  const IPFS_HTTPS_URL_TEMPLATE = process.env.IPFS_HTTPS_URL_TEMPLATE
  // const ACCEPT_HOST_SUFFIX = process.env.ACCEPT_HOST_SUFFIX

  if (
    !NFT_STORAGE_API_KEY ||
    !BACKUP_BUCKET ||
    !BACKUP_KEY ||
    !BACKUP_SECRET ||
    !BACKUP_ENCRYPTION_PASSPHRASE ||
    !BACKUP_HOST ||
    !BACKUP_SCHEDULE ||
    !BACKUP_RETAIN ||
    !IPFS_HTTPS_URL_TEMPLATE
    //   !ACCEPT_HOST_SUFFIX
  ) {
    throw new Error('Incomplete environment variables.')
  }

  if (
    !IPFS_HTTPS_URL_TEMPLATE.startsWith('https://') ||
    !IPFS_HTTPS_URL_TEMPLATE.includes('{{cid}}')
  ) {
    throw new Error(
      `IPFS_HTTPS_URL_TEMPLATE (${IPFS_HTTPS_URL_TEMPLATE}) should start with "https://" and contain "{{cid}}" somewhere.`
    )
  }

  const indexer = process.argv[2]
  const indexerPath = path.join(__dirname, '../../indexers/', indexer)
  if (!fs.existsSync(indexerPath)) {
    throw new Error(`${indexerPath} not found.`)
  }
  const indexerPort = process.argv[3]
  // Switch current working directory to indexer path so we can execute scripts cleanly.
  process.chdir(indexerPath)

  // Install.
  if (!(await spawn('yarn'))) {
    throw new Error('Failed to install.')
  }
  // Codegen.
  if (
    !(await spawn('npx subql codegen')) ||
    // Codegen imports from the wrong package, rip.
    !(await spawn(
      "npx replace-in-files --string '@subql/types' --replacement '@subql/types-cosmos' src/types/models/*"
    )) ||
    // Format the codegen output.
    !(await spawn('yarn format'))
  ) {
    throw new Error('Failed to generate types.')
  }
  // Build.
  if (!(await spawn('npx subql build'))) {
    throw new Error('Failed to build.')
  }

  // Zip.
  console.log('Uploading build...')

  const zip = new AdmZip()
  zip.addLocalFolder('dist', 'dist')
  zip.addLocalFile('schema.graphql')
  zip.addLocalFile('project.yaml')
  const zipBuffer = zip.toBuffer()

  // Upload zip to IPFS.
  const nftStorage = new NFTStorage({ token: NFT_STORAGE_API_KEY })
  const cid = await nftStorage.storeBlob(new Blob([zipBuffer]))
  console.log(`Uploaded to IPFS with CID ${cid}`)

  // Generate deploy yml files.
  const dbPassword = randomPassword()
  const zipUrl = IPFS_HTTPS_URL_TEMPLATE.replace('{{cid}}', cid)
  // const acceptHost = indexer + ACCEPT_HOST_SUFFIX

  // const akashDeployContent = await renderFile(akashDeployTemplate, {
  //   dbPassword,
  //   zipUrl,
  //   acceptHost,
  //   backup: {
  //     bucket: BACKUP_BUCKET,
  //     folder: indexer,
  //     key: BACKUP_KEY,
  //     secret: BACKUP_SECRET,
  //     encryptionPassphrase: BACKUP_ENCRYPTION_PASSPHRASE,
  //     host: BACKUP_HOST,
  //     schedule: BACKUP_SCHEDULE,
  //     retain: BACKUP_RETAIN,
  //   },
  // })

  const now = Date.now()

  // const akashDeployPath = path.join(
  //   indexerPath,
  //   `akash.deploy_${indexer}_${now}.yml`
  // )
  // fs.writeFileSync(akashDeployPath, akashDeployContent)
  // console.log(`Saved ${akashDeployPath}`)

  const dockerComposeDeployContent = (
    await renderFile(dockerComposeDeployTemplate, {
      dbPassword,
      zipUrl,
      port: indexerPort,
      backup: {
        bucket: BACKUP_BUCKET,
        folder: indexer,
        key: BACKUP_KEY,
        secret: BACKUP_SECRET,
        encryptionPassphrase: BACKUP_ENCRYPTION_PASSPHRASE,
        host: BACKUP_HOST,
        schedule: BACKUP_SCHEDULE,
        retain: BACKUP_RETAIN,
      },
    })
  )
    // Escape dollar signs since docker compose yml files use it for variable
    // substitution by replacing each single dollar sign with two dollar signs.
    // Also double dollar sign is a special pattern in the JS string replace
    // function that inserts a single dollar sign, so we need to use four dollar
    // signs here to make two. Jeez.
    .replace(/\$/g, '$$$$')
  const dockerComposeDeployPath = path.join(
    indexerPath,
    `docker-compose.deploy_${indexer}_${now}.yml`
  )
  fs.writeFileSync(dockerComposeDeployPath, dockerComposeDeployContent)
  console.log(`Saved ${dockerComposeDeployPath}`)
}

main().catch((err) => {
  console.error((err instanceof Error ? err.message : `${err}`) + '\n')
  process.exit(1)
})
