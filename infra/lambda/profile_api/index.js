const { DynamoDBClient, GetItemCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')

const TABLE_NAME = process.env.TABLE_NAME
const BUCKET_NAME = process.env.BUCKET_NAME
const REGION = process.env.AWS_REGION || 'us-east-1'

const dynamo = new DynamoDBClient({ region: REGION })
const s3 = new S3Client({ region: REGION })

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  }
}

function getSub(event) {
  const claims = event?.requestContext?.authorizer?.jwt?.claims
  if (!claims?.sub) {
    return null
  }
  return claims.sub
}

exports.handler = async (event) => {
  const sub = getSub(event)
  if (!sub) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const method = event.requestContext?.http?.method
  const path = event.rawPath || event.requestContext?.http?.path || ''

  try {
    if (method === 'GET' && path === '/profile/upload-url') {
      const key = `profiles/${sub}/avatar`
      const command = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key })
      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
      return json({ uploadUrl, key })
    }

    if (method === 'GET' && path === '/profile/photo-url') {
      const key = `profiles/${sub}/avatar`
      const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
      const photoUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })
      return json({ photoUrl })
    }

    if (method === 'GET' && path === '/profile') {
      const { Item } = await dynamo.send(
        new GetItemCommand({
          TableName: TABLE_NAME,
          Key: { userId: { S: sub } },
        })
      )
      if (!Item) {
        return json({ userId: sub, displayName: null, profilePictureKey: null })
      }
      const profile = {
        userId: sub,
        displayName: Item.displayName?.S ?? null,
        profilePictureKey: Item.profilePictureKey?.S ?? null,
      }
      return json(profile)
    }

    if (method === 'PATCH' && path === '/profile') {
      let body = {}
      if (event.body) {
        try {
          body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
        } catch (_) {
          return json({ error: 'Invalid JSON' }, 400)
        }
      }
      const displayName = body.displayName !== undefined ? String(body.displayName).trim() : undefined
      const profilePictureKey = body.profilePictureKey !== undefined ? body.profilePictureKey : undefined

      const now = new Date().toISOString()
      const item = {
        userId: { S: sub },
        updatedAt: { S: now },
      }
      if (displayName !== undefined) item.displayName = { S: displayName || '' }
      if (profilePictureKey !== undefined) item.profilePictureKey = { S: profilePictureKey || '' }

      await dynamo.send(
        new PutItemCommand({
          TableName: TABLE_NAME,
          Item: item,
        })
      )
      return json({ ok: true })
    }

    return json({ error: 'Not found' }, 404)
  } catch (err) {
    console.error(err)
    return json({ error: 'Internal server error' }, 500)
  }
}
