const request = require('request')
const util = require('util')

const requestPost = util.promisify(request.post)

const createPublication = async (token, readerUrl, number = 1) => {
  let promises = []

  for (let i = 0; i < number; i++) {
    promises.push(
      requestPost(`${readerUrl}/activity`, {
        auth: {
          bearer: token
        },
        headers: {
          Host: process.eventNames.DOMAIN,
          'content-type': 'application/ld+json'
        },
        body: JSON.stringify({
          type: 'Create',
          object: {
            type: 'Book',
            name: 'Publication ' + i,
            author: ['John Smith'],
            editor: 'Jané S. Doe',
            abstract: 'this is a description!!',
            inLanguage: 'en',
            links: [
              {
                url: 'http://example.org/abc',
                encodingFormat: 'text/html',
                name: 'An example link'
              }
            ],
            readingOrder: [
              {
                url: 'http://example.org/abc',
                encodingFormat: 'text/html',
                name: 'An example reading order object1'
              },
              {
                url: 'http://example.org/abc',
                encodingFormat: 'text/html',
                name: 'An example reading order object2'
              },
              {
                url: 'http://example.org/abc',
                encodingFormat: 'text/html',
                name: 'An example reading order object3'
              }
            ],
            resources: [
              {
                url: 'http://example.org/abc',
                encodingFormat: 'text/html',
                name: 'An example resource'
              }
            ],
            json: { property: 'value' }
          }
        })
      })
    )
  }
  try {
    await Promise.all(promises)
  } catch (err) {
    console.log('error: ', err)
  }
}

module.exports = createPublication
