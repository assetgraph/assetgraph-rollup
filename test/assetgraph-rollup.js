const pathModule = require('path');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-assetgraph'));
const AssetGraph = require('assetgraph');
const assetgraphRollup = require('../lib/assetgraph-rollup');

describe('assetgraph-rollup', function () {
  it('should bundle a "trivial site"', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'airquote-trivial-site',
        'gridfinder'
      ),
    });

    const [indexHtml] = await assetGraph.loadAssets('/src/index.html');

    await assetGraph.populate({ followRelations: { crossorigin: false } });

    await assetgraphRollup(assetGraph, indexHtml);
    // FIXME: This is just for testing:
    await assetGraph.writeAssetsToDisc(
      { protocol: 'file:', isLoaded: true, isRedirect: false },
      'foo'
    );
  });
});
