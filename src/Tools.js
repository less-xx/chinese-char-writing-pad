"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Tools = (function () {
    function Tools() {
    }
    Tools.pHash = function (img) {
        var size = 32, smallerSize = 8;
        var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
        document.body.appendChild(canvas);
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        var im = ctx.getImageData(0, 0, size, size);
        var vals = new Float64Array(size * size);
        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                var base = 4 * (size * i + j);
                vals[size * i + j] = 0.299 * im.data[base] +
                    0.587 * im.data[base + 1] +
                    0.114 * im.data[base + 2];
            }
        }
        function applyDCT2(N, f) {
            var c = new Float64Array(N);
            for (var i = 1; i < N; i++)
                c[i] = 1;
            c[0] = 1 / Math.sqrt(2);
            var F = new Float64Array(N * N);
            var entries = (2 * N) * (N - 1);
            var COS = new Float64Array(entries);
            for (var i = 0; i < entries; i++)
                COS[i] = Math.cos(i / (2 * N) * Math.PI);
            for (var u = 0; u < N; u++) {
                for (var v = 0; v < N; v++) {
                    var sum = 0;
                    for (var i = 0; i < N; i++) {
                        for (var j = 0; j < N; j++) {
                            sum += COS[(2 * i + 1) * u]
                                * COS[(2 * j + 1) * v]
                                * f[N * i + j];
                        }
                    }
                    sum *= ((c[u] * c[v]) / 4);
                    F[N * u + v] = sum;
                }
            }
            return F;
        }
        var dctVals = applyDCT2(size, vals);
        var vals1 = [];
        for (var x = 1; x <= smallerSize; x++) {
            for (var y = 1; y <= smallerSize; y++) {
                vals1.push(dctVals[size * x + y]);
            }
        }
        var median = vals1.slice(0).sort(function (a, b) {
            return a - b;
        })[Math.floor(vals1.length / 2)];
        var result = "";
        var binStrArray = ["", "", "", "", "", "", "", ""];
        for (var i = 0; i < vals1.length; i++) {
            var n = Math.floor(i / 8);
            binStrArray[n] = binStrArray[n] + (vals1[i] > median ? '1' : '0');
        }
        binStrArray.forEach(function (str) {
            var hex = ('0' + (parseInt(str, 2) & 0xFF).toString(16)).slice(-2);
            result += hex;
        });
        return result;
    };
    Tools.distance = function (phash1, phash2) {
        var LEN = 16;
        if (phash1 == null || phash2 == null) {
            return 1;
        }
        if (phash1.length != LEN || phash2.length != LEN) {
            console.log("Invalid pHash string length.");
            return 1;
        }
        var dist = 0;
        for (var i = 0; i < LEN; i += 2) {
            var p1 = parseInt(phash1.slice(i, i + 2), 16).toString(2);
            var p2 = parseInt(phash2.slice(i, i + 2), 16).toString(2);
            for (var j = 0; j < p1.length; j++) {
                if (p1[j] != p2[j]) {
                    dist++;
                }
            }
        }
        return dist;
    };
    Tools.similarity = function (phash1, phash2) {
        var dist = Tools.distance(phash1, phash2);
        console.log("distance from phash1 (" + phash1 + ") to phash2 (" + phash2 + ") is " + dist);
        return 1 - dist / 64.0;
    };
    return Tools;
}());
exports.Tools = Tools;
//# sourceMappingURL=Tools.js.map