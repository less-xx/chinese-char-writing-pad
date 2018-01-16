(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.WritingPad = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Tools_1 = require("./Tools");
exports.Tools = Tools_1.Tools;
function devicePixelRatio() {
    return (('devicePixelRatio' in window) && (window.devicePixelRatio > 1)) ? window.devicePixelRatio : 1;
}
var Pad = (function () {
    function Pad(canvas) {
        var _this = this;
        this._showGrid = true;
        this._gridStyle = "rgba(200, 100, 100, 0.4)";
        this._gridWidth = 6.0;
        this._char = "";
        this._showCharacter = true;
        this._showCharOutline = false;
        this._fontFamily = "Lucida Grande, Lucida Sans Unicode, Hiragino Sans GB, WenQuanYi Micro Hei, Verdana, Aril, sans-serif";
        this._writable = true;
        this._translate = new Point(0, 0);
        this._isMouseDown = false;
        this._p1 = null;
        this._segments = [];
        this._currentWritingSegment = null;
        this._lineWidth = 16.0;
        this.didEndDrawSegment = function (data) { };
        this._canvas = canvas;
        this._canvas.style.cursor = "pointer";
        this._canvas.width = this._canvas.clientWidth * devicePixelRatio();
        this._canvas.height = this._canvas.clientHeight * devicePixelRatio();
        this._canvas.focus();
        this._context = this._canvas.getContext("2d");
        var fontSize = this.calculateFontSize();
        this._lineWidth = Math.floor(fontSize / 25.0);
        this._mouseDownHandler = function (e) { _this.mouseDown(e); };
        this._mouseMoveHandler = function (e) { _this.mouseMove(e); };
        this._mouseUpHandler = function (e) { _this.mouseUp(e); };
        this._canvas.addEventListener("mousedown", this._mouseDownHandler, false);
        this._canvas.addEventListener("mousemove", this._mouseMoveHandler, false);
        this._canvas.addEventListener("mouseup", this._mouseUpHandler, false);
        this.draw();
    }
    Object.defineProperty(Pad.prototype, "character", {
        get: function () {
            return this._char;
        },
        set: function (character) {
            this._char = character;
            this.draw();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pad.prototype, "showCharOutline", {
        get: function () {
            return this._showCharOutline;
        },
        set: function (show) {
            this._showCharOutline = show;
            this.draw();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pad.prototype, "showChar", {
        get: function () {
            return this._showCharacter;
        },
        set: function (show) {
            this._showCharacter = show;
            this.draw();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pad.prototype, "writable", {
        get: function () {
            return this._writable;
        },
        set: function (writable) {
            this._writable = writable;
            if (writable) {
                this._canvas.style.cursor = "pointer";
            }
            else {
                this._canvas.style.cursor = "not-allowed";
            }
        },
        enumerable: true,
        configurable: true
    });
    Pad.prototype.calculateFontSize = function () {
        return Math.floor(this._canvas.width * 0.7);
    };
    Pad.prototype.drawGrid = function () {
        this._context.save();
        this._context.lineWidth = this._gridWidth;
        this._context.strokeStyle = this._gridStyle;
        var offset = this._gridWidth;
        this._context.strokeRect(offset / 2, offset / 2, this._canvas.width - offset, this._canvas.height - offset);
        this._context.setLineDash([10, 4]);
        this._context.beginPath();
        this._context.moveTo(offset / 2, offset / 2);
        this._context.lineTo(offset / 2 + this._canvas.width - offset, offset / 2 + this._canvas.height - offset);
        this._context.moveTo(offset / 2 + (this._canvas.width - offset) / 2, offset / 2);
        this._context.lineTo(offset / 2 + (this._canvas.width - offset) / 2, offset / 2 + this._canvas.height - offset);
        this._context.moveTo(offset / 2 + (this._canvas.width - offset), offset / 2);
        this._context.lineTo(offset / 2, offset / 2 + this._canvas.height - offset);
        this._context.moveTo(offset / 2, offset / 2 + (this._canvas.height - offset) / 2);
        this._context.lineTo(offset / 2 + this._canvas.width - offset, offset / 2 + (this._canvas.height - offset) / 2);
        this._context.stroke();
        this._context.restore();
    };
    Pad.prototype.drawCharacter = function () {
        this._context.save();
        this._context.textAlign = "center";
        this._context.textBaseline = "middle";
        var fontSize = this.calculateFontSize();
        this._lineWidth = Math.floor(fontSize / 20.0);
        this._context.font = fontSize + "px " + this._fontFamily;
        if (this._showCharOutline) {
            this._context.strokeStyle = "rgba(100, 100, 100, 0.8)";
            this._context.strokeText(this._char, this._canvas.width / 2, this._canvas.height / 2);
        }
        else {
            this._context.fillStyle = "rgba(100, 100, 100, 0.9)";
            this._context.fillText(this._char, this._canvas.width / 2, this._canvas.height / 2);
        }
        this._context.restore();
    };
    Pad.prototype.drawMyWriting = function () {
        var _this = this;
        this._context.save();
        this._context.lineWidth = this._lineWidth;
        console.log("line width: " + this._lineWidth);
        this._context.lineCap = "round";
        this._context.lineJoin = "round";
        this._segments.forEach(function (seg) {
            _this.drawMyWritingSegment(seg);
        });
        if (this._currentWritingSegment != null) {
            this.drawMyWritingSegment(this._currentWritingSegment);
        }
        this._context.restore();
    };
    Pad.prototype.drawMyWritingSegment = function (segment, stopIndex) {
        if (stopIndex === void 0) { stopIndex = segment.points.length; }
        var points = segment.points;
        if (points.length <= 1) {
            return;
        }
        this._context.beginPath();
        this._context.moveTo(points[0].x, points[0].y);
        for (var i = 1; i < stopIndex; i++) {
            this._context.lineTo(points[i].x, points[i].y);
        }
        this._context.stroke();
    };
    Pad.prototype.playback = function (speedFactor) {
        if (speedFactor === void 0) { speedFactor = 1.0; }
        var segIndex = 0;
        var pad = this;
        var drawSeg = function () {
            if (segIndex >= pad._segments.length) {
                return;
            }
            setTimeout(function () {
                var ptIdx = 0;
                var seg = pad._segments[segIndex++];
                var interval = setInterval(function () {
                    if (ptIdx > seg.points.length) {
                        clearInterval(interval);
                        drawSeg();
                        return;
                    }
                    pad._context.clearRect(0, 0, pad._canvas.width, pad._canvas.height);
                    if (pad._showGrid) {
                        pad.drawGrid();
                    }
                    if (pad._showCharacter) {
                        pad.drawCharacter();
                    }
                    pad._context.save();
                    pad._context.lineWidth = pad._lineWidth;
                    pad._context.lineCap = "round";
                    pad._context.lineJoin = "round";
                    for (var i = 0; i < segIndex - 1; i++) {
                        pad._segments[i].draw(pad._context);
                    }
                    seg.draw(pad._context, ptIdx);
                    pad._context.restore();
                    ptIdx = ptIdx + 1;
                }, 50 / speedFactor);
            }, 500 / speedFactor);
        };
        drawSeg();
    };
    Pad.prototype.draw = function () {
        this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
        if (this._showGrid) {
            this.drawGrid();
        }
        if (this._showCharacter) {
            this.drawCharacter();
        }
        this.drawMyWriting();
    };
    Pad.prototype.mousePoint = function (e) {
        var p = new Point(e.pageX, e.pageY);
        var node = this._canvas;
        while (node != null) {
            p.x -= node.offsetLeft;
            p.y -= node.offsetTop;
            node = node.offsetParent;
        }
        var dpr = devicePixelRatio();
        p.x = p.x * dpr;
        p.y = p.y * dpr;
        p.translate(-this._translate.x, -this._translate.y);
        return p;
    };
    Pad.prototype.mouseDown = function (e) {
        if (!this._writable) {
            return;
        }
        this._isMouseDown = true;
        this._p1 = this.mousePoint(e);
        this._currentWritingSegment = new CharSegment();
        this._currentWritingSegment.points.push(this._p1);
        this.draw();
    };
    Pad.prototype.mouseUp = function (e) {
        var _this = this;
        if (!this._writable) {
            return;
        }
        this._isMouseDown = false;
        if (this._currentWritingSegment.points.length > 1) {
            this._segments.push(this._currentWritingSegment);
        }
        else {
            return;
        }
        this._currentWritingSegment = null;
        this.getSegmentPHash(this._segments[this._segments.length - 1], function (pHash) {
            _this._segments[_this._segments.length - 1].phash = pHash;
            var data = _this.toJsonObj();
            _this.didEndDrawSegment(data);
        });
        this.draw();
    };
    Pad.prototype.mouseMove = function (e) {
        if (!this._writable) {
            return;
        }
        e.preventDefault();
        if (this._isMouseDown) {
            var p2 = this.mousePoint(e);
            if (Math.abs(p2.x - this._p1.x) > Pad.MIN_POINT_DIST || Math.abs(p2.y - this._p1.y) > Pad.MIN_POINT_DIST) {
                this._currentWritingSegment.points.push(p2);
                this.draw();
                this._p1 = p2;
            }
        }
    };
    Pad.prototype.undo = function () {
        if (this._segments.length > 0) {
            this._segments.pop();
            this.draw();
        }
    };
    Pad.prototype.toJsonObj = function () {
        return {
            char: this._char,
            size: { width: this._canvas.clientWidth, height: this._canvas.clientWidth },
            lineWidth: this._lineWidth,
            segments: this._segments.map(function (seg) {
                return seg.toJsonObj();
            })
        };
    };
    Pad.prototype.getCharImage = function () {
        return this._canvas.toDataURL('image/png');
    };
    Pad.prototype.getStrokeImages = function () {
        var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
        canvas.width = this._canvas.width;
        canvas.height = this._canvas.height;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "black";
        ctx.lineWidth = this._lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        var idx = 0;
        var images = this._segments.map(function (seg) {
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            seg.draw(ctx);
            var img = new Image();
            img.width = canvas.width / devicePixelRatio();
            img.height = canvas.height / devicePixelRatio();
            var data = canvas.toDataURL('image/png');
            img.src = data;
            console.log("Created stroke image " + idx++ + ", size: " + img.width + ", " + img.height);
            return img;
        });
        return images;
    };
    Pad.prototype.setJsonObj = function (jsonObj) {
        this._char = jsonObj['char'];
        var width = jsonObj['size']['width'];
        var height = jsonObj['size']['height'];
        var scaleX = this._canvas.clientWidth / width;
        var scaleY = this._canvas.clientHeight / height;
        this._lineWidth = Math.floor(jsonObj['lineWidth'] * scaleX);
        this._segments = jsonObj['segments'].map(function (seg) {
            return CharSegment.fromJsonObj(seg, scaleX, scaleY);
        });
        this.draw();
    };
    Pad.prototype.getSegmentPHash = function (seg, callback) {
        var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
        canvas.width = this._canvas.width;
        canvas.height = this._canvas.height;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "black";
        ctx.lineWidth = this._lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        var idx = 0;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        seg.draw(ctx);
        var img = new Image();
        img.width = canvas.width / devicePixelRatio();
        img.height = canvas.height / devicePixelRatio();
        var data = canvas.toDataURL('image/png');
        img.src = data;
        img.onload = function () {
            callback(Tools_1.Tools.pHash(img));
        };
    };
    Pad.MIN_POINT_DIST = 5;
    return Pad;
}());
exports.Pad = Pad;
var Point = (function () {
    function Point(x, y) {
        this.x = x;
        this.y = y;
    }
    Point.prototype.translate = function (x, y) {
        this.x = this.x + x;
        this.y = this.y + y;
    };
    Point.prototype.toJsonObj = function () {
        var dpr = devicePixelRatio();
        return [
            this.x / dpr, this.y / dpr
        ];
    };
    Point.fromJsonObj = function (jsonObj, scaleX, scaleY) {
        if (scaleX === void 0) { scaleX = 1.0; }
        if (scaleY === void 0) { scaleY = 1.0; }
        var dpr = devicePixelRatio();
        var x = jsonObj[0] * dpr * scaleX;
        var y = jsonObj[1] * dpr * scaleY;
        return new Point(x, y);
    };
    return Point;
}());
exports.Point = Point;
var CharSegment = (function () {
    function CharSegment() {
        this.points = [];
    }
    Object.defineProperty(CharSegment.prototype, "pHash", {
        get: function () {
            return this.phash;
        },
        set: function (value) {
            this.phash = value;
        },
        enumerable: true,
        configurable: true
    });
    CharSegment.prototype.draw = function (context, stopPointIdx) {
        if (stopPointIdx === void 0) { stopPointIdx = this.points.length; }
        if (this.points.length <= 1) {
            return;
        }
        context.beginPath();
        context.moveTo(this.points[0].x, this.points[0].y);
        for (var i = 1; i < stopPointIdx; i++) {
            context.lineTo(this.points[i].x, this.points[i].y);
        }
        context.stroke();
    };
    CharSegment.prototype.toJsonObj = function () {
        var path = polyline.encode(this.points.map(function (p) {
            return p.toJsonObj();
        }));
        return {
            path: path,
            phash: this.phash
        };
    };
    CharSegment.fromJsonObj = function (jsonObj, scaleX, scaleY) {
        if (scaleX === void 0) { scaleX = 1.0; }
        if (scaleY === void 0) { scaleY = 1.0; }
        var seg = new CharSegment();
        seg.points = polyline.decode(jsonObj.path).map(function (p) {
            return Point.fromJsonObj(p, scaleX, scaleY);
        });
        seg.phash = jsonObj.phash;
        return seg;
    };
    return CharSegment;
}());
exports.CharSegment = CharSegment;

},{"./Tools":1}]},{},[2])(2)
});