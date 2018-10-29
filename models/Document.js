// @flow
'use strict'
const Model = require('objection').Model
const { BaseModel } = require('./BaseModel.js')
const { Publication } = require('./Publication.js')
const { Reader } = require('./Reader.js')

/**
 * @property {Reader} reader - Returns the reader that owns this document.
 * @property {Publication} context - Returns the document's parent `Publication`.
 * @property {Note[]} replies - Returns the notes associated with this document.
 *
 * This type covers Images, Pages (HTML, plain text, markdown), Articles, Audio, and Video resources that can be included in a publication and uploaded by a reader
 */
class Document extends BaseModel {
  static get tableName () {
    return 'Document'
  }
  get path () {
    return 'document'
  }
  static get jsonSchema () {
    return {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', maxLength: 255 },
        readerId: { type: 'string', format: 'uuid', maxLength: 255 },
        source: {
          type: 'object',
          properties: {
            type: 'string'
          }
        },
        json: {
          type: 'object',
          properties: {
            content: { type: 'string' },
            mediaType: { type: 'string', maxLength: 255 },
            icon: { type: 'string', format: 'url' },
            image: { type: 'string', format: 'url' },
            preview: { type: 'string', format: 'url' },
            context: { type: 'string', format: 'url' },
            summary: { type: 'string' }
          },
          additionalProperties: true
        },
        updated: { type: 'string', format: 'date-time' },
        published: { type: 'string', format: 'date-time' }
      },
      additionalProperties: true,
      required: ['json']
    }
  }
  static get relationMappings () {
    const { Note } = require('./Note.js')
    return {
      reader: {
        relation: Model.BelongsToOneRelation,
        modelClass: Reader,
        join: {
          from: 'Document.readerId',
          to: 'Reader.id'
        }
      },
      replies: {
        relation: Model.HasManyRelation,
        modelClass: Note,
        join: {
          from: 'Document.id',
          to: 'Note.documentId'
        }
      },
      context: {
        relation: Model.BelongsToOneRelation,
        modelClass: Publication,
        join: {
          from: 'Document.publicationId',
          to: 'Publication.id'
        }
      }
    }
  }
}
module.exports = { Document }
