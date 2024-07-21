import React, {useEffect} from 'react'
import { LogEntry } from "./LogEntry.d.ts";

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
    }),
    columnHelper.accessor('cgm', {
        header: () => 'CGM',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('bgm', {
        header: () => 'BGM',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('note', {
        header: () => 'Note',
        cell: info => info.getValue()
    }),
];

function LogEntryTable(props) {
    const [data, setData] = React.useState([...props.logEntries].reverse());

    useEffect(() => {
        setData([...props.logEntries].reverse());
    }, [props.logEntries]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="p-2">
            <table>
                <thead>
                {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                            <th key={header.id}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                            </th>
                        ))}
                    </tr>
                ))}
                </thead>
                <tbody>
                {table.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                        {row.getVisibleCells().map(cell => (
                            <td key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
                <tfoot>
                {table.getFooterGroups().map(footerGroup => (
                    <tr key={footerGroup.id}>
                        {footerGroup.headers.map(header => (
                            <th key={header.id}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.footer,
                                        header.getContext()
                                    )}
                            </th>
                        ))}
                    </tr>
                ))}
                </tfoot>
            </table>
            <div className="h-4" />
        </div>
    )
}

export default LogEntryTable;
