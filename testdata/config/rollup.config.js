module.exports = {
  output: {
    banner: '/*! Here is a banner specified in the config */'
  },
  plugins: [
    require('rollup-plugin-terser').terser({
      output: {
        comments(node, comment) {
          return /^!/.test(comment.value);
        },
      }
    })
  ]
};
