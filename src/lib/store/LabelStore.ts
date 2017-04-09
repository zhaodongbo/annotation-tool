/**
 * Created by grzhan on 17/1/10.
 */
import {Util, invariant, clone, end, endIndex, nestPush, each, remove} from '../common/Util';
import {Store} from "./Store";

export type LabelID = number;
export type LinesCount = number[];
export type LineNumber = number;
export interface LinePosition {
    line: LineNumber,
    position: number
}
export type LabelLineRange = [LinePosition, LinePosition];
export interface Label {
    id:number;
    category: number;
    pos: [number, number];
}

export class LabelStore extends Store {

    private _linesCount: LinesCount;
    private _linesAccumulatedCount: LinesCount;
    private _labels: Label[];
    private _labelsInLines: Array<Array<Label>>;
    private _IDMap: {[LabelID: number]: Label};
    private _lastID: number;

    constructor(linesCount: LinesCount, labels: Label[]) {
        super();
        this._clear();
        this._labels = labels;
        this._linesCount = linesCount;
        linesCount.reduce((sum, count) => {
            sum += count;
            this._linesAccumulatedCount.push(sum);
            return sum;
        }, 0);
        each(labels, (label) => {
            this._updateState(label);
        });
    }

    public select(): Label[] {
        return clone(this._labels);
    }

    public getById(id: LabelID): Label {
        invariant(
            this._IDMap[id],
            `LabelStore.getById: Label id(${id}) does not map to a registered label)`
        );
        return clone(this._IDMap[id]);
    }

    public selectByLine(lineNumber: LineNumber): Label[] {
        invariant(
            lineNumber < this._labelsInLines.length && lineNumber >= 0,
            `LabelStore.selectByLine: Line number #${lineNumber} is out of range`
        );
        return clone(this._labelsInLines[lineNumber]);
    }

    public getLineRangeById(id: LabelID): LabelLineRange {
        invariant(
            this._IDMap[id],
            `LabelStore.getLineRangeById: Label ID(${id}) does not map to a registered label)`
        );
        const totalChars:number = end(this._linesAccumulatedCount);
        const [startPos, endPos] = this._IDMap[id].pos;
        const startLineNumber: LineNumber = this._binarySearchLineNumber(startPos, 0,
            endIndex(this._linesAccumulatedCount));
        const endLineNumber: LineNumber = this._binarySearchLineNumber(endPos, 0,
            endIndex(this._linesAccumulatedCount));
        const startLinePosition: LinePosition = {line: startLineNumber,
            position: startPos - (this._linesAccumulatedCount[startLineNumber - 1] || 0)};
        const endLinePosition:LinePosition = {line: endLineNumber,
            position: endPos - (this._linesAccumulatedCount[endLineNumber - 1] || 0)};
        return [startLinePosition, endLinePosition];
    }

    public add(category:number, position: [number, number]):Label {
        const id:LabelID = this._lastID + 1;
        const label:Label = {category, pos: position, id};
        this._labels.push(label);
        this._updateState(label);
        return label;
    }

    public remove(id: LabelID) {
        const label:Label = this._IDMap[id];
        invariant(label, `LabelStore.remove: Label ID(${id}) does not map to a registered label`);
        this._evictState(label);
    }

    private _binarySearchLineNumber(position: number,
                                    start: LineNumber,
                                    end: LineNumber): LineNumber {
        if (start >= end) {
            const count = this._linesAccumulatedCount[start];
            invariant(
                position < count,
                `LabelStore._binarySearchLineNumber: Label position(${position}) is out of range(${start}:${count})`
            );
            return start;
        }
        const middle:LineNumber = Math.floor((start + end) / 2);
        return this._linesAccumulatedCount[middle] > position
            ? this._binarySearchLineNumber(position, start, middle)
            : this._binarySearchLineNumber(position, middle + 1, end);
    }

    private _updateState(label:Label): void {
        this._setIDMap(label);
        this._parseLabelInLines(label);
        this._lastID = Math.max(this._lastID, label.id);
    }

    private _evictState(label:Label): void {
        const id:LabelID = label.id;
        delete this._IDMap[id];
        each(this._labelsInLines, (labelsInLine: Array<Label>) => {
            remove(labelsInLine, label);
        });
        remove(this._labels, label);
        this._lastID = this._labels.reduce((x, y) => Math.max(x, y.id), 0);
    }

    private _parseLabelInLines(label: Label): void {
        const [{line: startLine}, {line: endLine}] = this.getLineRangeById(label.id);
        nestPush(this._labelsInLines, startLine, label);
        if (startLine !== endLine)
            nestPush(this._labelsInLines, endLine, label);
    }

    private _setIDMap(label: Label): void {
        invariant(
            this._IDMap[label.id] === undefined,
            `LabelStore._setIDMap: Label id#${label.id} is duplicated`
        );
        this._IDMap[label.id] = label;
    }

    private _clear(update:boolean=false): void {
        if (!update) {
            this._linesCount = [];
            this._labels = [];
        }
        this._labelsInLines = [];
        this._linesAccumulatedCount = [];
        this._IDMap = {};
        this._lastID = 0;
    }
}
