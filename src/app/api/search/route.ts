import { NextRequest, NextResponse } from 'next/server';
import osClient from '@/lib/opensearch';

export async function GET(req: NextRequest) {
  try {
    const response = await osClient.ping();
    const searchResponse = await osClient.search({
      index: 'next_memo',
      body: {
        size: 0,
        query: {
          match_all: {},
        },
      },
    });

    return NextResponse.json({
      status: 'connected',
      ping: response.body,
      documentCount: searchResponse.body.hits.total.value,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('OpenSearch error:', error);

    return NextResponse.json(
      { error: error || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { query, filters = {}, size = 20 } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const { prefix, priority, ...otherFilters } = filters;

    let searchBody = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: query,
                fields: ['title^2', 'content', 'summary', 'tags'],
                type: 'best_fields',
                fuzziness: 'AUTO',
                operator: 'or',
              },
            },
          ],
          filter: [
            ...(prefix ? [{ term: { prefix: prefix } }] : []),
            ...(priority !== undefined
              ? [{ term: { priority: priority } }]
              : []),
            ...Object.entries(otherFilters).map(([field, value]) => ({
              term: { [field]: value },
            })),
          ],
        },
      },
      size: size,
      sort: query
        ? [
            { _score: { order: 'desc' } },
            { updatedAt: { order: 'desc' } },
            { _id: { order: 'desc' } },
          ]
        : [{ updatedAt: { order: 'desc' } }, { _id: { order: 'desc' } }],
    };

    const searchParams = {
      index: 'next_memo',
      body: searchBody,
    };

    const response = await osClient.search(searchParams);

    if (!response.body || !response.body.hits) {
      throw new Error('Invalid response format');
    }

    const hits = response.body.hits.hits;

    return NextResponse.json({
      hits: hits.map((hit: any) => ({
        ...hit._source,
        id: hit._id,
      })),
      total: response.body.hits.total.value,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
