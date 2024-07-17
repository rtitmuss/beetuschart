import React, {useEffect} from 'react'
import { LogEntry, LogEntryType, logEntryTypeToNameMap } from "./LogEntry.d.ts";

import {
    Paper,
    Table as MuiTable,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from "@mui/material";

import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'

const columnHelper = createColumnHelper()

const columns = [
    columnHelper.accessor('type', {
        header: () => 'Type',
        cell: info => logEntryTypeToNameMap[info.getValue()] || '',
        footer: () => ''
    }),
    columnHelper.accessor('timeDelta', {
        header: () => 'Average Time',
        cell: info => {
            if (info.getValue() === undefined) {
                return '';
            }
            const minutes = info.getValue() / 1000 / 60;
            return Math.trunc(minutes / 60) + ':' + Math.trunc(minutes % 60);
        },
        footer: () => ''
    }),
];

function eventToTypeMinutes(eventLog) {
    return [
        LogEntryType.Breakfast,
        LogEntryType.Lunch,
        LogEntryType.Dinner,
        LogEntryType.Snack,
        LogEntryType.Sport
    ].reduce((result, type) => {
        const typeLog = eventLog.filter(e => e.type === type);
        const typeTimeDelta = typeLog.reduce((result, event) => {
            return result + event.timeDelta;
        }, 0) / typeLog.length;
        result.push({
            type: type,
            timeDelta: typeTimeDelta,
        })
        return result;
    }, []);
}

function EventTable(props) {
    const [data, setData] = React.useState(eventToTypeMinutes(props.eventLog));

    useEffect(() => {
        setData(eventToTypeMinutes(props.eventLog));
    }, [props.eventLog]);


    console.log(data);



    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="p-2">
            <MuiTable>
                <TableHead>
                {table.getHeaderGroups().map(headerGroup => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                            <TableCell key={header.id}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
                </TableHead>
                <TableBody>
                {table.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                        {row.getVisibleCells().map(cell => (
                            <td key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                        ))}
                    </tr>
                ))}
                </TableBody>
            </MuiTable>
            <div className="h-4" />
        </div>
    )
}

export default EventTable;
