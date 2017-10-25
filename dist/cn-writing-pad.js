var CharWritingPad;
(function (CharWritingPad) {
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
            this._canvas.width = this._canvas.clientWidth * devicePixelRatio();
            this._canvas.height = this._canvas.clientHeight * devicePixelRatio();
            this._canvas.focus();
            this._context = this._canvas.getContext("2d");
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
            this._lineWidth = Math.floor(fontSize / 26.0);
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
        Pad.prototype.playback = function () {
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
                        if (ptIdx >= seg.points.length) {
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
                    }, 30);
                }, 500);
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
            if (this._writable) {
                this.drawMyWriting();
            }
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
            this._isMouseDown = true;
            this._p1 = this.mousePoint(e);
            this._currentWritingSegment = new CharSegment();
            this._currentWritingSegment.points.push(this._p1);
            this.draw();
        };
        Pad.prototype.mouseUp = function (e) {
            this._isMouseDown = false;
            if (this._currentWritingSegment.points.length > 1) {
                this._segments.push(this._currentWritingSegment);
            }
            this._currentWritingSegment = null;
            this.draw();
            var data = this.toJsonObj();
            this.didEndDrawSegment(data);
        };
        Pad.prototype.mouseMove = function (e) {
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
                    return seg.toString();
                })
            };
        };
        Pad.prototype.getCharImage = function () {
            return this._canvas.toDataURL('image/png');
        };
        Pad.prototype.setJsonObj = function (jsonObj) {
            this._char = jsonObj['char'];
            this._lineWidth = jsonObj['lineWidth'];
            var width = jsonObj['size']['width'];
            var height = jsonObj['size']['height'];
            var scaleX = this._canvas.clientWidth / width;
            var scaleY = this._canvas.clientHeight / height;
            this._segments = jsonObj['segments'].map(function (seg) {
                return CharSegment.fromJsonObj(seg, scaleX, scaleY);
            });
            this.draw();
        };
        Pad.MIN_POINT_DIST = 5;
        return Pad;
    }());
    CharWritingPad.Pad = Pad;
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
    CharWritingPad.Point = Point;
    var CharSegment = (function () {
        function CharSegment() {
            this.points = [];
        }
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
            return this.points.map(function (p) {
                return p.toJsonObj();
            });
        };
        CharSegment.prototype.toString = function () {
            var jsonObj = this.toJsonObj();
            return polyline.encode(jsonObj);
        };
        CharSegment.fromJsonObj = function (encodedStr, scaleX, scaleY) {
            if (scaleX === void 0) { scaleX = 1.0; }
            if (scaleY === void 0) { scaleY = 1.0; }
            var seg = new CharSegment();
            seg.points = polyline.decode(encodedStr).map(function (p) {
                return Point.fromJsonObj(p, scaleX, scaleY);
            });
            return seg;
        };
        return CharSegment;
    }());
    CharWritingPad.CharSegment = CharSegment;
})(CharWritingPad || (CharWritingPad = {}));
