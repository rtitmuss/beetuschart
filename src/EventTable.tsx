import React, {useEffect} from 'react'
import { LogEntry, logEntryTypeToNameMap } from "./LogEntry.d.ts";
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

const columnHelper = createColumnHelper<LogEntry>()

const columns = [
    columnHelper.accessor('date', {
        header: () => 'Date',
        cell: info => info.getValue().toLocaleString(),
        footer: () => 'footer'
    }),
    columnHelper.accessor('timeDelta', {
        header: () => 'Time',
        cell: info => {
            if (info.getValue() === undefined) {
                return '';
            }
            const minutes = info.getValue() / 1000 / 60;
            return Math.trunc(minutes / 60) + ':' + (minutes % 60);
        },
        footer: () => ''
    }),
    columnHelper.accessor('maxDelta', {
        header: () => 'Delta',
        cell: info => info.getValue().toFixed(1),
        footer: info => {
//            console.log(info);
            return Math.max(info.rows)
        }
    }),
    columnHelper.accessor('type', {
        header: () => 'Type',
        cell: info => logEntryTypeToNameMap[info.getValue()] || '',
        footer: () => ''
    }),
    columnHelper.accessor('note', {
        header: () => 'Note',
        cell: info => info.getValue(),
        footer: () => ''
    }),
];

function EventTable(props) {
    const [data, setData] = React.useState([...props.eventLog].reverse());

    useEffect(() => {
        setData([...props.eventLog].reverse());
    }, [props.eventLog]);


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
                {table.getFooterGroups().map(footerGroup => (
                    <TableRow key={footerGroup.id}>
                        {footerGroup.headers.map(header => (
                            <TableCell key={header.id}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.footer,
                                        header.getContext()
                                    )}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
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
