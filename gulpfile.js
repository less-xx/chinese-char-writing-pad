var del = require('del');
var gulp = require("gulp");
var open = require('gulp-open');
//var ts = require("gulp-typescript");
//var tsProject = ts.createProject("tsconfig.json");
var browserify = require("browserify");
var source = require('vinyl-source-stream');
var tsify = require("tsify");

var comments = ['/*!', '* <%= pkg.name %> - <%= pkg.description %>', '* @version <%= pkg.version %>', '*/;', ''].join('\n')

gulp.task("build", ["clean", "build:code", "build:page"], function () {});

gulp.task('clean', function () {
    return del(['dist/*']);
})

gulp.task("build:code", function () {
    return browserify({
            basedir: '.',
            standalone: 'WritingPad',
            debug: true,
            entries: ['src/WritingPad.ts'],
            cache: {},
            packageCache: {}
        })
        .plugin(tsify,{
            module: 'commonjs',
            moduleResolution: 'classic'
        })
        .bundle()
        .pipe(source('bundle.js'))
        .pipe(gulp.dest("dist"));
});

gulp.task("build:page", function () {
    gulp.src(["samples/**/*"])
        .pipe(gulp.dest("dist"))
    gulp.src(["node_modules/@mapbox/polyline/src/polyline.js"])
        .pipe(gulp.dest("dist"))
});

gulp.task("default", ["build"], function () {
    return gulp.src("dist/index.html")
        .pipe(open());
});