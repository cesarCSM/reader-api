const { Publication } = require('./Publication')
const { Attribution } = require('./Attribution')
const { Reader } = require('./Reader')

class Library {
  static async getLibraryCount (readerId, filter) {
    let author, attribution, type, workspace
    if (filter.author) author = Attribution.normalizeName(filter.author)
    if (filter.attribution) {
      attribution = Attribution.normalizeName(filter.attribution)
    }
    if (filter.type) {
      type =
        filter.type.charAt(0).toUpperCase() +
        filter.type.substring(1).toLowerCase()
    }
    if (filter.workspace) {
      workspace =
        filter.workspace.charAt(0).toUpperCase() +
        filter.workspace.substring(1).toLowerCase()
    }
    let resultQuery = Publication.query(Publication.knex())
      .count()
      .whereNull('Publication.deleted')
      .andWhere('Publication.readerId', '=', readerId)

    if (filter.title) {
      resultQuery = resultQuery.where(
        'Publication.name',
        'ilike',
        `%${filter.title.toLowerCase()}%`
      )
    }
    if (filter.type) {
      resultQuery = resultQuery.where('Publication.type', '=', type)
    }
    if (filter.language) {
      resultQuery = resultQuery.whereJsonSupersetOf(
        'Publication.metadata:inLanguage',
        [filter.language]
      )
    }
    if (filter.keyword) {
      resultQuery = resultQuery.whereJsonSupersetOf(
        'Publication.metadata:keywords',
        [filter.keyword.toLowerCase()]
      )
    }
    if (filter.author) {
      resultQuery = resultQuery
        .leftJoin(
          'Attribution',
          'Attribution.publicationId',
          '=',
          'Publication.id'
        )
        .where('Attribution.normalizedName', '=', author)
        .andWhere('Attribution.role', '=', 'author')
    }
    if (filter.attribution) {
      resultQuery = resultQuery
        .leftJoin(
          'Attribution',
          'Attribution.publicationId',
          '=',
          'Publication.id'
        )
        .where('Attribution.normalizedName', 'like', `%${attribution}%`)
      if (filter.role) {
        resultQuery = resultQuery.andWhere('Attribution.role', '=', filter.role)
      }
    }
    if (filter.collection) {
      resultQuery = resultQuery
        .leftJoin(
          'publication_tag as publication_tag_collection',
          'publication_tag_collection.publicationId',
          '=',
          'Publication.id'
        )
        .leftJoin(
          'Tag as Tag_collection',
          'publication_tag_collection.tagId',
          '=',
          'Tag_collection.id'
        )
        .where('Tag_collection.name', '=', filter.collection)
        .andWhere('Tag_collection.type', '=', 'stack')
    }
    if (filter.workspace) {
      resultQuery = resultQuery
        .leftJoin(
          'publication_tag as publication_tag_workspace',
          'publication_tag_workspace.publicationId',
          '=',
          'Publication.id'
        )
        .leftJoin(
          'Tag as Tag_workspace',
          'publication_tag_workspace.tagId',
          '=',
          'Tag_workspace.id'
        )
        .where('Tag_workspace.name', '=', workspace)
        .andWhere('Tag_workspace.type', '=', 'workspace')
    }
    if (filter.search) {
      const search = filter.search.toLowerCase()
      resultQuery = resultQuery.where(nestedQuery => {
        nestedQuery
          .where('Publication.name', 'ilike', `%${search}%`)
          .orWhere('Publication.abstract', 'ilike', `%${search}%`)
          .orWhere('Publication.description', 'ilike', `%${search}%`)
          .orWhereJsonSupersetOf('Publication.metadata:keywords', [search])
      })
    }

    const result = await resultQuery
    return result[0].count
  }

