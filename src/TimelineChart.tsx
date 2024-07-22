import React from 'react';
import Chart from 'react-apexcharts';
import { LogEntry } from "./LogEntry.d.ts";
import { convertUnit, useSettings } from './SettingsContext.tsx';
import { calculateEAG } from "./EAg.tsx";

// https://www.colorxs.com/palette/editor/e0f7b3-bef7b3-b3f7ca-b3f7ec-b3e0f7?scheme=analogous
// E0F7B3 Tea Green
// BEF7B3 Very Light Green
// B3F7CA Magic Mint
// B3F7EC Celeste
// B3E0F7 Uranian Blue

const addTime = (date: Date, value: number, unit: 'minutes' | 'hours'): Date => {
    const milliseconds = unit === 'minutes' ? value * 60 * 1000 : value * 60 * 60 * 1000;
    return new Date(date.getTime() + milliseconds);
};

const differenceInHours = (date1: Date, date2: Date): number => {
    const diffTime = Math.abs(date1.getTime() - date2.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60)); // convert milliseconds to hours
};

const splitDataByTimeGap = (data: LogEntry[], gapHours: number): LogEntry[][] => {
    const result: LogEntry[][] = [];
    let currentList: LogEntry[] = [];
    let lastDate: Date | null = null;

    data.forEach(entry => {
        if (lastDate === null || differenceInHours(entry.date, lastDate) <= gapHours) {
            currentList.push(entry);
        } else {
            // Start a new list if the gap is greater than the specified gapHours
            result.push(currentList);
            currentList = [entry];
        }
        lastDate = entry.date;
    });

    // Push the last list if it has any data
    if (currentList.length > 0) {
        result.push(currentList);
    }

    return result;
};

const calculateESWA = (data: { date: Date; bgm: number }[], alpha: number) => {
    const eswaValues: { date: Date; eswa: number }[] = [];
    if (data.length === 0) return eswaValues;

    let previousEswa = data[0].bgm;

    data.forEach(({ date, bgm }) => {
        const currentEswa = alpha * bgm + (1 - alpha) * previousEswa;
        eswaValues.push({ date, eswa: parseFloat(currentEswa.toFixed(1)) });
        previousEswa = currentEswa;
    });

    return eswaValues;
};

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

const calculateQuartilesAndExtrema = (cgm: number[]): number[] => {
    const sortedCgm = cgm.sort((a, b) => a - b);
    const sortedCgmLength = sortedCgm.length;

    const min = sortedCgm[0];
    const q1 = calculateQuantile(sortedCgm, 0.25)
    const median = calculateQuantile(sortedCgm, 0.5)
    const q3 = calculateQuantile(sortedCgm, 0.75)
    const max = sortedCgm[sortedCgm.length - 1];

    return {min: min, q1: q1, median: median, q3: q3, max: max};
};

function TimelineChart(props) {
    const { logEntries } = props;
    const { settings } = useSettings();

    const { minDate, maxDate } = logEntries.reduce((acc, data) => {
        if (data.date < acc.minDate) acc.minDate = data.date;
        if (data.date > acc.maxDate) acc.maxDate = data.date;
        return acc;
    }, { minDate: logEntries[0].date, maxDate: logEntries[0].date });

    const cgmData = logEntries
        .filter(data => data.cgm !== undefined);

    const cgmDataSets = splitDataByTimeGap(cgmData, 2);

    const cgmSeries = cgmDataSets
        .map(cgmSet => cgmSet
            .map(data => ({
                x: data.date,
                y: convertUnit(data.cgm!, settings),
            })));

    const cgmQuartiles = cgmDataSets
        .map(cgmSet => {
            const quartiles = calculateQuartilesAndExtrema(cgmSet.map(entry => entry.cgm));
            return { minDate: cgmSet[0].date, maxDate: cgmSet[cgmSet.length - 1].date, quartiles: quartiles };
        });

    const cgmLines = cgmQuartiles.map((cgmSet, index) => {
        return [
            [{
                y: convertUnit(cgmSet.quartiles.q1, settings),
                x: cgmSet.minDate,
            }, {
                y: convertUnit(cgmSet.quartiles.q1, settings),
                x: cgmSet.maxDate,
            }],
            [{
                y: convertUnit(cgmSet.quartiles.median, settings),
                x: cgmSet.minDate,
            }, {
                y: convertUnit(cgmSet.quartiles.median, settings),
                x: cgmSet.maxDate,
            }],
            [{
                y: convertUnit(cgmSet.quartiles.q3, settings),
                x: cgmSet.minDate,
            }, {
                y: convertUnit(cgmSet.quartiles.q3, settings),
                x: cgmSet.maxDate,
            }]
        ]
    }).flat();

    const eagAnnotations = cgmDataSets
        .map(cgmSet => {
            return {
                x: cgmSet[cgmSet.length - 1].date.getTime(),
                borderColor: '#121914',
                label: {
                    borderWidth: 0,
                    style: {
                        color: '#121914',
                    },
                    text: 'eAG ' + calculateEAG(cgmSet).a1c.toFixed(1) + '%'
                },
            }
        });

    const bgmAnnotations = logEntries
        .filter(data => data.bgm !== undefined)
        .map(data => {
            const t0 = data.date;
            const t1 = addTime(t0, 20, 'minutes');
            const bgmReading = data.bgm!;

            const filteredGlucose = logEntries
                .filter(data => data.cgm !== undefined)
                .filter(data => t0 <= data.date && data.date <= t1)
                .map(data => data.cgm!);

        const averageGlucose = filteredGlucose.reduce((acc, value) => acc + value, 0) / filteredGlucose.length;
        const deltaGlucose = (averageGlucose - bgmReading).toFixed(1);

        return {
            x: t0.getTime(),
            y: convertUnit(bgmReading, settings),
            marker: {
                size: 1,
                fillColor: data.isFasting ? '#121914' : '#B0B2B1',
                strokeColor: data.isFasting ? '#121914' : '#B0B2B1',
            }
        };
    });

  const fastingBgmValues = logEntries
      .filter(entry => entry.isFasting && entry.bgm !== undefined)
      .map(entry => ({ date: entry.date, bgm: entry.bgm! }));

  const alpha = 0.05; // Smoothing factor for ESWA
  const eswaValues = calculateESWA(fastingBgmValues, alpha);

  const eswaData = eswaValues.map(data => ({
      x: data.date.getTime(),
      y: data.eswa
  }));

  const rangeAnnotations = [settings.rangeMin, settings.rangeMax].map(target => ({
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
    }));

    const series = [
        ...cgmSeries.map(cgmData => ({
            name: cgmData[0].x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' (CGM)',
            data: cgmData
        })),
        ...cgmLines.map(cgmLines => ({
            name: '',
            data: cgmLines
        })),
        {
            name: 'Average fasting (BGM)',
            data: eswaData
        }
    ];

    const state: ApexOptions = {
        chart: {
            type: 'line',
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
        colors: [...Array(cgmSeries.length).fill('#B3E0F7'), ...Array(cgmLines.length).fill('#6A7F9E'), '#121914'],
        stroke: {
            width: [...Array(cgmSeries.length).fill(1), ...Array(cgmLines.length).fill(2), 2]
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
            },
            tooltip: {
                enabled: true
            }
        },
        tooltip: {
            x: {
                format: 'dd MMM HH:mm'
            }
        },
        legend: {
            show: false
        },
        annotations: {
            xaxis: eagAnnotations,
            yaxis: rangeAnnotations,
            points: bgmAnnotations,
        }
    };

    return <Chart options={state} series={series} type="line" />;
}

export default TimelineChart;
