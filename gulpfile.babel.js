'use strict';

import babelify     from 'babelify';
import bourbon      from 'bourbon';
import browserSync  from 'browser-sync';
import browserify   from 'browserify';
import del          from 'del';
import gulp         from 'gulp';
import cache        from 'gulp-cache';
import eslint       from 'gulp-eslint';
import gulpIf       from 'gulp-if';
import imagemin     from 'gulp-imagemin';
import minifyCss    from 'gulp-minify-css';
import minifyHtml   from 'gulp-minify-html';
import sass         from 'gulp-sass';
import sourcemaps   from 'gulp-sourcemaps';
import uglify       from 'gulp-uglify';
import runSequence  from 'run-sequence';
import watchify     from 'watchify';
import buffer       from 'vinyl-buffer';
import source       from 'vinyl-source-stream';

const reload    = browserSync.reload;
const neat      = `${__dirname}/node_modules/bourbon-neat/`;

let isWatchify  = false;
let isRelease   = false;

gulp.task('watchify', () => isWatchify = true);
gulp.task('release', cb => {
  isRelease = true;
  cb();
});

gulp.task('copy', () =>
  gulp.src([
    'app/*',
    '!app/*.html'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'))
);

gulp.task('copy:nm', () =>
  gulp.src([
    // 'your/copy/modules/**/*'
  ], {
    base: 'node_modules',
    dot: true
  })
  .pipe(gulp.dest('.tmp/modules'))
  .pipe(gulp.dest('dist/modules'))
);

gulp.task('clean', cb => {
  del(['.tmp', 'dist/*', '!dist/.git'], {dot: true});
  cb();
});

gulp.task('styles', () => {
  return gulp.src(['app/styles/main.scss'])
  .pipe(gulpIf(!isRelease, sourcemaps.init()))
  .pipe(sass({
    precision: 10,
    includePaths: [
      bourbon.includePaths,
      `${neat}app/assets/stylesheets`
    ]
  }).on('error', sass.logError))
  .pipe(gulpIf(isRelease, minifyCss()))
  .pipe(gulpIf(!isRelease, sourcemaps.write()))
  .pipe(gulpIf(isRelease, gulp.dest('dist/styles'), gulp.dest('.tmp/styles')));
});

gulp.task('lint', () =>
  gulp.src(['app/scripts/**/*.js', 'gulpfile.babel.js'])
  .pipe(eslint({
    globals: {$: true, document: true, window: true},
    rules: {
      'no-multi-spaces': [2, {exceptions: {
        VariableDeclarator: true,
        ImportDeclaration: true
      }}]
    }
  }))
  .pipe(eslint.format())
  .pipe(gulpIf(!browserSync.active, eslint.failOnError()))
  // .pipe(eslint.failOnError())
);

gulp.task('images', () =>
  gulp.src('app/images/**/*')
    .pipe(cache(imagemin({
      progressive: true,
      interlaced: true
    })))
    .pipe(gulp.dest('dist/images'))
);

gulp.task('scripts', () => {
  const browserifyOpts = {
    entries: './app/scripts/main.js',
    // basedir: './',
    // plugin: [watchify],
    transform: [babelify]
    // transform: babelify.configure({presets: ["es2015", "react", "stage-2"]}),
  };

  let bundler = browserify(browserifyOpts);
  console.log('isWatchify:', isWatchify);
  if (isWatchify) {
    browserifyOpts.cache = {};
    browserifyOpts.packageCache = {};
    browserifyOpts.debug = true;
    bundler = watchify(browserify(browserifyOpts));
  }

  let execBundle = () => {
    let time = process.hrtime();
    return bundler
    .bundle()
    .pipe(source('main.js'))
    .pipe(buffer())
    .pipe(gulpIf(!isRelease, sourcemaps.init({loadMaps: true})))
    .pipe(gulpIf(!isRelease, sourcemaps.write()))
    .pipe(gulpIf(isRelease, uglify({preserveComments: 'some'})))
    .on('error', err => console.log('Bundle error:', err))
    .pipe(gulpIf(!isRelease, sourcemaps.write()))
    .pipe(gulpIf(
      isRelease,
      gulp.dest('dist/scripts'),
      gulp.dest('.tmp/scripts')
    ))
    .on('end', () => {
      console.log('Bundled[ s, ns ]:', process.hrtime(time));
      if (isWatchify) {
        // reload({stream: true, once: true});
        // browserSync.stream({once: true});
        reload();
      }
    });
    // .pipe(gulpIf(browserSync.active, reload({stream: true, once: true})));
    // .pipe(gulpIf(isWatchify, reload({stream: true, once: true})));
    // .pipe(gulpIf(isWatchify, browserSync.stream({once: true})));
  };
  bundler.on('update', execBundle);
  return execBundle();
});

gulp.task('scripts:watch', cb => runSequence('watchify', 'scripts', cb));

gulp.task('html', () => {
  return gulp.src('app/**/*.html')
  .pipe(minifyHtml())
  .pipe(gulp.dest('dist'));
});

gulp.task('serve', ['copy:nm', 'scripts:watch', 'styles'], () => {
  browserSync({
    notify: false,
    // scrollElementMapping: ['main', '.mdl-layout'],
    // https: true,
    server: ['.tmp', 'app'],
    port: 3000
  });

  gulp.watch(['app/**/*.html'], reload);
  gulp.watch(['app/styles/**/*.{scss,css}'], ['styles', reload]);
  gulp.watch(['app/scripts/**/*.js', 'gulpfile.babel.js'], ['lint']);
  gulp.watch(['app/images/**/*'], reload);
});

gulp.task('serve:dist', ['default'], () =>
  browserSync({
    notify: false,
    // scrollElementMapping: ['main', '.mdl-layout'],
    // https: true,
    server: 'dist',
    port: 3001
  })
);

gulp.task('default', ['clean', 'release'], cb =>
  runSequence(
    'styles',
    ['lint', 'html', 'scripts', 'images', 'copy', 'copy:nm'],
    cb
  )
);
