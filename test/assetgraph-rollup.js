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

    const [htmlAsset] = await assetGraph.loadAssets('/src/index.html');

    await assetGraph.populate({ followRelations: { crossorigin: false } });

    await assetgraphRollup(assetGraph, htmlAsset);
  });

  it('should bundle assets that are not found on disc', async function () {
    const assetGraph = new AssetGraph();

    assetGraph.addAsset({
      type: 'JavaScript',
      url: 'https://example.com/imported.js',
      text: 'export function foo (){console.log("Hello")}',
    });

    assetGraph.addAsset({
      type: 'JavaScript',
      url: 'https://example.com/entrypoint.js',
      text: 'import { foo } from "./imported.js"; foo();',
    });

    const htmlAsset = assetGraph.addAsset({
      type: 'Html',
      url: 'https://example.com/index.html',
      text:
        '<!DOCTYPE html><script type="module" src="entrypoint.js"></script>',
    });

    await assetgraphRollup(assetGraph, htmlAsset);

    const bundleJavaScript = htmlAsset.outgoingRelations[0].to;
    expect(bundleJavaScript.text, 'to contain', 'Hello');
  });

  it('should support multiple entry points in one Html asset', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'one-page-multiple-entry-points'
      ),
    });

    const [htmlAsset] = await assetGraph.loadAssets('/index.html');

    await assetGraph.populate({ followRelations: { crossorigin: false } });
    await assetGraph.applySourceMaps();
    await assetgraphRollup(assetGraph, htmlAsset);

    const firstBundleJavaScript = htmlAsset.outgoingRelations[0].to;
    const secondBundleJavaScript = htmlAsset.outgoingRelations[1].to;
    expect(
      firstBundleJavaScript.text,
      'to contain',
      `greet('the first entry point')`
    );
    expect(
      secondBundleJavaScript.text,
      'to contain',
      `greet('the second entry point')`
    );
    const firstBundleDep = firstBundleJavaScript.outgoingRelations[0].to;
    const secondBundleDep = secondBundleJavaScript.outgoingRelations[0].to;
    expect(firstBundleDep, 'to be', secondBundleDep);
    expect(firstBundleDep.text, 'to contain', 'export function greet');
  });

  it('should bundle a standalone JavaScript asset', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'one-page-multiple-entry-points'
      ),
    });

    const [javaScriptAsset] = await assetGraph.loadAssets(
      '/first-entrypoint.js'
    );

    await assetGraph.populate({ followRelations: { crossorigin: false } });
    await assetGraph.applySourceMaps();
    await assetgraphRollup(assetGraph, javaScriptAsset);

    expect(
      javaScriptAsset.text,
      'to contain',
      `greet('the first entry point')`
    );
  });

  it('should bundle an inline script');

  it('should extract a source map from rollup and apply it to the bundle asset', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(__dirname, '..', 'testdata', 'single-import'),
    });

    const [htmlAsset] = await assetGraph.loadAssets('/index.html');

    await assetGraph.populate({ followRelations: { crossorigin: false } });

    await assetgraphRollup(assetGraph, htmlAsset);

    const bundleJavaScript = htmlAsset.outgoingRelations[0].to;

    const consoleLogStatement = bundleJavaScript.parseTree.body[0].body.body[0];
    expect(consoleLogStatement.loc, 'to satisfy', {
      source: `${assetGraph.root}imported.js`,
      start: { line: 1, column: 22 },
      end: { line: 1, column: 22 },
    });
  });

  it('should support existing source maps in the files that go into the bundle', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '..',
        'testdata',
        'existing-source-map'
      ),
    });

    const [htmlAsset] = await assetGraph.loadAssets('/index.html');

    await assetGraph.populate({ followRelations: { crossorigin: false } });
    await assetGraph.applySourceMaps();
    await assetgraphRollup(assetGraph, htmlAsset);

    const bundleJavaScript = htmlAsset.outgoingRelations[0].to;

    const iife = bundleJavaScript.parseTree.body[0].expression.callee;
    expect(iife.loc, 'to satisfy', {
      source: `${assetGraph.root}jquery-1.10.1.js`,
      start: { line: 14, column: 0 },
    });
  });
});
