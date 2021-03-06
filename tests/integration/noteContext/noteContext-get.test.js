const request = require('supertest')
const tap = require('tap')
const {
  getToken,
  createUser,
  destroyDB,
  createNoteContext,
  addNoteToContext,
  createNoteRelation
} = require('../../utils/testUtils')
const { urlToId } = require('../../../utils/utils')

const test = async app => {
  const token = getToken()
  await createUser(app, token)

  const noteContext = await createNoteContext(app, token, {
    name: 'context1',
    description: 'description1',
    type: 'test',
    json: { property: 'value1' }
  })
  await tap.test('Get empty noteContext', async () => {
    const res = await request(app)
      .get(`/noteContexts/${noteContext.shortId}`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type('application/ld+json')

    await tap.equal(res.status, 200)
    const body = res.body
    await tap.ok(body.id)
    await tap.equal(body.name, 'context1')
    await tap.equal(body.description, 'description1')
    await tap.equal(body.type, 'test')
    await tap.ok(body.json)
    await tap.equal(body.json.property, 'value1')
    // notes & noteRelations
    await tap.equal(body.notes.length, 0)
  })

  // add notes to noteContext
  await addNoteToContext(app, token, noteContext.shortId)
  await addNoteToContext(app, token, noteContext.shortId)
  let note1, note2

  await tap.test('Get noteContext with notes', async () => {
    const res = await request(app)
      .get(`/noteContexts/${noteContext.shortId}`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type('application/ld+json')

    await tap.equal(res.status, 200)
    const body = res.body
    await tap.ok(body.id)
    await tap.equal(body.name, 'context1')
    await tap.equal(body.description, 'description1')
    await tap.equal(body.type, 'test')
    await tap.ok(body.json)
    await tap.equal(body.json.property, 'value1')
    // notes & noteRelations
    await tap.equal(body.notes.length, 2)
    await tap.ok(body.notes[0].body)
    note1 = body.notes[0]
    note2 = body.notes[1]
  })

  await createNoteRelation(app, token, {
    from: note1.id,
    to: note2.id,
    type: 'test'
  })

  await tap.test('Get noteContext with notes and a noteRelation', async () => {
    const res = await request(app)
      .get(`/noteContexts/${noteContext.shortId}`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type('application/ld+json')

    await tap.equal(res.status, 200)

    const body = res.body
    await tap.ok(body.id)
    await tap.ok(body.id.startsWith('http'))
    await tap.equal(urlToId(body.id), body.shortId)
    await tap.equal(body.name, 'context1')
    await tap.equal(body.description, 'description1')
    await tap.equal(body.type, 'test')
    await tap.ok(body.json)
    await tap.equal(body.json.property, 'value1')
    // notes & noteRelations
    await tap.equal(body.notes.length, 2)
    await tap.equal(body.notes[0].relations.length, 1)
    await tap.equal(body.notes[1].relations.length, 1)
    // those two tests might break if order changes?
    await tap.ok(body.notes[0].relations[0].toNote)
    await tap.ok(body.notes[0].relations[0].toNote.body)
  })

  await tap.test('Try to get a NoteContext that does not exist', async () => {
    const res = await request(app)
      .get(`/noteContexts/${noteContext.shortId}abc`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type('application/ld+json')

    await tap.equal(res.statusCode, 404)
    const error = JSON.parse(res.text)
    await tap.equal(error.statusCode, 404)
    await tap.equal(error.error, 'Not Found')
    await tap.equal(
      error.message,
      `Get NoteContext Error: No NoteContext found with id ${
        noteContext.shortId
      }abc`
    )
    await tap.equal(
      error.details.requestUrl,
      `/noteContexts/${noteContext.shortId}abc`
    )
  })

  await destroyDB(app)
}

module.exports = test
