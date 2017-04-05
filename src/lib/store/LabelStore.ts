/**
 * Created by grzhan on 17/1/10.
 */
import {Util, invariant, clone, end, endIndex, nestPush} from '../common/Util';
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
        this._setIDMap();
        this._parseLabelsInLines();
    }

    public getLabels(): Label[] {
        return clone(this._labels);
    }

    public getLabelById(id: LabelID): Label {
        invariant(
            this._IDMap[id],
            `LabelStore.getLabelById: Label id(${id}) does not map to a registered label)`
        );
        return clone(this._IDMap[id]);
    }

    public selectLabelsByLine(lineNumber: LineNumber): Label[] {
        invariant(
            lineNumber <= this._labelsInLines.length && lineNumber > 0,
            `LabelStore.getLabelsByLine: Line number #${lineNumber} is out of range`
        );
        return clone(this._labelsInLines[lineNumber - 1]);
    }

    public getLabelLineRangeById(id: LabelID): LabelLineRange {
        invariant(
            this._IDMap[id],
            `LabelStore.getLabelLineRangeById: Label id(${id}) does not map to a registered label)`
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

    private _parseLabelsInLines(): void {
        this._labels.map((label) => {
            const [{line: startLine}, {line: endLine}] = this.getLabelLineRangeById(label.id);
            nestPush(this._labelsInLines, startLine, label);
            if (startLine !== endLine)
                nestPush(this._labelsInLines, endLine, label);
        });
    }

    private _setIDMap() {
        this._labels.map((label) => {
            invariant(
                this._IDMap[label.id] === undefined,
                `LabelStore._setIDMap: Label id#${label.id} is duplicated`
            );
            this._IDMap[label.id] = label;
        });
    }

    private _clear(update:boolean=false) {
        if (!update) {
            this._linesCount = [];
            this._labels = [];
        }
        this._labelsInLines = [];
        this._linesAccumulatedCount = [];
        this._IDMap = {};
    }
}


// export class Label {
//     public id;
//     public category;
//     public pos = [0,0];
//     public lineNo;
//     constructor(id, category, pos) {
//         this.id = id;
//         this.category = category;
//         this.pos[0] = pos[0];
//         this.pos[1] = pos[1];
//     }
//
//     public isTruncate(pos) {
//         return (this.pos[0] <= pos && this.pos[1] > pos);
//     }
//
//     static getPosInLine(lines:LineContainer, x:number, y:number) : LinePosition {
//         let no:number = 0;
//         let linesLength:Array<number> = lines.getLinesLength();
//         for (let length of linesLength) {
//             no += 1;
//             if (x - length < 0) break;
//             x -= length;
//         }
//         for (let length of linesLength) {
//             no += 1;
//             if (y - length < 0) break;
//             y -= length;
//         }
//         if (x > y) Util.throwError(`Invalid selection, x: ${x}, y: ${y}, line number: ${no}`);
//         return {x, y, no};
//     }
// }
//
//
// export interface LabelData {
//     id:number;
//     category:number;
//     pos: Array<number>;
// }