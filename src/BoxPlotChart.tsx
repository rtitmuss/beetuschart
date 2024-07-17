import React from 'react';
import Chart from 'react-apexcharts'
import { Grid, Stack } from "@mui/material";
import { LogEntry, LogEntryType, logEntryTypeToNameMap, logEntryTypeToColorMap } from "./LogEntry.d.ts";
import { convertUnit, useSettings } from './SettingsContext.tsx';

const calculateQuantile = (sortedCgm, q) => {
    const pos = (sortedCgm.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sortedCgm[base + 1] !== undefined) {
        return sortedCgm[base] + rest * (sortedCgm[base + 1] - sortedCgm[base]);
    } else {
        return sortedCgm[base];
    }
};
function calculateQuartilesAndExtrema(cgm: number[]): number[] {
    const sortedCgm = cgm.sort((a, b) => a - b);
    const sortedCgmLength = sortedCgm.length;

    const min = sortedCgm[0];
    const q1 = calculateQuantile(sortedCgm, 0.25)
    const median = calculateQuantile(sortedCgm, 0.5)
    const q3 = calculateQuantile(sortedCgm, 0.75)
    const max = sortedCgm[sortedCgm.length - 1];

    return [min, q1, median, q3, max];
}

function BoxPlotChart(props) {
    const logEntries = props.logEntries;
    const {settings, setSettings } = useSettings();

    const cgmData = logEntries
        .filter(data => data.cgm !== undefined);

    const cgmDataPerDay = cgmData.reduce((result, data) => {
        const dateKey = data.date.toISOString().split('T')[0]; // Extract date part

        if (!result[dateKey]) {
            result[dateKey] = [];
        }

        result[dateKey].push(data.cgm);
        return result;
    }, {});

    const boxPlotData = Object.keys(cgmDataPerDay).map(date => {
        return {
            x: date,
            y: calculateQuartilesAndExtrema(cgmDataPerDay[date]),
        };
    });

    const minMaxData = boxPlotData.map(data => ({
        x: data.x,
        y: [convertUnit(data.y[0], settings), convertUnit(data.y[4], settings)]
    }));

    const q1q3Data = boxPlotData.map(data => ({
        x: data.x,
        y: [convertUnit(data.y[1], settings), convertUnit(data.y[3], settings)]
    }));

    const medianData = boxPlotData.map(data => ({
        x: data.x,
        y: convertUnit(data.y[2], settings),
    }));

    const yaxisAnnotations: ApexAnnotations = [settings.rangeMin, settings.rangeMax].map(target => {
        return {
            y: convertUnit(target, settings),
            borderColor: '#121914',
            /*
            label: {
                borderColor: '#121914',
                style: {
                    color: '#fff',
                    background: '#121914'
                },
                text: convertUnit(target, settings) + ' ' + settings.unit,
            }
            */
        }
    });

    const state: ApexOptions = {
        series: [
            {
                type: 'rangeArea',
                name: 'Min-Max',
                data: minMaxData
            },
            {
                type: 'rangeArea',
                name: 'Q1-Q3',
                data: q1q3Data
            },
            {
                type: 'line',
                name: 'Median',
                data: medianData
            },
        ],
        options: {
            chart: {
                toolbar: {
                    show: false,
                }
            },
            colors: ['#DFE3ED', '#A2B4D4', '#00538F'],
            dataLabels: {
                enabled: false
            },
            fill: {
                opacity: [1, 1, 1],
            },
            stroke: {
                curve: 'straight',
                width: [0, 0, 2],
            },
            legend: {
                show: false,
            },
            grid: {
                show: false,
            },
            annotations: {
                yaxis: yaxisAnnotations,
            }
        }
    };

    /*
    return <Grid container spacing={3}>
        <Grid item xs="6">
            <Chart options={state.options} series={state.series} height="300" type="rangeArea"/>
        </Grid>
        <Grid item xs="6">
            <Chart options={state.options} series={state.series} height="300" type="rangeArea"/>
        </Grid>
    </Grid>;
*/

    return <Chart options={state.options} series={state.series} height="300" type="rangeArea"/>;
}

export default BoxPlotChart;