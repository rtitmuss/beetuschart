import React from 'react';
import Chart from 'react-apexcharts'
import {LogEntry, LogEntryType, logEntryTypeToNameMap, logEntryTypeToColorMap} from "./LogEntry.d.ts";
import { convertUnit, useSettings } from './SettingsContext.tsx';

// https://www.colorxs.com/palette/editor/e0f7b3-bef7b3-b3f7ca-b3f7ec-b3e0f7?scheme=analogous
// E0F7B3 Tea Green
// BEF7B3 Very Light Green
// B3F7CA Magic Mint
// B3F7EC Celeste
// B3E0F7 Uranian Blue

function addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + (minutes * 60 * 1000));
}

function addHours(date: Date, hours: number) {
    return new Date(date.getTime() + (hours * 60 * 60 * 1000));
}

function differenceInHours(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date1.getTime() - date2.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60)); // convert milliseconds to hours
}

function splitDataByTimeGap(data: {x: Date, y: number}, gapHours: number): [Date, number][][] {
    const result: {x: Date, y: number}[][] = [];
    let currentList: {x: Date, y: number}[] = [];
    let lastDate: Date | null = null;

    data.forEach(entry => {
        if (lastDate === null || differenceInHours(entry.x, lastDate) <= gapHours) {
            currentList.push(entry);
        } else {
            // Start a new list if the gap is greater than the specified gapHours
            result.push(currentList);
            currentList = [entry];
        }
        lastDate = entry.x;
    });

    // Push the last list if it has any data
    if (currentList.length > 0) {
        result.push(currentList);
    }

    return result;
}

function calculateESWA(data: { date: Date; bgm: number }[], alpha: number) {
    const eswaValues: { date: Date; eswa: number }[] = [];
    if (data.length === 0) return eswaValues;

    let previousEswa = data[0].bgm;

    for (let i = 0; i < data.length; i++) {
        const { date, bgm } = data[i];
        const currentEswa = alpha * bgm + (1 - alpha) * previousEswa;
        eswaValues.push({ date, eswa: currentEswa.toFixed(1) });
        previousEswa = currentEswa;
    }

    return eswaValues;
}

function TimelineChart(props) {
    const logEntries = props.logEntries;
    const {settings, setSettings } = useSettings();

    const { minDate, maxDate } = logEntries
        .reduce((acc, data) => {
            if (data.date < acc.minDate) {
                acc.minDate = data.date;
            }
            if (data.date > acc.maxDate) {
                acc.maxDate = data.date;
            }
            return acc;
        }, { minDate: logEntries[0].date, maxDate: logEntries[0].date });

    const cgmData = logEntries
        .filter(data => data.cgm !== undefined)
        .map(data => ({
            x: data.date,
            y: convertUnit(data.cgm, settings),
        }));

    const cgmLists = splitDataByTimeGap(cgmData, 2);

    const bgmAnnotations = logEntries
        .filter(data => data.bgm !== undefined)
        .map(data => {
            const t0 = data.date;
            const t1 = addMinutes(t0, 20);
            const bgmReading = data.bgm;

            const filteredGlucose = logEntries
                .filter(data => data.cgm !== undefined)
                .filter(data => t0 <= data.date && data.date <= t1)
                .map(data => data.cgm);
            const averageGlucose = filteredGlucose
                    .reduce((acc, value) => acc + value, 0)
                / filteredGlucose.length;

            const deltaGloucose = (averageGlucose - bgmReading).toFixed(1);

            const convertedBgmReading = convertUnit(bgmReading, settings);
            const converteddeltaGloucose = convertUnit(deltaGloucose, settings);

            return {
                x: t0.getTime(),
                y: convertedBgmReading,
                marker: {
                    size: 2,
                    fillColor: data.isFasting ? '#121914': '#B0B2B1',
                    strokeColor: data.isFasting ? '#121914': '#B0B2B1',
                }
            };
        });

    const fastingBgmValues = logEntries
        .filter(entry => entry.isFasting && entry.bgm !== undefined)
        .map(entry => ({ date: entry.date, bgm: entry.bgm! }));

    const alpha = 0.1; // Smoothing factor for ESWA
    const eswaValues = calculateESWA(fastingBgmValues, alpha);

    const eswaData = eswaValues.map(data => ({
        x: data.date.getTime(),
        y: data.eswa
    }));

    const yaxisAnnotations: ApexAnnotations = [settings.rangeMin, settings.rangeMax].map(target => {
        return {
            y: convertUnit(target, settings),
            borderColor: '#121914',
            label: {
                borderColor: '#121914',
                style: {
                    color: '#fff',
                    background: '#121914'
                },
                text: convertUnit(target, settings) + ' ' + settings.unit,
            }
        }
    });

    const series = [
        ...cgmLists.map(cgmData => ({
            name: cgmData[0].x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' (CGM)',
            data: cgmData
        })),
        {
            name: 'Average fasting (BGM)',
            data: eswaData
        }
    ];

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
            colors: [...Array(cgmLists.length).fill('#B3E0F7'), '#121914'],
            stroke: {
                width: [...Array(cgmLists.length).fill(1), 2]
            },
            title: {
                text: 'Glucose Timeline',
                align: 'left'
            },
            yaxis: {
                min: convertUnit(2, settings),
                max: convertUnit(12, settings),
                title: {
                    text: settings.unit
                },
            },
            xaxis: {
                type: 'datetime',
                min: minDate.getTime(),
                max: maxDate.getTime(),
                labels: {
                    datetimeUTC: false
                }
            },
            tooltip: {
                shared: true,
                x: {
                    format: 'dd MMM HH:mm'
                }
            },
            annotations: {
                yaxis: yaxisAnnotations,
                points: bgmAnnotations,
            }
        },
        series: series
    };

    return <Chart options={state.options} series={state.series} type="line"/>;
}

export default TimelineChart;