  static async getLibrary (
    readerAuthId /*: string */,
    limit /*: number */,
    offset /*: number */,
    filter /*: any */
  ) {
    offset = !offset ? 0 : offset
    let author, attribution, type, workspace
    if (filter.author) author = Attribution.normalizeName(filter.author)
    if (filter.attribution) {
      attribution = Attribution.normalizeName(filter.attribution)
    }
    if (filter.type) {
      type =
        filter.type.charAt(0).toUpperCase() +
        filter.type.substring(1).toLowerCase()
    }
    if (filter.workspace) {
      workspace =
        filter.workspace.charAt(0).toUpperCase() +
        filter.workspace.substring(1).toLowerCase()
    }

    const readers = await Reader.query(Reader.knex())
      .where('Reader.authId', '=', readerAuthId)
      .skipUndefined()
      .withGraphFetched('[tags, publications]')
      .modifyGraph('publications', builder => {
        builder
          .select(
            'Publication.id',
            'Publication.metadata',
            'Publication.name',
            'Publication.datePublished',
            'Publication.status',
            'Publication.type',
            'Publication.encodingFormat',
            'Publication.published',
            'Publication.updated',
            'Publication.deleted',
            'Publication.resources',
            'Publication.links'
          )
          .from('Publication')
        builder.distinct('Publication.id')
        builder.whereNull('Publication.deleted')
        if (filter.title) {
          const title = filter.title.toLowerCase()
          builder.where('Publication.name', 'ilike', `%${title}%`)
        }
        if (filter.language) {
          builder.whereJsonSupersetOf('Publication.metadata:inLanguage', [
            filter.language
          ])
        }
        if (filter.keyword) {
          builder.whereJsonSupersetOf('Publication.metadata:keywords', [
            filter.keyword.toLowerCase()
          ])
        }
        if (filter.type) {
          builder.where('Publication.type', '=', type)
        }
        builder.leftJoin(
          'Attribution',
          'Attribution.publicationId',
          '=',
          'Publication.id'
        )

        if (filter.author) {
          builder
            .where('Attribution.normalizedName', '=', author)
            .andWhere('Attribution.role', '=', 'author')
        }
        if (filter.attribution) {
          builder.where(
            'Attribution.normalizedName',
            'like',
            `%${attribution}%`
          )
          if (filter.role) {
            builder.andWhere('Attribution.role', '=', filter.role)
          }
        }
        builder.withGraphFetched('[tags, attributions]')
        if (filter.collection) {
          builder.leftJoin(
            'publication_tag as publication_tag_collection',
            'publication_tag_collection.publicationId',
            '=',
            'Publication.id'
          )
          builder.leftJoin(
            'Tag as Tag_collection',
            'publication_tag_collection.tagId',
            '=',
            'Tag_collection.id'
          )
          builder.whereNull('Tag_collection.deleted')
          builder
            .where('Tag_collection.name', '=', filter.collection)
            .andWhere('Tag_collection.type', '=', 'stack')
        }
        if (filter.workspace) {
          builder.leftJoin(
            'publication_tag as publication_tag_workspace',
            'publication_tag_workspace.publicationId',
            '=',
            'Publication.id'
          )
          builder.leftJoin(
            'Tag as Tag_workspace',
            'publication_tag_workspace.tagId',
            '=',
            'Tag_workspace.id'
          )
          builder.whereNull('Tag_workspace.deleted')
          builder
            .where('Tag_workspace.name', '=', workspace)
            .andWhere('Tag_workspace.type', '=', 'workspace')
        }
        if (filter.search) {
          const search = filter.search.toLowerCase()
          builder.where(nestedBuilder => {
            nestedBuilder
              .where('Publication.name', 'ilike', `%${search}%`)
              .orWhere('Publication.abstract', 'ilike', `%${search}%`)
              .orWhere('Publication.description', 'ilike', `%${search}%`)
              .orWhereJsonSupersetOf('Publication.metadata:keywords', [search])
          })
        }
        if (filter.orderBy === 'title') {
          if (filter.reverse) {
            builder.orderBy('Publication.name', 'desc')
          } else {
            builder.orderBy('Publication.name')
          }
        } else if (filter.orderBy === 'datePublished') {
          if (filter.reverse) {
            builder.orderByRaw('"datePublished" NULLS FIRST')
          } else {
            builder.orderByRaw('"datePublished" DESC NULLS LAST')
          }
        } else {
          if (filter.reverse) {
            builder.orderBy('Publication.updated')
          } else {
            builder.orderBy('Publication.updated', 'desc')
          }
        }
        builder.limit(limit)
        builder.offset(offset)
      })
    return readers[0]
  }
}

module.exports = { Library }
