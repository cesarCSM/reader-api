const request = require('supertest')
const tap = require('tap')
const {
  getToken,
  createUser,
  destroyDB,
  createPublication,
  createDocument
} = require('../../utils/testUtils')
const { urlToId } = require('../../../utils/utils')

const test = async app => {
  const token = getToken()
  const readerUrl = await createUser(app, token)
  const readerId = urlToId(readerUrl)

  const publication = await createPublication(readerId)
  const publicationId = urlToId(publication.id)
  const publicationUrl = publication.id

  const publication2 = await createPublication(readerId)
  const publicationId2 = urlToId(publication2.id)

  const createdDocument = await createDocument(readerId, publicationUrl)

  const documentUrl = `${publicationUrl}/${createdDocument.documentPath}`

  await tap.test('Create Note with single body', async () => {
    const res = await request(app)
      .post('/notes')
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type('application/ld+json')
      .send(
        JSON.stringify({
          body: {
            content: 'this is the content of the note',
            motivation: 'test'
          },
          json: { property1: 'value1' }
        })
      )
    await tap.equal(res.status, 201)
    const body = res.body
    await tap.ok(body.id)
    await tap.equal(body.shortId, urlToId(body.id))
    await tap.equal(urlToId(body.readerId), readerId)
    await tap.equal(body.json.property1, 'value1')
    await tap.ok(body.published)
    await tap.ok(body.body)
    await tap.ok(body.body[0].content)
    await tap.equal(body.body[0].motivation, 'test')

    await tap.type(res.get('Location'), 'string')
    await tap.equal(res.get('Location'), body.id)
  })

  await tap.test('Create Note with two bodies', async () => {
    const res = await request(app)
      .post('/notes')
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type('application/ld+json')
      .send(
        JSON.stringify({
          body: [
            {
              content: 'this is the content of the note',
              motivation: 'test'
            },
            {
              motivation: 'test'
            }
          ],
          json: { property1: 'value1' }
        })
      )
    await tap.equal(res.status, 201)
    const body = res.body
    await tap.ok(body.id)
    await tap.equal(urlToId(body.readerId), readerId)
    await tap.equal(body.json.property1, 'value1')
    await tap.ok(body.published)
    await tap.ok(body.body)
    await tap.equal(body.body.length, 2)
    await tap.ok(body.body[0].content)
    await tap.equal(body.body[0].motivation, 'test')
    await tap.notOk(body.body[1].content)
    await tap.equal(body.body[1].motivation, 'test')
  })

  await tap.test('Create Note with documentUrl and publicationId', async () => {
    const res = await request(app)
      .post('/notes')
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type('application/ld+json')
      .send(
        JSON.stringify({
          body: {
            content: 'this is the content of the note',
            motivation: 'test'
          },
          publicationId,
          documentUrl
        })
      )
    await tap.equal(res.status, 201)
    const body = res.body
    await tap.ok(body.id)
    await tap.equal(urlToId(body.readerId), readerId)
    await tap.ok(body.published)
    await tap.ok(body.body)
    await tap.ok(body.body[0].content)
    await tap.equal(body.body[0].motivation, 'test')
    await tap.equal(body.documentUrl, documentUrl)
    await tap.equal(urlToId(body.publicationId), publicationId)
  })

  await tap.test(
    'Create Note with publicationId but no documentUrl',
    async () => {
      const res = await request(app)
        .post('/notes')
        .set('Host', 'reader-api.test')
        .set('Authorization', `Bearer ${token}`)
        .type('application/ld+json')
        .send(
          JSON.stringify({
            body: {
              content: 'this is the content of the note',
              motivation: 'test'
            },
            publicationId
          })
        )
      await tap.equal(res.status, 201)
      const body = res.body
      await tap.ok(body.id)
      await tap.equal(urlToId(body.readerId), readerId)
      await tap.ok(body.published)
      await tap.ok(body.body)
      await tap.ok(body.body[0].content)
      await tap.equal(body.body[0].motivation, 'test')
      await tap.equal(urlToId(body.publicationId), publicationId)
    }
  )

  await tap.test(
    'Note with publicationId should be attached to publication',
    async () => {
      const res = await request(app)
        .get(`/publications/${urlToId(publicationUrl)}`)
        .set('Host', 'reader-api.test')
        .set('Authorization', `Bearer ${token}`)
        .type('application/ld+json')

      await tap.ok(res.body)
      await tap.equal(res.body.replies.length, 2)
    }
  )

  await tap.test(
    'All notes created should show up in the list of notes',
    async () => {
      const res = await request(app)
        .get(`/notes`)
        .set('Host', 'reader-api.test')
        .set('Authorization', `Bearer ${token}`)
        .type('application/ld+json')
      await tap.equal(res.body.totalItems, 4)
    }
  )

  // ------------------------------------- VALIDATION ERRORS ------------------------------------

  await tap.test('Try to create a Note without a body', async () => {
    const res = await request(app)
      .post('/notes')
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type('application/ld+json')
      .send(
        JSON.stringify({
          canonical: 'one'
        })
      )

    await tap.equal(res.status, 400)
    const error = JSON.parse(res.text)
    await tap.equal(error.statusCode, 400)
    await tap.equal(error.error, 'Bad Request')
    await tap.equal(
      error.message,
      'Create Note Validation Error: body is a required property'
    )
    await tap.equal(error.details.requestUrl, `/notes`)
    await tap.type(error.details.requestBody, 'object')
    await tap.equal(error.details.requestBody.canonical, 'one')
  })

  await tap.test(
    'Try to create a Note with a body but no motivation',
    async () => {
      const res = await request(app)
        .post('/notes')
        .set('Host', 'reader-api.test')
        .set('Authorization', `Bearer ${token}`)
        .type('application/ld+json')
        .send(
          JSON.stringify({
            canonical: 'one',
            body: {
              content: 'this should not show up!!!!!!!!',
              language: 'en'
            },
            json: { property: 'this should not be saved!!' }
          })
        )

      await tap.equal(res.status, 400)
      const error = JSON.parse(res.text)
      await tap.equal(error.statusCode, 400)
      await tap.equal(error.error, 'Bad Request')
      await tap.equal(
        error.message,
        'Note Validation Error: body.motivation is a required property'
      )
      await tap.equal(error.details.requestUrl, `/notes`)
      await tap.type(error.details.requestBody, 'object')
      await tap.equal(error.details.requestBody.canonical, 'one')
    }
  )

  await tap.test('Note with invalid body should not exist', async () => {
    const res = await request(app)
      .get(`/notes`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type('application/ld+json')
    await tap.equal(res.body.totalItems, 4)
  })

  await tap.test('Try to create a Note with an invalid json', async () => {
    const res = await request(app)
      .post('/notes')
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type('application/ld+json')
      .send(
        JSON.stringify({
          body: {
            content: 'testing!',
            motivation: 'test'
          },
          json: 'a string!'
        })
      )

    await tap.equal(res.status, 400)
    const error = JSON.parse(res.text)
    await tap.equal(error.statusCode, 400)
    await tap.equal(error.error, 'Bad Request')
    await tap.equal(
      error.message,
      'Validation Error on Create Note: json: should be object,null'
    )
    await tap.equal(error.details.requestUrl, `/notes`)
    await tap.type(error.details.requestBody, 'object')
    await tap.equal(error.details.requestBody.json, 'a string!')
    await tap.type(error.details.validation, 'object')
    await tap.equal(error.details.validation.json[0].keyword, 'type')
    await tap.equal(error.details.validation.json[0].params.type, 'object,null')
  })

  await tap.test(
    'Try to create a Note with an invalid motivation',
    async () => {
      const res = await request(app)
        .post('/notes')
        .set('Host', 'reader-api.test')
        .set('Authorization', `Bearer ${token}`)
        .type('application/ld+json')
        .send(
          JSON.stringify({
            body: {
              content: 'testing!',
              motivation: 'invalid motivation'
            }
          })
        )

      await tap.equal(res.status, 400)
      const error = JSON.parse(res.text)
      await tap.equal(error.statusCode, 400)
      await tap.equal(
        error.message,
        'Note Validation Error: invalid motivation is not a valid value for body.motivation'
      )
      await tap.equal(error.details.requestUrl, `/notes`)
      await tap.type(error.details.requestBody, 'object')
      await tap.equal(error.details.requestBody.body.content, 'testing!')
      await tap.equal(error.error, 'Bad Request')
    }
  )

  // // ---------------------------------------- OTHER ERRORS -----------------------------------

  await tap.test('Try to create Note with invalid document url', async () => {
    const res = await request(app)
      .post('/notes')
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type('application/ld+json')
      .send(
        JSON.stringify({
          body: { motivation: 'test' },
          target: { property: 'something' },
          publicationId,
          documentUrl: documentUrl + 'abc'
        })
      )
    await tap.equal(res.status, 404)
    const error = JSON.parse(res.text)
    await tap.equal(error.statusCode, 404)
    await tap.equal(error.error, 'Not Found')
    await tap.equal(
      error.message,
      `Create Note Error: No Document found with documentUrl: ${documentUrl}abc`
    )
    await tap.equal(error.details.requestUrl, `/notes`)
    await tap.type(error.details.requestBody, 'object')
    await tap.equal(error.details.requestBody.body.motivation, 'test')
  })

  await tap.test('Try to create Note with invalid Publication id', async () => {
    const res = await request(app)
      .post('/notes')
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type('application/ld+json')
      .send(
        JSON.stringify({
          body: { motivation: 'test' },
          publicationId: publicationId + 'abc'
        })
      )

    await tap.equal(res.status, 404)
    const error = JSON.parse(res.text)
    await tap.equal(error.statusCode, 404)
    await tap.equal(error.error, 'Not Found')
    await tap.equal(
      error.message,
      `Create Note Error: No Publication found with id: ${publicationId}abc`
    )
    await tap.equal(error.details.requestUrl, `/notes`)
    await tap.type(error.details.requestBody, 'object')
    await tap.equal(error.details.requestBody.body.motivation, 'test')
  })

  await tap.test(
    'Try to create Note with a documentUrl but no publicationId',
    async () => {
      const res = await request(app)
        .post('/notes')
        .set('Host', 'reader-api.test')
        .set('Authorization', `Bearer ${token}`)
        .type('application/ld+json')
        .send(
          JSON.stringify({
            target: { property: 'something' },
            body: { motivation: 'test' },
            documentUrl: documentUrl
          })
        )
      await tap.equal(res.status, 400)
      const error = JSON.parse(res.text)
      await tap.equal(error.statusCode, 400)
      await tap.equal(error.error, 'Bad Request')
      await tap.equal(
        error.message,
        'Note Validation Error: Notes with a documentUrl must also have a publicationId'
      )
      await tap.equal(error.details.requestUrl, `/notes`)
      await tap.type(error.details.requestBody, 'object')
      await tap.equal(error.details.requestBody.body.motivation, 'test')
    }
  )

  await tap.test(
    'Try to create Note with a documentUrl but a publicationId for another publication',
    async () => {
      const res = await request(app)
        .post('/notes')
        .set('Host', 'reader-api.test')
        .set('Authorization', `Bearer ${token}`)
        .type('application/ld+json')
        .send(
          JSON.stringify({
            target: { property: 'something' },
            body: { motivation: 'test' },
            documentUrl: documentUrl,
            publicationId: publicationId2
          })
        )
      // should return a document not found error
      await tap.equal(res.status, 400)
      const error = JSON.parse(res.text)
      await tap.equal(error.statusCode, 400)
      await tap.equal(
        error.message,
        `Note Validation Error: document with url ${documentUrl} does not belong to publication ${publicationId2}`
      )
      await tap.equal(error.details.requestUrl, `/notes`)
      await tap.type(error.details.requestBody, 'object')
      await tap.equal(error.details.requestBody.body.motivation, 'test')
    }
  )

  await tap.test(
    'None of the error scenario should have created a note',
    async () => {
      const res = await request(app)
        .get(`/notes`)
        .set('Host', 'reader-api.test')
        .set('Authorization', `Bearer ${token}`)
        .type('application/ld+json')
      await tap.equal(res.body.totalItems, 4)
    }
  )

  await destroyDB(app)
}

module.exports = test
