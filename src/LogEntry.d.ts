
export enum LogEntryType {
    Fasting,
    Breakfast,
    Lunch,
    Dinner,
    Snack,
    Sport,
}

export const logEntryTypeToNameMap: { [key: LogEntryType]: string } = {
    [LogEntryType.Breakfast]: 'Breakfast',
    [LogEntryType.Lunch]: 'Lunch',
    [LogEntryType.Dinner]: 'Dinner',
    [LogEntryType.Snack]: 'Snack',
    [LogEntryType.Sport]: 'Sport'
};

export const logEntryTypeToColorMap: { [key: LogEntryType]: string } = {
    [LogEntryType.Breakfast]: '#B3F7CA',
    [LogEntryType.Lunch]: '#B3F7CA',
    [LogEntryType.Dinner]: '#B3F7CA',
    [LogEntryType.Snack]: '#E0F7B3',
    [LogEntryType.Sport]: '#B3F7EC'
};

export interface LogEntry {
    date: Date,
    type?: LogEntryType,
    isFasting: boolean,
    bgm?: number,
    cgm?: number,
    note?: String,
}

export interface EventEntry {
    date: Date,
    type: LogEntryType,
    note: String,
    offsetCgm:[number,number],
    maxDelta: number,
    timeDelta: number,
}