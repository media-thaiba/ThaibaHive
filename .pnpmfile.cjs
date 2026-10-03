module.exports = {
  hooks: {
    readPackage(pkg, _context) {
      if (pkg.dependencies) {
        if (pkg.dependencies['brace-expansion']) {
          const v = pkg.dependencies['brace-expansion'];
          if (v.startsWith('^2') || v.startsWith('2.') || v.startsWith('~2') || v === '2.0.1') {
            pkg.dependencies['brace-expansion'] = '>=2.1.7';
          } else if (v.startsWith('^4') || v.startsWith('4.') || v.startsWith('^5') || v.startsWith('5.') || v.startsWith('~4') || v.startsWith('~5')) {
            pkg.dependencies['brace-expansion'] = '>=5.0.12';
          }
        }
        if (pkg.dependencies['postcss']) {
          pkg.dependencies['postcss'] = '>=8.4.49';
        }
        if (pkg.dependencies['nanoid']) {
          pkg.dependencies['nanoid'] = '>=3.3.8';
        }
        if (pkg.dependencies['@grpc/grpc-js']) {
          pkg.dependencies['@grpc/grpc-js'] = '>=1.14.5';
        }
        if (pkg.dependencies['@fastify/busboy']) {
          pkg.dependencies['@fastify/busboy'] = '>=3.2.1';
        }
        if (pkg.dependencies['browserslist']) {
          pkg.dependencies['browserslist'] = '>=4.28.7';
        }
        if (pkg.dependencies['sharp']) {
          pkg.dependencies['sharp'] = '>=0.33.5';
        }
        if (pkg.dependencies['qs']) {
          pkg.dependencies['qs'] = '>=6.16.0';
        }
      }
      return pkg;
    },
  },
};
