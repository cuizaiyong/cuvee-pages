const { src, dest, series, parallel, watch } = require('gulp');

const LoadPlugins = require('gulp-load-plugins');
const del = require('del');
const browserSync = require('browser-sync');

const plugins = LoadPlugins();
const bs = browserSync.create();

const cwd = process.cwd();
let config = {
  build: {
    src: 'src',
    dist: 'dist',
    tmp: 'temp',
    public: 'public',
    paths: {
      style: 'assets/styles/*.scss',
      script: 'assets/scripts/*.js',
      image: 'assets/images/**',
      font: 'assets/fonts/**',
      page: '*.html',
    },
  },
  develop: {
    port: 3000,
    open: true,
  },
};

try {
  const loadConfig = require(`${cwd}/cuvee-pages.js`);
  config = Object.assign({}, config, loadConfig);
} catch (e) {}

const clean = () => {
  return del([config.build.tmp, config.build.dist]);
};

const style = () => {
  return src(config.build.paths.style, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.sass({ outputStyle: 'expanded' }))
    .pipe(dest(config.build.tmp))
    .pipe(bs.reload({ stream: true }));
};

const script = () => {
  return src(config.build.paths.script, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.format())
    .pipe(plugins.eslint.failAfterError())
    .pipe(plugins.babel({ presets: ['@babel/preset-env'] }))
    .pipe(dest(config.build.tmp))
    .pipe(bs.reload({ stream: true }));
};

const image = () => {
  return src(config.build.paths.image, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist));
};

const font = () => {
  return src(config.build.paths.font, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist));
};

const page = () => {
  return src(config.build.paths.page, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.swig({ data: config.data, defaults: { cache: false } }))
    .pipe(dest(config.build.tmp))
    .pipe(bs.reload({ stream: true }));
};

const extra = () => {
  return src('**', {
    base: config.build.public,
    cwd: config.build.public,
  }).pipe(dest(config.build.dist));
};

const serve = () => {
  watch(config.build.paths.style, { cwd: config.build.src }, style);
  watch(config.build.paths.script, { cwd: config.build.src }, script);
  watch(config.build.paths.page, { cwd: config.build.src }, page);

  watch(
    [config.build.paths.image, config.build.paths.font],
    { cwd: config.build.src },
    bs.reload
  );

  watch('**', { cwd: config.build.public }, bs.reload);
  bs.init({
    port: config.develop.port,
    open: config.develop.open,
    server: {
      baseDir: [config.build.tmp, config.build.src, config.build.public],
      routes: {
        '/node_modules': 'node_modules',
      },
    },
  });
};

const useref = () => {
  return src(config.build.tmp + '/' + config.build.paths.page, {
    base: config.build.tmp,
    // cwd: config.build.tmp,
  })
    .pipe(plugins.useref({ searchPath: [config.build.tmp, '.'] }))
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(
      plugins.if(
        /\.html$/,
        plugins.htmlmin({
          collapseWhitespace: true,
          minifyCSS: true,
          minifyJS: true,
        })
      )
    )
    .pipe(dest(config.build.dist));
};

const compile = parallel(style, script, page);

const build = series(
  clean,
  parallel(series(compile, useref), image, font, extra)
);

const develop = series(compile, serve);

module.exports = { build, develop, clean };
