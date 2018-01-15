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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvVG9vbHMudHMiLCJzcmMvV3JpdGluZ1BhZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDR0E7SUFBQTtJQWlLQSxDQUFDO0lBL0ppQixXQUFLLEdBQW5CLFVBQW9CLEdBQXFCO1FBQ3JDLElBQUksSUFBSSxHQUFHLEVBQUUsRUFDVCxXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBRXBCLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQ3pDLEdBQUcsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWxDLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBUWpDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3JDLElBQUksRUFBRSxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFNNUMsSUFBSSxJQUFJLEdBQUcsSUFBSSxZQUFZLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ3pDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUIsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxH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SUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQztRQUM1RyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxNQUFNLEVBQUUsTUFBTSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQztRQUMxRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNqRixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFDaEgsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FB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QkFBQztBQUFELENBL0NBLEFBK0NDLElBQUE7QUEvQ1ksa0NBQVciLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBQb3J0IGZyb20gaHR0cHM6Ly9naXRodWIuY29tL25hcHRoYS9waGFzaC5qc1xuICovXG5leHBvcnQgY2xhc3MgVG9vbHMge1xuXG4gICAgcHVibGljIHN0YXRpYyBwSGFzaChpbWc6IEhUTUxJbWFnZUVsZW1lbnQpOiBzdHJpbmcge1xuICAgICAgICB2YXIgc2l6ZSA9IDMyLFxuICAgICAgICAgICAgc21hbGxlclNpemUgPSA4O1xuXG4gICAgICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKSxcbiAgICAgICAgICAgIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoY2FudmFzKVxuXG4gICAgICAgIC8qIDEuIFJlZHVjZSBzaXplLiBcbiAgICAgICAgICogTGlrZSBBdmVyYWdlIEhhc2gsIHBIYXNoIHN0YXJ0cyB3aXRoIGEgc21hbGwgaW1hZ2UuIFxuICAgICAgICAgKiBIb3dldmVyLCB0aGUgaW1hZ2UgaXMgbGFyZ2VyIHRoYW4gOHg4OyAzMngzMiBpcyBhIGdvb2Qgc2l6ZS4gXG4gICAgICAgICAqIFRoaXMgaXMgcmVhbGx5IGRvbmUgdG8gc2ltcGxpZnkgdGhlIERDVCBjb21wdXRhdGlvbiBhbmQgbm90IFxuICAgICAgICAgKiBiZWNhdXNlIGl0IGlzIG5lZWRlZCB0byByZWR1Y2UgdGhlIGhpZ2ggZnJlcXVlbmNpZXMuXG4gICAgICAgICAqL1xuICAgICAgICBjYW52YXMud2lkdGggPSBzaXplO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gc2l6ZTtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShpbWcsIDAsIDAsIHNpemUsIHNpemUpO1xuICAgICAgICB2YXIgaW0gPSBjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHNpemUsIHNpemUpO1xuXG4gICAgICAgIC8qIDIuIFJlZHVjZSBjb2xvci4gXG4gICAgICAgICAqIFRoZSBpbWFnZSBpcyByZWR1Y2VkIHRvIGEgZ3JheXNjYWxlIGp1c3QgdG8gZnVydGhlciBzaW1wbGlmeSBcbiAgICAgICAgICogdGhlIG51bWJlciBvZiBjb21wdXRhdGlvbnMuXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgdmFscyA9IG5ldyBGbG9hdDY0QXJyYXkoc2l6ZSAqIHNpemUpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpemU7IGkrKykge1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBzaXplOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgYmFzZSA9IDQgKiAoc2l6ZSAqIGkgKyBqKTtcbiAgICAgICAgICAgICAgICB2YWxzW3NpemUgKiBpICsgal0gPSAwLjI5OSAqIGltLmRhdGFbYmFzZV0gK1xuICAgICAgICAgICAgICAgICAgICAwLjU4NyAqIGltLmRhdGFbYmFzZSArIDFdICtcbiAgICAgICAgICAgICAgICAgICAgMC4xMTQgKiBpbS5kYXRhW2Jhc2UgKyAyXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8qIDMuIENvbXB1dGUgdGhlIERDVC4gXG4gICAgICAgICAqIFRoZSBEQ1Qgc2VwYXJhdGVzIHRoZSBpbWFnZSBpbnRvIGEgY29sbGVjdGlvbiBvZiBmcmVxdWVuY2llcyBcbiAgICAgICAgICogYW5kIHNjYWxhcnMuIFdoaWxlIEpQRUcgdXNlcyBhbiA4eDggRENULCB0aGlzIGFsZ29yaXRobSB1c2VzIFxuICAgICAgICAgKiBhIDMyeDMyIERDVC5cbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGFwcGx5RENUMihOOiBudW1iZXIsIGY6IEZsb2F0NjRBcnJheSkge1xuICAgICAgICAgICAgLy8gaW5pdGlhbGl6ZSBjb2VmZmljaWVudHNcbiAgICAgICAgICAgIHZhciBjID0gbmV3IEZsb2F0NjRBcnJheShOKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgTjsgaSsrKSBjW2ldID0gMTtcbiAgICAgICAgICAgIGNbMF0gPSAxIC8gTWF0aC5zcXJ0KDIpO1xuXG4gICAgICAgICAgICAvLyBvdXRwdXQgZ29lcyBoZXJlXG4gICAgICAgICAgICB2YXIgRiA9IG5ldyBGbG9hdDY0QXJyYXkoTiAqIE4pO1xuXG4gICAgICAgICAgICAvLyBjb25zdHJ1Y3QgYSBsb29rdXAgdGFibGUsIGJlY2F1c2UgaXQncyBPKG5eNClcbiAgICAgICAgICAgIHZhciBlbnRyaWVzID0gKDIgKiBOKSAqIChOIC0gMSk7XG4gICAgICAgICAgICB2YXIgQ09TID0gbmV3IEZsb2F0NjRBcnJheShlbnRyaWVzKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZW50cmllczsgaSsrKVxuICAgICAgICAgICAgICAgIENPU1tpXSA9IE1hdGguY29zKGkgLyAoMiAqIE4pICogTWF0aC5QSSk7XG5cbiAgICAgICAgICAgIC8vIHRoZSBjb3JlIGxvb3AgaW5zaWRlIGEgbG9vcCBpbnNpZGUgYSBsb29wLi4uXG4gICAgICAgICAgICBmb3IgKHZhciB1ID0gMDsgdSA8IE47IHUrKykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHYgPSAwOyB2IDwgTjsgdisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzdW0gPSAwO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IE47IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBOOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdW0gKz0gQ09TWygyICogaSArIDEpICogdV1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBDT1NbKDIgKiBqICsgMSkgKiB2XVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIGZbTiAqIGkgKyBqXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzdW0gKj0gKChjW3VdICogY1t2XSkgLyA0KTtcbiAgICAgICAgICAgICAgICAgICAgRltOICogdSArIHZdID0gc3VtO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBGXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZGN0VmFscyA9IGFwcGx5RENUMihzaXplLCB2YWxzKTtcblxuXG4gICAgICAgIC8qIDQuIFJlZHVjZSB0aGUgRENULiBcbiAgICAgICAgICogVGhpcyBpcyB0aGUgbWFnaWMgc3RlcC4gV2hpbGUgdGhlIERDVCBpcyAzMngzMiwganVzdCBrZWVwIHRoZSBcbiAgICAgICAgICogdG9wLWxlZnQgOHg4LiBUaG9zZSByZXByZXNlbnQgdGhlIGxvd2VzdCBmcmVxdWVuY2llcyBpbiB0aGUgXG4gICAgICAgICAqIHBpY3R1cmUuXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgdmFsczEgPSBbXVxuICAgICAgICBmb3IgKHZhciB4ID0gMTsgeCA8PSBzbWFsbGVyU2l6ZTsgeCsrKSB7XG4gICAgICAgICAgICBmb3IgKHZhciB5ID0gMTsgeSA8PSBzbWFsbGVyU2l6ZTsgeSsrKSB7XG4gICAgICAgICAgICAgICAgdmFsczEucHVzaChkY3RWYWxzW3NpemUgKiB4ICsgeV0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvKiA1LiBDb21wdXRlIHRoZSBhdmVyYWdlIHZhbHVlLiBcbiAgICAgICAgICogTGlrZSB0aGUgQXZlcmFnZSBIYXNoLCBjb21wdXRlIHRoZSBtZWFuIERDVCB2YWx1ZSAodXNpbmcgb25seSBcbiAgICAgICAgICogdGhlIDh4OCBEQ1QgbG93LWZyZXF1ZW5jeSB2YWx1ZXMgYW5kIGV4Y2x1ZGluZyB0aGUgZmlyc3QgdGVybSBcbiAgICAgICAgICogc2luY2UgdGhlIERDIGNvZWZmaWNpZW50IGNhbiBiZSBzaWduaWZpY2FudGx5IGRpZmZlcmVudCBmcm9tIFxuICAgICAgICAgKiB0aGUgb3RoZXIgdmFsdWVzIGFuZCB3aWxsIHRocm93IG9mZiB0aGUgYXZlcmFnZSkuXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgbWVkaWFuID0gdmFsczEuc2xpY2UoMCkuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuIGEgLSBiXG4gICAgICAgIH0pW01hdGguZmxvb3IodmFsczEubGVuZ3RoIC8gMildO1xuXG4gICAgICAgIC8qIDYuIEZ1cnRoZXIgcmVkdWNlIHRoZSBEQ1QuIFxuICAgICAgICAgKiBUaGlzIGlzIHRoZSBtYWdpYyBzdGVwLiBTZXQgdGhlIDY0IGhhc2ggYml0cyB0byAwIG9yIDEgXG4gICAgICAgICAqIGRlcGVuZGluZyBvbiB3aGV0aGVyIGVhY2ggb2YgdGhlIDY0IERDVCB2YWx1ZXMgaXMgYWJvdmUgb3IgXG4gICAgICAgICAqIGJlbG93IHRoZSBhdmVyYWdlIHZhbHVlLiBUaGUgcmVzdWx0IGRvZXNuJ3QgdGVsbCB1cyB0aGUgXG4gICAgICAgICAqIGFjdHVhbCBsb3cgZnJlcXVlbmNpZXM7IGl0IGp1c3QgdGVsbHMgdXMgdGhlIHZlcnktcm91Z2ggXG4gICAgICAgICAqIHJlbGF0aXZlIHNjYWxlIG9mIHRoZSBmcmVxdWVuY2llcyB0byB0aGUgbWVhbi4gVGhlIHJlc3VsdCBcbiAgICAgICAgICogd2lsbCBub3QgdmFyeSBhcyBsb25nIGFzIHRoZSBvdmVyYWxsIHN0cnVjdHVyZSBvZiB0aGUgaW1hZ2UgXG4gICAgICAgICAqIHJlbWFpbnMgdGhlIHNhbWU7IHRoaXMgY2FuIHN1cnZpdmUgZ2FtbWEgYW5kIGNvbG9yIGhpc3RvZ3JhbSBcbiAgICAgICAgICogYWRqdXN0bWVudHMgd2l0aG91dCBhIHByb2JsZW0uXG4gICAgICAgICAqL1xuXG4gICAgICAgIC8qdmFyIHN0ciA9IHZhbHMxLm1hcChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIGUgPiBtZWRpYW4gPyAnMScgOiAnMCc7XG4gICAgICAgIH0pLmpvaW4oJycpO1xuICAgICAgICBjb25zb2xlLmxvZyhzdHIpOyovXG4gICAgICAgIHZhciByZXN1bHQgPSBcIlwiO1xuICAgICAgICB2YXIgYmluU3RyQXJyYXkgPSBbXCJcIiwgXCJcIiwgXCJcIiwgXCJcIiwgXCJcIiwgXCJcIiwgXCJcIiwgXCJcIl07XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsczEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBuID0gTWF0aC5mbG9vcihpIC8gOCk7XG4gICAgICAgICAgICBiaW5TdHJBcnJheVtuXSA9IGJpblN0ckFycmF5W25dICsgKHZhbHMxW2ldID4gbWVkaWFuID8gJzEnIDogJzAnKTtcbiAgICAgICAgfVxuICAgICAgICBiaW5TdHJBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChzdHIpIHtcbiAgICAgICAgICAgIGxldCBoZXggPSAoJzAnICsgKHBhcnNlSW50KHN0ciwgMikgJiAweEZGKS50b1N0cmluZygxNikpLnNsaWNlKC0yKTtcbiAgICAgICAgICAgIHJlc3VsdCArPSBoZXg7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuXG4gICAgLypwdWJsaWMgc3RhdGljIGRpc3RhbmNlKGE6IG51bWJlcltdLCBiOiBudW1iZXJbXSkge1xuICAgICAgICB2YXIgZGlzdCA9IDA7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKylcbiAgICAgICAgICAgIGlmIChhW2ldICE9IGJbaV0pIGRpc3QrKztcbiAgICAgICAgcmV0dXJuIGRpc3Q7XG4gICAgfSovXG4gICAgcHVibGljIHN0YXRpYyBkaXN0YW5jZShwaGFzaDE6IHN0cmluZywgcGhhc2gyOiBzdHJpbmcpOiBudW1iZXIge1xuICAgICAgICBsZXQgTEVOID0gMTY7XG4gICAgICAgIGlmIChwaGFzaDEgPT0gbnVsbCB8fCBwaGFzaDIgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBoYXNoMS5sZW5ndGggIT0gTEVOIHx8IHBoYXNoMi5sZW5ndGggIT0gTEVOKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkludmFsaWQgcEhhc2ggc3RyaW5nIGxlbmd0aC5cIik7XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgZGlzdCA9IDA7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgTEVOOyBpICs9IDIpIHtcbiAgICAgICAgICAgIGxldCBwMSA9IHBhcnNlSW50KHBoYXNoMS5zbGljZShpLCBpICsgMiksIDE2KS50b1N0cmluZygyKTtcbiAgICAgICAgICAgIGxldCBwMiA9IHBhcnNlSW50KHBoYXNoMi5zbGljZShpLCBpICsgMiksIDE2KS50b1N0cmluZygyKTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgcDEubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAocDFbal0gIT0gcDJbal0pIHtcbiAgICAgICAgICAgICAgICAgICAgZGlzdCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGlzdDtcbiAgICB9XG5cbiAgICBwdWJsaWMgc3RhdGljIHNpbWlsYXJpdHkocGhhc2gxOiBzdHJpbmcsIHBoYXNoMjogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgbGV0IGRpc3QgPSBUb29scy5kaXN0YW5jZShwaGFzaDEsIHBoYXNoMik7XG4gICAgICAgIGNvbnNvbGUubG9nKGBkaXN0YW5jZSBmcm9tIHBoYXNoMSAoJHtwaGFzaDF9KSB0byBwaGFzaDIgKCR7cGhhc2gyfSkgaXMgJHtkaXN0fWApO1xuICAgICAgICByZXR1cm4gMSAtIGRpc3QgLyA2NC4wO1xuICAgIH1cbn0iLCJpbXBvcnQge1Rvb2xzfSBmcm9tICcuL1Rvb2xzJ1xuXG5kZWNsYXJlIGludGVyZmFjZSBPYmplY3RDb25zdHJ1Y3RvciB7XG4gICAgYXNzaWduKC4uLm9iamVjdHM6IE9iamVjdFtdKTogT2JqZWN0O1xufVxuXG4vKipcbiAgICAgKiBHZXQgZGV2aWNlIHBpeGVsIHJhdGlvXG4gICAgICovXG5mdW5jdGlvbiBkZXZpY2VQaXhlbFJhdGlvKCk6IG51bWJlciB7XG4gICAgcmV0dXJuICgoJ2RldmljZVBpeGVsUmF0aW8nIGluIHdpbmRvdykgJiYgKHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvID4gMSkpID8gd2luZG93LmRldmljZVBpeGVsUmF0aW8gOiAxO1xuICAgIC8vcmV0dXJuIDE7XG59XG5cbmV4cG9ydCBjbGFzcyBQYWQge1xuICAgIHN0YXRpYyByZWFkb25seSBNSU5fUE9JTlRfRElTVCA9IDU7XG4gICAgcHJpdmF0ZSBfY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudDtcbiAgICBwcml2YXRlIF9jb250ZXh0OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQ7XG4gICAgcHJpdmF0ZSBfc2hvd0dyaWQgPSB0cnVlO1xuICAgIHByaXZhdGUgX2dyaWRTdHlsZSA9IFwicmdiYSgyMDAsIDEwMCwgMTAwLCAwLjQpXCI7XG4gICAgcHJpdmF0ZSBfZ3JpZFdpZHRoID0gNi4wO1xuICAgIHByaXZhdGUgX2NoYXIgPSBcIlwiO1xuICAgIHByaXZhdGUgX3Nob3dDaGFyYWN0ZXIgPSB0cnVlO1xuICAgIHByaXZhdGUgX3Nob3dDaGFyT3V0bGluZSA9IGZhbHNlO1xuICAgIC8vcHJpdmF0ZSBfZm9udEZhbWlseSA9IFwiS2FpVGksIFNUS2FpdGksIEthaVRpX0dCMjMxMiwgSGlyYWdpbm8gU2FucyBHQiwgTWljcm9zb2Z0IFlhSGVpXCI7XG4gICAgcHJpdmF0ZSBfZm9udEZhbWlseSA9IFwiTHVjaWRhIEdyYW5kZSwgTHVjaWRhIFNhbnMgVW5pY29kZSwgSGlyYWdpbm8gU2FucyBHQiwgV2VuUXVhbllpIE1pY3JvIEhlaSwgVmVyZGFuYSwgQXJpbCwgc2Fucy1zZXJpZlwiO1xuICAgIHByaXZhdGUgX3dyaXRhYmxlID0gdHJ1ZTtcbiAgICBwcml2YXRlIF90cmFuc2xhdGU6IFBvaW50ID0gbmV3IFBvaW50KDAsIDApO1xuICAgIHByaXZhdGUgX2lzTW91c2VEb3duID0gZmFsc2U7XG4gICAgcHJpdmF0ZSBfcDE6IFBvaW50ID0gbnVsbDtcbiAgICBwcml2YXRlIF9zZWdtZW50czogQ2hhclNlZ21lbnRbXSA9IFtdO1xuICAgIHByaXZhdGUgX2N1cnJlbnRXcml0aW5nU2VnbWVudDogQ2hhclNlZ21lbnQgPSBudWxsO1xuICAgIHByaXZhdGUgX2xpbmVXaWR0aCA9IDE2LjA7XG5cbiAgICBwcml2YXRlIF9tb3VzZURvd25IYW5kbGVyOiAoZTogTW91c2VFdmVudCkgPT4gdm9pZDtcbiAgICBwcml2YXRlIF9tb3VzZU1vdmVIYW5kbGVyOiAoZTogTW91c2VFdmVudCkgPT4gdm9pZDtcbiAgICBwcml2YXRlIF9tb3VzZVVwSGFuZGxlcjogKGU6IE1vdXNlRXZlbnQpID0+IHZvaWQ7XG4gICAgcHVibGljIGRpZEVuZERyYXdTZWdtZW50OiAoZGF0YTogYW55KSA9PiB2b2lkID0gZnVuY3Rpb24gKGRhdGEpIHsgfTtcblxuXG4gICAgY29uc3RydWN0b3IoY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCkge1xuXG4gICAgICAgIHRoaXMuX2NhbnZhcyA9IGNhbnZhcztcbiAgICAgICAgdGhpcy5fY2FudmFzLnN0eWxlLmN1cnNvciA9IFwicG9pbnRlclwiO1xuICAgICAgICB0aGlzLl9jYW52YXMud2lkdGggPSB0aGlzLl9jYW52YXMuY2xpZW50V2lkdGggKiBkZXZpY2VQaXhlbFJhdGlvKCk7XG4gICAgICAgIHRoaXMuX2NhbnZhcy5oZWlnaHQgPSB0aGlzLl9jYW52YXMuY2xpZW50SGVpZ2h0ICogZGV2aWNlUGl4ZWxSYXRpbygpO1xuICAgICAgICB0aGlzLl9jYW52YXMuZm9jdXMoKTtcbiAgICAgICAgdGhpcy5fY29udGV4dCA9IHRoaXMuX2NhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgICAgIGxldCBmb250U2l6ZSA9IHRoaXMuY2FsY3VsYXRlRm9udFNpemUoKTtcbiAgICAgICAgdGhpcy5fbGluZVdpZHRoID0gTWF0aC5mbG9vcihmb250U2l6ZSAvIDI1LjApO1xuXG4gICAgICAgIHRoaXMuX21vdXNlRG93bkhhbmRsZXIgPSAoZTogTW91c2VFdmVudCkgPT4geyB0aGlzLm1vdXNlRG93bihlKTsgfTtcbiAgICAgICAgdGhpcy5fbW91c2VNb3ZlSGFuZGxlciA9IChlOiBNb3VzZUV2ZW50KSA9PiB7IHRoaXMubW91c2VNb3ZlKGUpOyB9O1xuICAgICAgICB0aGlzLl9tb3VzZVVwSGFuZGxlciA9IChlOiBNb3VzZUV2ZW50KSA9PiB7IHRoaXMubW91c2VVcChlKTsgfTtcbiAgICAgICAgdGhpcy5fY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgdGhpcy5fbW91c2VEb3duSGFuZGxlciwgZmFsc2UpO1xuICAgICAgICB0aGlzLl9jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCB0aGlzLl9tb3VzZU1vdmVIYW5kbGVyLCBmYWxzZSk7XG4gICAgICAgIHRoaXMuX2NhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCB0aGlzLl9tb3VzZVVwSGFuZGxlciwgZmFsc2UpO1xuICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0IGNoYXJhY3RlcihjaGFyYWN0ZXI6IHN0cmluZykge1xuICAgICAgICB0aGlzLl9jaGFyID0gY2hhcmFjdGVyO1xuICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0IGNoYXJhY3RlcigpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2hhcjtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0IHNob3dDaGFyT3V0bGluZShzaG93OiBib29sZWFuKSB7XG4gICAgICAgIHRoaXMuX3Nob3dDaGFyT3V0bGluZSA9IHNob3c7XG4gICAgICAgIHRoaXMuZHJhdygpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXQgc2hvd0NoYXJPdXRsaW5lKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fc2hvd0NoYXJPdXRsaW5lO1xuICAgIH1cblxuICAgIHB1YmxpYyBzZXQgc2hvd0NoYXIoc2hvdzogYm9vbGVhbikge1xuICAgICAgICB0aGlzLl9zaG93Q2hhcmFjdGVyID0gc2hvdztcbiAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldCBzaG93Q2hhcigpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Nob3dDaGFyYWN0ZXI7XG4gICAgfVxuXG4gICAgcHVibGljIGdldCB3cml0YWJsZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3dyaXRhYmxlO1xuICAgIH1cblxuICAgIHB1YmxpYyBzZXQgd3JpdGFibGUod3JpdGFibGU6IGJvb2xlYW4pIHtcbiAgICAgICAgdGhpcy5fd3JpdGFibGUgPSB3cml0YWJsZTtcbiAgICAgICAgaWYgKHdyaXRhYmxlKSB7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuc3R5bGUuY3Vyc29yID0gXCJwb2ludGVyXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9jYW52YXMuc3R5bGUuY3Vyc29yID0gXCJub3QtYWxsb3dlZFwiO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBwcml2YXRlIGNhbGN1bGF0ZUZvbnRTaXplKCk6IG51bWJlciB7XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKHRoaXMuX2NhbnZhcy53aWR0aCAqIDAuNyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBkcmF3R3JpZCgpIHtcbiAgICAgICAgdGhpcy5fY29udGV4dC5zYXZlKCk7XG4gICAgICAgIC8vdGhpcy5fY29udGV4dC5tb3ZlVG8odGhpcy5fZ3JpZFdpZHRoLCB0aGlzLl9ncmlkV2lkdGgpO1xuICAgICAgICB0aGlzLl9jb250ZXh0LmxpbmVXaWR0aCA9IHRoaXMuX2dyaWRXaWR0aDtcbiAgICAgICAgdGhpcy5fY29udGV4dC5zdHJva2VTdHlsZSA9IHRoaXMuX2dyaWRTdHlsZTtcbiAgICAgICAgbGV0IG9mZnNldCA9IHRoaXMuX2dyaWRXaWR0aDtcbiAgICAgICAgdGhpcy5fY29udGV4dC5zdHJva2VSZWN0KG9mZnNldCAvIDIsIG9mZnNldCAvIDIsIHRoaXMuX2NhbnZhcy53aWR0aCAtIG9mZnNldCwgdGhpcy5fY2FudmFzLmhlaWdodCAtIG9mZnNldCk7XG4gICAgICAgIHRoaXMuX2NvbnRleHQuc2V0TGluZURhc2goWzEwLCA0XSk7XG4gICAgICAgIHRoaXMuX2NvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgIHRoaXMuX2NvbnRleHQubW92ZVRvKG9mZnNldCAvIDIsIG9mZnNldCAvIDIpO1xuICAgICAgICB0aGlzLl9jb250ZXh0LmxpbmVUbyhvZmZzZXQgLyAyICsgdGhpcy5fY2FudmFzLndpZHRoIC0gb2Zmc2V0LCBvZmZzZXQgLyAyICsgdGhpcy5fY2FudmFzLmhlaWdodCAtIG9mZnNldCk7XG4gICAgICAgIHRoaXMuX2NvbnRleHQubW92ZVRvKG9mZnNldCAvIDIgKyAodGhpcy5fY2FudmFzLndpZHRoIC0gb2Zmc2V0KSAvIDIsIG9mZnNldCAvIDIpO1xuICAgICAgICB0aGlzLl9jb250ZXh0LmxpbmVUbyhvZmZzZXQgLyAyICsgKHRoaXMuX2NhbnZhcy53aWR0aCAtIG9mZnNldCkgLyAyLCBvZmZzZXQgLyAyICsgdGhpcy5fY2FudmFzLmhlaWdodCAtIG9mZnNldCk7XG4gICAgICAgIHRoaXMuX2NvbnRleHQubW92ZVRvKG9mZnNldCAvIDIgKyAodGhpcy5fY2FudmFzLndpZHRoIC0gb2Zmc2V0KSwgb2Zmc2V0IC8gMik7XG4gICAgICAgIHRoaXMuX2NvbnRleHQubGluZVRvKG9mZnNldCAvIDIsIG9mZnNldCAvIDIgKyB0aGlzLl9jYW52YXMuaGVpZ2h0IC0gb2Zmc2V0KTtcbiAgICAgICAgdGhpcy5fY29udGV4dC5tb3ZlVG8ob2Zmc2V0IC8gMiwgb2Zmc2V0IC8gMiArICh0aGlzLl9jYW52YXMuaGVpZ2h0IC0gb2Zmc2V0KSAvIDIpO1xuICAgICAgICB0aGlzLl9jb250ZXh0LmxpbmVUbyhvZmZzZXQgLyAyICsgdGhpcy5fY2FudmFzLndpZHRoIC0gb2Zmc2V0LCBvZmZzZXQgLyAyICsgKHRoaXMuX2NhbnZhcy5oZWlnaHQgLSBvZmZzZXQpIC8gMik7XG4gICAgICAgIHRoaXMuX2NvbnRleHQuc3Ryb2tlKCk7XG4gICAgICAgIHRoaXMuX2NvbnRleHQucmVzdG9yZSgpO1xuXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJkcmF3IGdyaWQgZG9uZS5cIilcbiAgICB9XG5cbiAgICBwcml2YXRlIGRyYXdDaGFyYWN0ZXIoKSB7XG4gICAgICAgIHRoaXMuX2NvbnRleHQuc2F2ZSgpO1xuICAgICAgICB0aGlzLl9jb250ZXh0LnRleHRBbGlnbiA9IFwiY2VudGVyXCI7XG4gICAgICAgIHRoaXMuX2NvbnRleHQudGV4dEJhc2VsaW5lID0gXCJtaWRkbGVcIjtcbiAgICAgICAgbGV0IGZvbnRTaXplID0gdGhpcy5jYWxjdWxhdGVGb250U2l6ZSgpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKGBmb250IHNpemU6ICR7Zm9udFNpemV9YCk7XG4gICAgICAgIHRoaXMuX2xpbmVXaWR0aCA9IE1hdGguZmxvb3IoZm9udFNpemUgLyAyMC4wKTtcbiAgICAgICAgdGhpcy5fY29udGV4dC5mb250ID0gZm9udFNpemUgKyBcInB4IFwiICsgdGhpcy5fZm9udEZhbWlseTtcblxuICAgICAgICBpZiAodGhpcy5fc2hvd0NoYXJPdXRsaW5lKSB7XG4gICAgICAgICAgICB0aGlzLl9jb250ZXh0LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDEwMCwgMTAwLCAxMDAsIDAuOClcIjtcbiAgICAgICAgICAgIHRoaXMuX2NvbnRleHQuc3Ryb2tlVGV4dCh0aGlzLl9jaGFyLCB0aGlzLl9jYW52YXMud2lkdGggLyAyLCB0aGlzLl9jYW52YXMuaGVpZ2h0IC8gMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9jb250ZXh0LmZpbGxTdHlsZSA9IFwicmdiYSgxMDAsIDEwMCwgMTAwLCAwLjkpXCI7XG4gICAgICAgICAgICB0aGlzLl9jb250ZXh0LmZpbGxUZXh0KHRoaXMuX2NoYXIsIHRoaXMuX2NhbnZhcy53aWR0aCAvIDIsIHRoaXMuX2NhbnZhcy5oZWlnaHQgLyAyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vY29uc29sZS5sb2coYERyYXcgY2hhcmFjdGVyICR7dGhpcy5fY2hhcn0gZG9uZS4gZm9udDogJHt0aGlzLl9jb250ZXh0LmZvbnR9YClcbiAgICAgICAgdGhpcy5fY29udGV4dC5yZXN0b3JlKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBkcmF3TXlXcml0aW5nKCkge1xuICAgICAgICB0aGlzLl9jb250ZXh0LnNhdmUoKTtcbiAgICAgICAgdGhpcy5fY29udGV4dC5saW5lV2lkdGggPSB0aGlzLl9saW5lV2lkdGg7XG4gICAgICAgIGNvbnNvbGUubG9nKGBsaW5lIHdpZHRoOiAke3RoaXMuX2xpbmVXaWR0aH1gKTtcbiAgICAgICAgdGhpcy5fY29udGV4dC5saW5lQ2FwID0gXCJyb3VuZFwiO1xuICAgICAgICB0aGlzLl9jb250ZXh0LmxpbmVKb2luID0gXCJyb3VuZFwiO1xuICAgICAgICAvL3RoaXMuX2NvbnRleHQuYmVnaW5QYXRoKCk7XG5cbiAgICAgICAgdGhpcy5fc2VnbWVudHMuZm9yRWFjaCgoc2VnKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmRyYXdNeVdyaXRpbmdTZWdtZW50KHNlZyk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodGhpcy5fY3VycmVudFdyaXRpbmdTZWdtZW50ICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuZHJhd015V3JpdGluZ1NlZ21lbnQodGhpcy5fY3VycmVudFdyaXRpbmdTZWdtZW50KTtcbiAgICAgICAgfVxuICAgICAgICAvL3RoaXMuX2NvbnRleHQuc3Ryb2tlKCk7XG4gICAgICAgIHRoaXMuX2NvbnRleHQucmVzdG9yZSgpO1xuICAgICAgICAvL2NvbnNvbGUubG9nKGBEcmF3IG15IHdyaXRpbmcgJHt0aGlzLl9zZWdtZW50cy5sZW5ndGh9IHNlZ21lbnRzIGRvbmUuYClcbiAgICB9XG5cbiAgICBwcml2YXRlIGRyYXdNeVdyaXRpbmdTZWdtZW50KHNlZ21lbnQ6IENoYXJTZWdtZW50LCBzdG9wSW5kZXg6IG51bWJlciA9IHNlZ21lbnQucG9pbnRzLmxlbmd0aCkge1xuICAgICAgICBsZXQgcG9pbnRzID0gc2VnbWVudC5wb2ludHM7XG4gICAgICAgIGlmIChwb2ludHMubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9jb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICB0aGlzLl9jb250ZXh0Lm1vdmVUbyhwb2ludHNbMF0ueCwgcG9pbnRzWzBdLnkpO1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IHN0b3BJbmRleDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLl9jb250ZXh0LmxpbmVUbyhwb2ludHNbaV0ueCwgcG9pbnRzW2ldLnkpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2NvbnRleHQuc3Ryb2tlKCk7XG4gICAgfVxuXG4gICAgcHVibGljIHBsYXliYWNrKHNwZWVkRmFjdG9yOiBudW1iZXIgPSAxLjApIHtcbiAgICAgICAgbGV0IHNlZ0luZGV4ID0gMDtcbiAgICAgICAgbGV0IHBhZCA9IHRoaXM7XG4gICAgICAgIGxldCBkcmF3U2VnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHNlZ0luZGV4ID49IHBhZC5fc2VnbWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbGV0IHB0SWR4ID0gMDtcbiAgICAgICAgICAgICAgICBsZXQgc2VnID0gcGFkLl9zZWdtZW50c1tzZWdJbmRleCsrXTtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGA9PT0gd2lsbCBkcmF3IHNlZ21lbnQgJHtzZWdJbmRleH1gKTtcbiAgICAgICAgICAgICAgICBsZXQgaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwdElkeCA+IHNlZy5wb2ludHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRyYXdTZWcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBwYWQuX2NvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHBhZC5fY2FudmFzLndpZHRoLCBwYWQuX2NhbnZhcy5oZWlnaHQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFkLl9zaG93R3JpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFkLmRyYXdHcmlkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAocGFkLl9zaG93Q2hhcmFjdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYWQuZHJhd0NoYXJhY3RlcigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHBhZC5fY29udGV4dC5zYXZlKCk7XG4gICAgICAgICAgICAgICAgICAgIHBhZC5fY29udGV4dC5saW5lV2lkdGggPSBwYWQuX2xpbmVXaWR0aDtcbiAgICAgICAgICAgICAgICAgICAgcGFkLl9jb250ZXh0LmxpbmVDYXAgPSBcInJvdW5kXCI7XG4gICAgICAgICAgICAgICAgICAgIHBhZC5fY29udGV4dC5saW5lSm9pbiA9IFwicm91bmRcIjtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWdJbmRleCAtIDE7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFkLl9zZWdtZW50c1tpXS5kcmF3KHBhZC5fY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc2VnLmRyYXcocGFkLl9jb250ZXh0LCBwdElkeCk7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coYD09IGRyYXcgc2VnbWVudCAke3NlZ0luZGV4fSwgdG8gcG9pbnRzICR7cHRJZHh9YCk7XG4gICAgICAgICAgICAgICAgICAgIHBhZC5fY29udGV4dC5yZXN0b3JlKCk7XG4gICAgICAgICAgICAgICAgICAgIHB0SWR4ID0gcHRJZHggKyAxO1xuICAgICAgICAgICAgICAgIH0sIDUwIC8gc3BlZWRGYWN0b3IpO1xuICAgICAgICAgICAgfSwgNTAwIC8gc3BlZWRGYWN0b3IpO1xuICAgICAgICB9XG4gICAgICAgIGRyYXdTZWcoKTtcbiAgICB9XG5cblxuICAgIGRyYXcoKSB7XG5cbiAgICAgICAgdGhpcy5fY29udGV4dC5jbGVhclJlY3QoMCwgMCwgdGhpcy5fY2FudmFzLndpZHRoLCB0aGlzLl9jYW52YXMuaGVpZ2h0KTtcblxuICAgICAgICBpZiAodGhpcy5fc2hvd0dyaWQpIHtcbiAgICAgICAgICAgIHRoaXMuZHJhd0dyaWQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9zaG93Q2hhcmFjdGVyKSB7XG4gICAgICAgICAgICB0aGlzLmRyYXdDaGFyYWN0ZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZHJhd015V3JpdGluZygpO1xuICAgIH1cblxuICAgIHByaXZhdGUgbW91c2VQb2ludChlOiBNb3VzZUV2ZW50KTogUG9pbnQge1xuICAgICAgICB2YXIgcCA9IG5ldyBQb2ludChlLnBhZ2VYLCBlLnBhZ2VZKTtcbiAgICAgICAgdmFyIG5vZGU6IEhUTUxFbGVtZW50ID0gdGhpcy5fY2FudmFzO1xuICAgICAgICB3aGlsZSAobm9kZSAhPSBudWxsKSB7XG4gICAgICAgICAgICBwLnggLT0gbm9kZS5vZmZzZXRMZWZ0O1xuICAgICAgICAgICAgcC55IC09IG5vZGUub2Zmc2V0VG9wO1xuICAgICAgICAgICAgbm9kZSA9IDxIVE1MRWxlbWVudD5ub2RlLm9mZnNldFBhcmVudDtcbiAgICAgICAgfVxuICAgICAgICBsZXQgZHByID0gZGV2aWNlUGl4ZWxSYXRpbygpO1xuICAgICAgICBwLnggPSBwLnggKiBkcHI7XG4gICAgICAgIHAueSA9IHAueSAqIGRwcjtcbiAgICAgICAgcC50cmFuc2xhdGUoLXRoaXMuX3RyYW5zbGF0ZS54LCAtdGhpcy5fdHJhbnNsYXRlLnkpO1xuICAgICAgICByZXR1cm4gcDtcbiAgICB9XG5cbiAgICBwcml2YXRlIG1vdXNlRG93bihlOiBNb3VzZUV2ZW50KSB7XG4gICAgICAgIGlmICghdGhpcy5fd3JpdGFibGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pc01vdXNlRG93biA9IHRydWU7XG4gICAgICAgIHRoaXMuX3AxID0gdGhpcy5tb3VzZVBvaW50KGUpO1xuICAgICAgICB0aGlzLl9jdXJyZW50V3JpdGluZ1NlZ21lbnQgPSBuZXcgQ2hhclNlZ21lbnQoKTtcbiAgICAgICAgdGhpcy5fY3VycmVudFdyaXRpbmdTZWdtZW50LnBvaW50cy5wdXNoKHRoaXMuX3AxKTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyh0aGlzLl9wMSlcbiAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBtb3VzZVVwKGU6IE1vdXNlRXZlbnQpIHtcbiAgICAgICAgaWYgKCF0aGlzLl93cml0YWJsZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2lzTW91c2VEb3duID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLl9jdXJyZW50V3JpdGluZ1NlZ21lbnQucG9pbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRoaXMuX3NlZ21lbnRzLnB1c2godGhpcy5fY3VycmVudFdyaXRpbmdTZWdtZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9jdXJyZW50V3JpdGluZ1NlZ21lbnQgPSBudWxsO1xuICAgICAgICB0aGlzLmdldFNlZ21lbnRQSGFzaCh0aGlzLl9zZWdtZW50c1t0aGlzLl9zZWdtZW50cy5sZW5ndGggLSAxXSwgKHBIYXNoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9zZWdtZW50c1t0aGlzLl9zZWdtZW50cy5sZW5ndGggLSAxXS5waGFzaCA9IHBIYXNoO1xuICAgICAgICAgICAgbGV0IGRhdGEgPSB0aGlzLnRvSnNvbk9iaigpO1xuICAgICAgICAgICAgdGhpcy5kaWRFbmREcmF3U2VnbWVudChkYXRhKTtcbiAgICAgICAgfSlcblxuICAgICAgICB0aGlzLmRyYXcoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG1vdXNlTW92ZShlOiBNb3VzZUV2ZW50KSB7XG4gICAgICAgIGlmICghdGhpcy5fd3JpdGFibGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGlmICh0aGlzLl9pc01vdXNlRG93bikge1xuICAgICAgICAgICAgdmFyIHAyID0gdGhpcy5tb3VzZVBvaW50KGUpO1xuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHAyLnggLSB0aGlzLl9wMS54KSA+IFBhZC5NSU5fUE9JTlRfRElTVCB8fCBNYXRoLmFicyhwMi55IC0gdGhpcy5fcDEueSkgPiBQYWQuTUlOX1BPSU5UX0RJU1QpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jdXJyZW50V3JpdGluZ1NlZ21lbnQucG9pbnRzLnB1c2gocDIpO1xuICAgICAgICAgICAgICAgIHRoaXMuZHJhdygpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3AxID0gcDI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgdW5kbygpIHtcbiAgICAgICAgaWYgKHRoaXMuX3NlZ21lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuX3NlZ21lbnRzLnBvcCgpO1xuICAgICAgICAgICAgdGhpcy5kcmF3KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgdG9Kc29uT2JqKCk6IGFueSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjaGFyOiB0aGlzLl9jaGFyLFxuICAgICAgICAgICAgc2l6ZTogeyB3aWR0aDogdGhpcy5fY2FudmFzLmNsaWVudFdpZHRoLCBoZWlnaHQ6IHRoaXMuX2NhbnZhcy5jbGllbnRXaWR0aCB9LFxuICAgICAgICAgICAgbGluZVdpZHRoOiB0aGlzLl9saW5lV2lkdGgsXG4gICAgICAgICAgICBzZWdtZW50czogdGhpcy5fc2VnbWVudHMubWFwKChzZWcpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VnLnRvSnNvbk9iaigpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0Q2hhckltYWdlKCk6IGFueSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jYW52YXMudG9EYXRhVVJMKCdpbWFnZS9wbmcnKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0U3Ryb2tlSW1hZ2VzKCk6IEhUTUxJbWFnZUVsZW1lbnRbXSB7XG4gICAgICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKSwgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IHRoaXMuX2NhbnZhcy5oZWlnaHQ7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIndoaXRlXCI7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcImJsYWNrXCI7XG4gICAgICAgIGN0eC5saW5lV2lkdGggPSB0aGlzLl9saW5lV2lkdGg7XG4gICAgICAgIGN0eC5saW5lQ2FwID0gXCJyb3VuZFwiO1xuICAgICAgICBjdHgubGluZUpvaW4gPSBcInJvdW5kXCI7XG4gICAgICAgIGxldCBpZHggPSAwO1xuICAgICAgICBsZXQgaW1hZ2VzID0gdGhpcy5fc2VnbWVudHMubWFwKChzZWcpID0+IHtcbiAgICAgICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgICAgICAgICAgc2VnLmRyYXcoY3R4KTtcbiAgICAgICAgICAgIGxldCBpbWcgPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgICAgIGltZy53aWR0aCA9IGNhbnZhcy53aWR0aCAvIGRldmljZVBpeGVsUmF0aW8oKTtcbiAgICAgICAgICAgIGltZy5oZWlnaHQgPSBjYW52YXMuaGVpZ2h0IC8gZGV2aWNlUGl4ZWxSYXRpbygpO1xuICAgICAgICAgICAgbGV0IGRhdGEgPSBjYW52YXMudG9EYXRhVVJMKCdpbWFnZS9wbmcnKTtcbiAgICAgICAgICAgIGltZy5zcmMgPSBkYXRhO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYENyZWF0ZWQgc3Ryb2tlIGltYWdlICR7aWR4Kyt9LCBzaXplOiAke2ltZy53aWR0aH0sICR7aW1nLmhlaWdodH1gKTtcbiAgICAgICAgICAgIHJldHVybiBpbWc7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaW1hZ2VzO1xuICAgIH1cblxuICAgIHB1YmxpYyBzZXRKc29uT2JqKGpzb25PYmo6IGFueSkge1xuICAgICAgICB0aGlzLl9jaGFyID0ganNvbk9ialsnY2hhciddO1xuICAgICAgICBsZXQgd2lkdGggPSBqc29uT2JqWydzaXplJ11bJ3dpZHRoJ107XG4gICAgICAgIGxldCBoZWlnaHQgPSBqc29uT2JqWydzaXplJ11bJ2hlaWdodCddO1xuICAgICAgICBsZXQgc2NhbGVYID0gdGhpcy5fY2FudmFzLmNsaWVudFdpZHRoIC8gd2lkdGg7XG4gICAgICAgIGxldCBzY2FsZVkgPSB0aGlzLl9jYW52YXMuY2xpZW50SGVpZ2h0IC8gaGVpZ2h0O1xuICAgICAgICB0aGlzLl9saW5lV2lkdGggPSBNYXRoLmZsb29yKGpzb25PYmpbJ2xpbmVXaWR0aCddICogc2NhbGVYKTtcbiAgICAgICAgdGhpcy5fc2VnbWVudHMgPSBqc29uT2JqWydzZWdtZW50cyddLm1hcCgoc2VnOiBhbnkpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBDaGFyU2VnbWVudC5mcm9tSnNvbk9iaihzZWcsIHNjYWxlWCwgc2NhbGVZKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZHJhdygpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRTZWdtZW50UEhhc2goc2VnOiBDaGFyU2VnbWVudCwgY2FsbGJhY2s6IChwSGFzaDogc3RyaW5nKSA9PiB2b2lkKSB7XG4gICAgICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKSwgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IHRoaXMuX2NhbnZhcy5oZWlnaHQ7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIndoaXRlXCI7XG4gICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcImJsYWNrXCI7XG4gICAgICAgIGN0eC5saW5lV2lkdGggPSB0aGlzLl9saW5lV2lkdGg7XG4gICAgICAgIGN0eC5saW5lQ2FwID0gXCJyb3VuZFwiO1xuICAgICAgICBjdHgubGluZUpvaW4gPSBcInJvdW5kXCI7XG4gICAgICAgIGxldCBpZHggPSAwO1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgc2VnLmRyYXcoY3R4KTtcbiAgICAgICAgbGV0IGltZyA9IG5ldyBJbWFnZSgpO1xuICAgICAgICBpbWcud2lkdGggPSBjYW52YXMud2lkdGggLyBkZXZpY2VQaXhlbFJhdGlvKCk7XG4gICAgICAgIGltZy5oZWlnaHQgPSBjYW52YXMuaGVpZ2h0IC8gZGV2aWNlUGl4ZWxSYXRpbygpO1xuICAgICAgICBsZXQgZGF0YSA9IGNhbnZhcy50b0RhdGFVUkwoJ2ltYWdlL3BuZycpO1xuICAgICAgICBpbWcuc3JjID0gZGF0YTtcbiAgICAgICAgaW1nLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKFRvb2xzLnBIYXNoKGltZykpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUG9pbnQge1xuICAgIHB1YmxpYyB4OiBudW1iZXI7XG4gICAgcHVibGljIHk6IG51bWJlcjtcblxuICAgIGNvbnN0cnVjdG9yKHg6IG51bWJlciwgeTogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMueCA9IHg7XG4gICAgICAgIHRoaXMueSA9IHk7XG4gICAgfVxuXG4gICAgcHVibGljIHRyYW5zbGF0ZSh4OiBudW1iZXIsIHk6IG51bWJlcikge1xuICAgICAgICB0aGlzLnggPSB0aGlzLnggKyB4O1xuICAgICAgICB0aGlzLnkgPSB0aGlzLnkgKyB5O1xuICAgIH1cblxuICAgIHB1YmxpYyB0b0pzb25PYmooKTogYW55IHtcbiAgICAgICAgbGV0IGRwciA9IGRldmljZVBpeGVsUmF0aW8oKTtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHRoaXMueCAvIGRwciwgdGhpcy55IC8gZHByXG4gICAgICAgIF1cbiAgICB9XG5cbiAgICBwdWJsaWMgc3RhdGljIGZyb21Kc29uT2JqKGpzb25PYmo6IGFueSwgc2NhbGVYOiBudW1iZXIgPSAxLjAsIHNjYWxlWTogbnVtYmVyID0gMS4wKTogUG9pbnQge1xuICAgICAgICBsZXQgZHByID0gZGV2aWNlUGl4ZWxSYXRpbygpO1xuICAgICAgICBsZXQgeCA9IGpzb25PYmpbMF0gKiBkcHIgKiBzY2FsZVg7XG4gICAgICAgIGxldCB5ID0ganNvbk9ialsxXSAqIGRwciAqIHNjYWxlWTtcbiAgICAgICAgcmV0dXJuIG5ldyBQb2ludCh4LCB5KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDaGFyU2VnbWVudCB7XG4gICAgcHVibGljIHBvaW50czogUG9pbnRbXTtcbiAgICBwdWJsaWMgcGhhc2g6IHN0cmluZztcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnBvaW50cyA9IFtdO1xuICAgIH1cblxuICAgIHB1YmxpYyBzZXQgcEhhc2godmFsdWU6IHN0cmluZykge1xuICAgICAgICB0aGlzLnBoYXNoID0gdmFsdWU7XG4gICAgfVxuXG4gICAgcHVibGljIGdldCBwSGFzaCgpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5waGFzaDtcbiAgICB9XG5cbiAgICBwdWJsaWMgZHJhdyhjb250ZXh0OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIHN0b3BQb2ludElkeCA9IHRoaXMucG9pbnRzLmxlbmd0aCkge1xuICAgICAgICBpZiAodGhpcy5wb2ludHMubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICBjb250ZXh0Lm1vdmVUbyh0aGlzLnBvaW50c1swXS54LCB0aGlzLnBvaW50c1swXS55KTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBzdG9wUG9pbnRJZHg7IGkrKykge1xuICAgICAgICAgICAgY29udGV4dC5saW5lVG8odGhpcy5wb2ludHNbaV0ueCwgdGhpcy5wb2ludHNbaV0ueSk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5zdHJva2UoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgdG9Kc29uT2JqKCk6IGFueSB7XG4gICAgICAgIGxldCBwYXRoID0gcG9seWxpbmUuZW5jb2RlKHRoaXMucG9pbnRzLm1hcCgocCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHAudG9Kc29uT2JqKCk7XG4gICAgICAgIH0pKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgICBwaGFzaDogdGhpcy5waGFzaFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHB1YmxpYyBzdGF0aWMgZnJvbUpzb25PYmooanNvbk9iajogYW55LCBzY2FsZVg6IG51bWJlciA9IDEuMCwgc2NhbGVZOiBudW1iZXIgPSAxLjApOiBDaGFyU2VnbWVudCB7XG4gICAgICAgIGxldCBzZWcgPSBuZXcgQ2hhclNlZ21lbnQoKTtcbiAgICAgICAgc2VnLnBvaW50cyA9IHBvbHlsaW5lLmRlY29kZShqc29uT2JqLnBhdGgpLm1hcCgocDphbnkpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBQb2ludC5mcm9tSnNvbk9iaihwLCBzY2FsZVgsIHNjYWxlWSk7XG4gICAgICAgIH0pO1xuICAgICAgICBzZWcucGhhc2ggPSBqc29uT2JqLnBoYXNoO1xuICAgICAgICByZXR1cm4gc2VnO1xuICAgIH1cblxufVxuZXhwb3J0IHtUb29sc307Il19
