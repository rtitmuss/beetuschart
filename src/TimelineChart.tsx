import React from 'react';
import Chart from 'react-apexcharts';
import { LogEntry } from "./LogEntry.d.ts";
import { convertUnit, useSettings } from './SettingsContext.tsx';

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
        .map(set => set
            .map(data => ({
                x: data.date,
                y: convertUnit(data.cgm!, settings),
            })));

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
                size: 2,
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

  const yaxisAnnotations = [settings.rangeMin, settings.rangeMax].map(target => ({
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
        colors: [...Array(cgmSeries.length).fill('#B3E0F7'), '#121914'],
        stroke: {
            width: [...Array(cgmSeries.length).fill(1), 2]
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
    };

    return <Chart options={state} series={series} type="line" />;
}

export default TimelineChart;
