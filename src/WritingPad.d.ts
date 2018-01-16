import { Tools } from './Tools';
export declare class Pad {
    static readonly MIN_POINT_DIST: number;
    private _canvas;
    private _context;
    private _showGrid;
    private _gridStyle;
    private _gridWidth;
    private _char;
    private _showCharacter;
    private _showCharOutline;
    private _fontFamily;
    private _writable;
    private _translate;
    private _isMouseDown;
    private _p1;
    private _segments;
    private _currentWritingSegment;
    private _lineWidth;
    private _mouseDownHandler;
    private _mouseMoveHandler;
    private _mouseUpHandler;
    didEndDrawSegment: (data: any) => void;
    constructor(canvas: HTMLCanvasElement);
    character: string;
    showCharOutline: boolean;
    showChar: boolean;
    writable: boolean;
    private calculateFontSize();
    private drawGrid();
    private drawCharacter();
    private drawMyWriting();
    private drawMyWritingSegment(segment, stopIndex?);
    playback(speedFactor?: number): void;
    draw(): void;
    private mousePoint(e);
    private mouseDown(e);
    private mouseUp(e);
    private mouseMove(e);
    undo(): void;
    toJsonObj(): any;
    getCharImage(): any;
    getStrokeImages(): HTMLImageElement[];
    setJsonObj(jsonObj: any): void;
    getSegmentPHash(seg: CharSegment, callback: (pHash: string) => void): void;
}
export declare class Point {
    x: number;
    y: number;
    constructor(x: number, y: number);
    translate(x: number, y: number): void;
    toJsonObj(): any;
    static fromJsonObj(jsonObj: any, scaleX?: number, scaleY?: number): Point;
}
export declare class CharSegment {
    points: Point[];
    phash: string;
    constructor();
    pHash: string;
    draw(context: CanvasRenderingContext2D, stopPointIdx?: number): void;
    toJsonObj(): any;
    static fromJsonObj(jsonObj: any, scaleX?: number, scaleY?: number): CharSegment;
}
export { Tools };
