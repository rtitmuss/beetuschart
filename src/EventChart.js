import React from 'react';
import Chart from 'react-apexcharts'
import { EventLog, LogEntryType, logEntryTypeToNameMap } from "./LogEntry.d.ts";

function EventChart(props) {
    const eventLog: EventLog[] = props.eventLog;
    const eventType: LogEntryType = props.eventType;

    const filteredEvents = eventLog.filter(evt => evt.type === eventType);

    const series = filteredEvents.map(event => {
        const ts = event.date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        return {
            name: ts + ': ' + event.note,
            data: event.offsetCgm
        }
    });

    const state: ApexOptions = {
        options: {
            chart: {
                type: 'area',
                stacked: false,
                height: 350,
                zoom: {
                    type: 'x',
                    enabled: true,
                    autoScaleYaxis: true
                },
                toolbar: {
                    autoSelected: 'zoom'
                }
            },
            legend: {
                show: false
            },
            dataLabels: {
                enabled: false
            },
            markers: {
                size: 0,
            },
            title: {
                text: logEntryTypeToNameMap[eventType] + ' Graph',
                align: 'left'
            },
            yaxis: {
                title: {
                    text: 'Δ mmol/L'
                },
                labels: {
                    formatter: (value) => value.toFixed(1)
                }
            },
            xaxis: {
                type: 'datetime',
                labels: {
                    datetimeUTC: true
                }
            },
            tooltip: {
                shared: true,
                x: {
                    format: 'HH:mm'
                }
            },
        }
    };

    return <Chart options={state.options} series={series} type="line"/>;
}

export default EventChart;