import './App.css';
import React, {useState, useEffect} from 'react';
import { styled, useTheme } from '@mui/material/styles';
import {
    AppBar,
    Box,
    Button,
    Container,
    CssBaseline,
    Drawer,
    Grid,
    Paper,
    Toolbar,
    Typography,
    IconButton,
    SwipeableDrawer,
    Stack,
    Switch,
    TextField,
    Menu,
    MenuItem,
} from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Papa from 'papaparse';

import {bgmData, eventData} from "./Data.ts";
import TimelineChart from "./TimelineChart.tsx";
import EventChart from "./EventChart";
import EventTable from "./EventTable.tsx";
import LogEntryTable from "./LogEntryTable.tsx";
import {EventEntry, LogEntry, LogEntryType} from "./LogEntry.d.ts";
import {EAG} from "./EAg.tsx";
import {SettingsButton, SettingsProvider, useSettings} from "./SettingsContext.tsx";

function addHours(date, hours) {
    return new Date(date.getTime() + (hours * 60 * 60 * 1000));
}

function parseLibreView(filename, setEventLog) {
    Papa.parse(filename, {
        header: false,
        dynamicTyping: true,
        complete: function (results) {
            // date format: 14-07-2023 20:33
            const re = /(\d\d)-(\d\d)-(\d\d\d\d) (\d\d):(\d\d)/;
            const cgmData = results.data.slice(2)
                .filter(line => line[3] === 0 || line[3] === 1)
                .map(line => {
                    const match = line[2].match(re);
                    return {
                        date: new Date(match[3], match[2] - 1, match[1], match[4], match[5]),
                        cgm: line[4] || line[5]
                    }
                });

            setEventLog(cgmData);

            // const mealTime = results.data.slice(2)
            //     .filter(line => line[3] === 5)
            //     .map(line => {
            //         const match = line[2].match(re);
            //         return new Date(match[3], match[2] - 1, match[1], match[4], match[5])
            //     });
            //
            // const exerciseTime = results.data.slice(2)
            //     .filter(line => line[3] === 6 && line[13] === `Exercise`)
            //     .map(line => {
            //         const match = line[2].match(re);
            //         return new Date(match[3], match[2] - 1, match[1], match[4], match[5])
            //     });
            //
            // const eventData = results.data.slice(2)
            //     .filter(line => line[3] === 6 && line[13] !== null && line[13] !== `Exercise`)
            //     .map(line => {
            //         const match = line[2].match(re);
            //         const date = new Date(match[3], match[2] - 1, match[1], match[4], match[5]);
            //
            //         if (mealTime.some(i => i.getTime() === date.getTime())) {
            //             return {
            //                 name: 'Breakfast',
            //                 time: date,
            //                 note: line[13],
            //                 duration: 120
            //             }
            //         }
            //         if (exerciseTime.some(i => i.getTime() === date.getTime())) {
            //             return {
            //                 name: 'Exercise',
            //                 time: date,
            //                 note: line[13],
            //                 duration: 30
            //             }
            //         }
            //         return undefined;
            //     });
            //
            // const sortedEventData = eventData.sort((a, b) => {
            //     return a[0] - b[0];
            // });
            //
            // console.log(sortedEventData);
            // setEvents(sortedEventData);
        }
    });
}

function eventEntryFromLogEntry(logEntries: LogEntry[]): EventEntry[] {
    return logEntries
        .filter(logEntry => logEntry.type !== undefined)
        .map(logEntry => {
            const t0 = logEntry.date;
            const t4h = addHours(t0, 4);

            const filteredCgmData = logEntries
                .filter(logEntry => logEntry.cgm !== undefined)
                .filter(logEntry => t0 <= logEntry.date && logEntry.date <= t4h);

            const firstEntry = filteredCgmData[0];
            const adjustedCgmData = filteredCgmData.map(data => {
                return [data.date - firstEntry.date, data.cgm - firstEntry.cgm]
            });

            const adjusted2hCgmData = adjustedCgmData.filter(data => data[0] < 2 * 60 * 60 * 1000);
            const minCgm = Math.min(...adjusted2hCgmData.map(array => array[1]));
            const maxCgm = Math.max(...adjusted2hCgmData.map(array => array[1]));

            const maxDelta = Math.abs(maxCgm) > Math.abs(minCgm) ? maxCgm : minCgm;
            const timeDelta = adjusted2hCgmData.find(data => data[1] === maxDelta);

            return {
                date: t0,
                type: logEntry.type,
                note: logEntry.note,
                offsetCgm: adjustedCgmData,
                maxDelta: maxDelta,
                timeDelta: (timeDelta !== undefined) ? timeDelta[0] : undefined,
            }
        });
}

function transformBgmData(data): LogEntry[] {
    return data.map(d => ({
        date: d[0],
        bgm: d[1],
        isFasting: d[2] || false,
    }));
}

function transformEventData(data): LogEntry[] {
    const nameToTypeMap: { [key: string]: LogEntryType } = {
        'Breakfast': LogEntryType.Breakfast,
        'Lunch': LogEntryType.Lunch,
        'Dinner': LogEntryType.Dinner,
        'Snack': LogEntryType.Snack,
        'Sport': LogEntryType.Sport
    };

    return data.map(d => {
        const type = nameToTypeMap[d[1]];
        return {
            date: d[0],
            note: d[2],
            ...(type ? {type} : {})
        }
    });
}

function sortAndRemoveDuplicates(logEntry: LogEntry[]): LogEntry[] {
    return logEntry
        .sort((a, b) => {
            if (a.date.getTime() !== b.date.getTime()) {
                return a.date - b.date;
            }
            if (a.cgm !== b.cgm) {
                return (a.cgm || 0) - (b.cgm || 0);
            }
            if (a.bgm !== b.bgm) {
                return (a.bgm || 0) - (b.bgm || 0);
            }
            return (a.note || '').localeCompare((b.note || ''));
        })
        .filter((entry, index, self) =>
            index === 0 || JSON.stringify(entry) !== JSON.stringify(self[index - 1])
        );
}

