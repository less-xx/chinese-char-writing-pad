module CharWritingPad {

    declare interface ObjectConstructor {
        assign(...objects: Object[]): Object;
    }

    /**
         * Get device pixel ratio
         */
    function devicePixelRatio(): number {
        return (('devicePixelRatio' in window) && (window.devicePixelRatio > 1)) ? window.devicePixelRatio : 1;
        //return 1;
    }

    export class Pad {
        static readonly MIN_POINT_DIST = 5;
        private _canvas: HTMLCanvasElement;
        private _context: CanvasRenderingContext2D;
        private _showGrid = true;
        private _gridStyle = "rgba(200, 100, 100, 0.4)";
        private _gridWidth = 6.0;
        private _char = "";
        private _showCharacter = true;
        private _showCharOutline = false;
        //private _fontFamily = "KaiTi, STKaiti, KaiTi_GB2312, Hiragino Sans GB, Microsoft YaHei";
        private _fontFamily = "Lucida Grande, Lucida Sans Unicode, Hiragino Sans GB, WenQuanYi Micro Hei, Verdana, Aril, sans-serif";
        private _writable = true;
        private _translate: Point = new Point(0, 0);
        private _isMouseDown = false;
        private _p1: Point = null;
        private _segments: CharSegment[] = [];
        private _currentWritingSegment: CharSegment = null;
        private _lineWidth = 16.0;

        private _mouseDownHandler: (e: MouseEvent) => void;
        private _mouseMoveHandler: (e: MouseEvent) => void;
        private _mouseUpHandler: (e: MouseEvent) => void;
        public didEndDrawSegment: (data: any) => void = function (data) { };


        constructor(canvas: HTMLCanvasElement) {

            this._canvas = canvas;
            this._canvas.width = this._canvas.clientWidth * devicePixelRatio();
            this._canvas.height = this._canvas.clientHeight * devicePixelRatio();
            this._canvas.focus();
            this._context = this._canvas.getContext("2d");

            this._mouseDownHandler = (e: MouseEvent) => { this.mouseDown(e); };
            this._mouseMoveHandler = (e: MouseEvent) => { this.mouseMove(e); };
            this._mouseUpHandler = (e: MouseEvent) => { this.mouseUp(e); };
            this._canvas.addEventListener("mousedown", this._mouseDownHandler, false);
            this._canvas.addEventListener("mousemove", this._mouseMoveHandler, false);
            this._canvas.addEventListener("mouseup", this._mouseUpHandler, false);
            this.draw();
        }

        public set character(character: string) {
            this._char = character;
            this.draw();
        }

        public get character(): string {
            return this._char;
        }

        public set showCharOutline(show: boolean) {
            this._showCharOutline = show;
            this.draw();
        }

        public get showCharOutline(): boolean {
            return this._showCharOutline;
        }

        public set showChar(show: boolean) {
            this._showCharacter = show;
            this.draw();
        }

        public get showChar(): boolean {
            return this._showCharacter;
        }

        private calculateFontSize(): number {
            return Math.floor(this._canvas.width * 0.7);
        }

        private drawGrid() {
            this._context.save();
            //this._context.moveTo(this._gridWidth, this._gridWidth);
            this._context.lineWidth = this._gridWidth;
            this._context.strokeStyle = this._gridStyle;
            let offset = this._gridWidth;
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

            //console.log("draw grid done.")
        }

        private drawCharacter() {
            this._context.save();
            this._context.textAlign = "center";
            this._context.textBaseline = "middle";
            let fontSize = this.calculateFontSize();
            //console.log(`font size: ${fontSize}`);
            this._lineWidth = Math.floor(fontSize / 26.0);
            this._context.font = fontSize + "px " + this._fontFamily;

            if (this._showCharOutline) {
                this._context.strokeStyle = "rgba(100, 100, 100, 0.8)";
                this._context.strokeText(this._char, this._canvas.width / 2, this._canvas.height / 2);
            } else {
                this._context.fillStyle = "rgba(100, 100, 100, 0.9)";
                this._context.fillText(this._char, this._canvas.width / 2, this._canvas.height / 2);
            }

            //console.log(`Draw character ${this._char} done. font: ${this._context.font}`)
            this._context.restore();
        }

        private drawMyWriting() {
            this._context.save();
            this._context.lineWidth = this._lineWidth;
            console.log(`line width: ${this._lineWidth}`);
            this._context.lineCap = "round";
            this._context.lineJoin = "round";
            //this._context.beginPath();

            this._segments.forEach((seg) => {
                this.drawMyWritingSegment(seg);
            });
            if (this._currentWritingSegment != null) {
                this.drawMyWritingSegment(this._currentWritingSegment);
            }
            //this._context.stroke();
            this._context.restore();
            //console.log(`Draw my writing ${this._segments.length} segments done.`)
        }
        
        private drawMyWritingSegment(segment: CharSegment, stopIndex: number = segment.points.length) {
            let points = segment.points;
            if (points.length <= 1) {
                return;
            }
            this._context.beginPath();
            this._context.moveTo(points[0].x, points[0].y);
            for (var i = 1; i < stopIndex; i++) {
                this._context.lineTo(points[i].x, points[i].y);
            }
            this._context.stroke();
        }

        public playback() {
            let segIndex = 0;
            let pad = this;
            let drawSeg = function () {
                if (segIndex >= pad._segments.length) {
                    return;
                }
                setTimeout(function () {
                    let ptIdx = 0;
                    let seg = pad._segments[segIndex++];
                    //console.log(`=== will draw segment ${segIndex}`);
                    let interval = setInterval(function () {
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
                        for(var i=0; i<segIndex-1; i++){
                            pad._segments[i].draw(pad._context);
                        }
                        seg.draw(pad._context, ptIdx);
                        //console.log(`== draw segment ${segIndex}, to points ${ptIdx}`);
                        pad._context.restore();
                        ptIdx = ptIdx + 1;
                    }, 30);
                }, 500);
            }
            drawSeg();
        }


        draw() {
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
        }

        private mousePoint(e: MouseEvent): Point {
            var p = new Point(e.pageX, e.pageY);
            var node: HTMLElement = this._canvas;
            while (node != null) {
                p.x -= node.offsetLeft;
                p.y -= node.offsetTop;
                node = <HTMLElement>node.offsetParent;
            }
            let dpr = devicePixelRatio();
            p.x = p.x * dpr;
            p.y = p.y * dpr;
            p.translate(-this._translate.x, -this._translate.y);
            return p;
        }

        private mouseDown(e: MouseEvent) {
            this._isMouseDown = true;
            this._p1 = this.mousePoint(e);
            this._currentWritingSegment = new CharSegment();
            this._currentWritingSegment.points.push(this._p1);
            //console.log(this._p1)
            this.draw();
        }

        private mouseUp(e: MouseEvent) {
            this._isMouseDown = false;
            if (this._currentWritingSegment.points.length > 1) {
                this._segments.push(this._currentWritingSegment);
            }
            this._currentWritingSegment = null;
            this.draw();
            let data = this.toJsonObj();
            this.didEndDrawSegment(data);
        }

        private mouseMove(e: MouseEvent) {
            e.preventDefault();
            if (this._isMouseDown) {
                var p2 = this.mousePoint(e);
                if (Math.abs(p2.x - this._p1.x) > Pad.MIN_POINT_DIST || Math.abs(p2.y - this._p1.y) > Pad.MIN_POINT_DIST) {
                    this._currentWritingSegment.points.push(p2);
                    this.draw();
                    this._p1 = p2;
                }
            }
        }

        public undo() {
            if (this._segments.length > 0) {
                this._segments.pop();
                this.draw();
            }
        }

        public toJsonObj(): any {
            return {
                char: this._char,
                size: { width: this._canvas.clientWidth, height: this._canvas.clientWidth },
                lineWidth: this._lineWidth,
                segments: this._segments.map((seg) => {
                    return seg.toString();
                })
            };
        }

        public getCharImage(): any {
            return this._canvas.toDataURL('image/png');
        }

        public setJsonObj(jsonObj: any) {
            this._char = jsonObj['char'];
            this._lineWidth = jsonObj['lineWidth'];
            let width = jsonObj['size']['width'];
            let height = jsonObj['size']['height'];
            let scaleX = this._canvas.clientWidth / width;
            let scaleY = this._canvas.clientHeight / height;
            this._segments = jsonObj['segments'].map((seg: string) => {
                return CharSegment.fromJsonObj(seg, scaleX, scaleY);
            });
            this.draw();
        }
    }

    export class Point {
        public x: number;
        public y: number;

        constructor(x: number, y: number) {
            this.x = x;
            this.y = y;
        }

        public translate(x: number, y: number) {
            this.x = this.x + x;
            this.y = this.y + y;
        }

        public toJsonObj(): any {
            let dpr = devicePixelRatio();
            return [
                this.x / dpr, this.y / dpr
            ]
        }

        public static fromJsonObj(jsonObj: any, scaleX: number = 1.0, scaleY: number = 1.0): Point {
            let dpr = devicePixelRatio();
            let x = jsonObj[0] * dpr * scaleX;
            let y = jsonObj[1] * dpr * scaleY;
            return new Point(x, y);
        }
    }

    export class CharSegment {
        public points: Point[];

        constructor() {
            this.points = [];
        }

        public draw(context: CanvasRenderingContext2D, stopPointIdx = this.points.length) {
            if (this.points.length <= 1) {
                return;
            }
            context.beginPath();
            context.moveTo(this.points[0].x, this.points[0].y);
            for (var i = 1; i < stopPointIdx; i++) {
                context.lineTo(this.points[i].x, this.points[i].y);
            }
            context.stroke();
        }

        public toJsonObj(): any {
            return this.points.map((p) => {
                return p.toJsonObj();
            });
        }

        public toString(): string {
            let jsonObj = this.toJsonObj();
            return polyline.encode(jsonObj);
        }

        public static fromJsonObj(encodedStr: string, scaleX: number = 1.0, scaleY: number = 1.0): CharSegment {
            let seg = new CharSegment();
            seg.points = polyline.decode(encodedStr).map((p) => {
                return Point.fromJsonObj(p, scaleX, scaleY);
            });
            return seg;
        }

    }
}