var del = require('del');
var gulp = require("gulp");
var open = require('gulp-open');
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");

var comments = ['/*!', '* <%= pkg.name %> - <%= pkg.description %>', '* @version <%= pkg.version %>', '*/;', ''].join('\n')

gulp.task("build", ["clean", "build:page", "build:code"], function () {});

gulp.task('clean', function () {
    return del(['dist/*']);
})

gulp.task("build:code", function () {
    return tsProject.src()
        .pipe(tsProject())
        .js.pipe(gulp.dest("dist"));
});

gulp.task("build:page", function () {
    return gulp.src(["./samples/**/*",
            "./node_modules/@mapbox/polyline/src/polyline.js"
        ])
        .pipe(gulp.dest("./dist"))
});

gulp.task("default", ["build"], function () {
    return gulp.src("./dist/index.html")
        .pipe(open());
});