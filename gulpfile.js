var gulp   = require('gulp');
var clean  = require('gulp-clean');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');;
var rename = require('gulp-rename')
var header = require('gulp-header');


var pkg = require('./package.json');
var banner = [
  '/**',
  ' * <%= pkg.name %> v<%= pkg.version %>',
  ' * @author: <%= pkg.author.name %>, <%= pkg.author.dept %>',
  ' * @license: <%= pkg.license %>',
  ' */',
  ''
].join('\n');


gulp.task('clean', function () {
  return gulp.src('./dist', { read: false })
    .pipe(clean());
});


gulp.task('jshint', function () {
  return gulp.src('./src/regionflow.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});


gulp.task('dist', ['clean', 'jshint'], function () {
  return gulp.src('./src/regionflow.js')
    .pipe(header(banner, { pkg: pkg }))
    .pipe(gulp.dest('./dist'));
});


gulp.task('minify', ['dist'], function () {
  gulp.src('./dist/regionflow.js')
    .pipe(uglify())
    .pipe(header(banner, { pkg: pkg }))
    .pipe(rename('regionflow-min.js'))
    .pipe(gulp.dest('./dist'));
});


gulp.task('default', ['minify']);