function App() {
    const [logEntries, setLogEntries] = useState<LogEntry[]>(() => {
        const localDataJson = localStorage.getItem('logEntries');
        const localData = localDataJson ? JSON.parse(localDataJson, (key, value) => {
            if (key === 'date' && typeof value === 'string') {
                return new Date(value);
            }
            return value;
        }) : [];

        return sortAndRemoveDuplicates(localData);
    });

    const appendLogEntries = function (logEntry: LogEntry[]) {
        setLogEntries(sortAndRemoveDuplicates([...logEntries, ...logEntry]));
    }

    useEffect(() => {
        localStorage.setItem('logEntries', JSON.stringify(logEntries));
    }, [logEntries]);

    useEffect(() => {
        appendLogEntries([...transformBgmData(bgmData), ...transformEventData(eventData)]);
    }, []);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const filename = e.target.files[0];
        if (!filename) {
            return;
        }

        parseLibreView(filename, appendLogEntries);
    };

    const handleClearChange = (event) => {
        setLogEntries([]);
    }

    const [drawerOpen, setDrawerOpen] = useState(false);

    const toggleDrawer = (open) => (event) => {
        if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
            return;
        }
        setDrawerOpen(open);
    };

    const [anchorEl, setAnchorEl] = useState(null);
    const [dateRange, setDateRange] = useState(3);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = (value) => {
        setAnchorEl(null);
        setDateRange(value);
    };

    const [filteredLogEntries, setFilteredLogEntries] = useState([]);
    useEffect(() => {
        const cutoffTime = addHours(new Date(), dateRange * -24);
        const filteredLogEntries = logEntries.filter(entry => {
            return entry.date.getTime() >= cutoffTime;
        });

        setFilteredLogEntries(filteredLogEntries);
    }, [logEntries, dateRange]);


    const [eventLog, setEventLog] = useState<LogEntry[]>([]);

    useEffect(() => {
        setEventLog(eventEntryFromLogEntry(filteredLogEntries));
    }, [filteredLogEntries]);

    return (
        <div className="App">
            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
            />
            <CssBaseline/>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <SettingsProvider>
                    <Container maxWidth="xl">
                        <AppBar position="static">
                            <Toolbar>
                                <Button color="inherit" onClick={toggleDrawer(true)}>Upload / Edit</Button>
                                <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
                                    <Container>
                                        <Stack spacing={3} direction="column" alignItems="flex-start">
                                            <IconButton onClick={toggleDrawer(false)}>
                                                <ChevronLeftIcon/>
                                            </IconButton>
                                            <Paper>
                                                <Button variant="contained" component="label">
                                                    Upload libreview file
                                                    <input hidden type="file" onChange={handleFileChange}/>
                                                </Button>
                                                <Button variant="contained" component="label">
                                                    Clear
                                                    <input hidden onClick={handleClearChange}/>
                                                </Button>
                                            </Paper>
                                            <Paper>
                                                <LogEntryTable logEntries={logEntries}></LogEntryTable>
                                            </Paper>
                                        </Stack>
                                    </Container>
                                </Drawer>

                                <Button
                                    color="inherit"
                                    onClick={handleClick}
                                >
                                    {dateRange} days
                                </Button>
                                <Menu
                                    id="long-menu"
                                    anchorEl={anchorEl}
                                    keepMounted
                                    open={Boolean(anchorEl)}
                                    onClose={() => handleClose(dateRange)}
                                >
                                    <MenuItem onClick={() => handleClose(2)}>2 days</MenuItem>
                                    <MenuItem onClick={() => handleClose(3)}>3 days</MenuItem>
                                    <MenuItem onClick={() => handleClose(7)}>7 days</MenuItem>
                                    <MenuItem onClick={() => handleClose(14)}>14 days</MenuItem>
                                    <MenuItem onClick={() => handleClose(28)}>28 days</MenuItem>
                                    <MenuItem onClick={() => handleClose(90)}>90 days</MenuItem>
                                </Menu>

                                <Typography variant="h6" component="div" sx={{flexGrow: 1}}>Beetus Chart</Typography>
                                <SettingsButton />
                            </Toolbar>
                        </AppBar>

                        {/* Main Content */}
                        <Grid container spacing={2} alignItems='start'>
                            {/* Space under header */}
                            <Grid item xs={12}/>

                            {/* Left Section: Graphs */}
                            <Grid container item xs={7} spacing={2}>
                                <Grid item xs={12}>
                                    <Paper>
                                        <TimelineChart logEntries={filteredLogEntries} eventLog={eventLog}></TimelineChart>
                                    </Paper>
                                </Grid>
                                {[
                                    LogEntryType.Breakfast,
                                    LogEntryType.Lunch,
                                    LogEntryType.Dinner,
                                    LogEntryType.Snack,
                                    LogEntryType.Sport
                                ].map((eventType, index) => (
                                    <Grid item xs={6} key={index}>
                                        <Paper>
                                            <EventChart eventLog={eventLog} eventType={eventType}/>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>

                            {/* Right Section: Event Table */}
                            <Grid item xs={5}>
                                <Stack spacing={2}>
                                    <Paper>
                                        <EAG logEntries={filteredLogEntries}/>
                                    </Paper>
                                    <Paper>
                                        <EventTable eventLog={eventLog}></EventTable>
                                    </Paper>
                                </Stack>
                            </Grid>
                        </Grid>
                    </Container>
                </SettingsProvider>
            </LocalizationProvider>
        </div>
    );
}

export default App;
