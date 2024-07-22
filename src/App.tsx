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

import {LogEntry} from "./LogEntry.d.ts";
import {SettingsButton, SettingsProvider, useSettings} from "./SettingsContext.tsx";
import TimelineChart from "./TimelineChart.tsx";

function addHours(date, hours) {
    return new Date(date.getTime() + (hours * 60 * 60 * 1000));
}

function parseLibreView(filename, setLogEntries) {
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

            setLogEntries(cgmData);
        }
    });
}

function parseMysugr(filename, setLogEntries) {
    Papa.parse(filename, {
        header: false,
        dynamicTyping: true,
        complete: function (results) {
            const bgmData = results.data.slice(1)
                .filter(line => line[3])
                .map(line => {
                    return {
                        date: new Date(line[0] + ' ' + line[1] + ' ' + line[25]),
                        bgm: line[3]
                    }
                });

            setLogEntries(bgmData);
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

function sortAndRemoveDuplicates(entries: LogEntry[]): LogEntry[] {
    return entries
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
        .filter((entry, index, self) => {
            if (index === 0) return true;
            const prevEntry = self[index - 1];
            return !(entry.date.getTime() === prevEntry.date.getTime() &&
                     entry.cgm === prevEntry.cgm &&
                     entry.bgm === prevEntry.bgm &&
                     entry.note === prevEntry.note);
        });
}

/* Assume the first bgm reading of the day is a fasting value */
function setFastingFlag(entries: LogEntry[]): LogEntry[] {
    let lastBgmDate: string | null = null;

    return entries.map(entry => {
        const currentDate = entry.date.toISOString().split('T')[0];

        const isFirstBgmOfDay = entry.bgm != null && currentDate !== lastBgmDate;
        if (isFirstBgmOfDay) {
            lastBgmDate = currentDate;
        }

        return {
            ...entry,
            isFasting: isFirstBgmOfDay
        };
    });
}

function processLogEntries(entries: LogEntry[]): LogEntry[] {
    return setFastingFlag(sortAndRemoveDuplicates(entries));
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

        return processLogEntries(localData);
    });

    const appendLogEntries = function (logEntry: LogEntry[]) {
        setLogEntries(processLogEntries([...logEntries, ...logEntry]));
    }

    useEffect(() => {
        localStorage.setItem('logEntries', JSON.stringify(logEntries));
    }, [logEntries]);

    const handleLibreviewFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const filename = e.target.files[0];
        if (!filename) {
            return;
        }

        parseLibreView(filename, appendLogEntries);
    };

    const handleMysugrFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const filename = e.target.files[0];
        if (!filename) {
            return;
        }

        parseMysugr(filename, appendLogEntries);
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
                                                    <input hidden type="file" onChange={handleLibreviewFileChange}/>
                                                </Button>
                                                <Button variant="contained" component="label">
                                                    Upload mySugr file
                                                    <input hidden type="file" onChange={handleMysugrFileChange}/>
                                                </Button>
                                                <Button variant="contained" component="label">
                                                    Clear
                                                    <input hidden onClick={handleClearChange}/>
                                                </Button>
                                            </Paper>
                                        </Stack>
                                    </Container>
                                </Drawer>

                                <Typography variant="h6" component="div" sx={{flexGrow: 1}}>Beetus Chart</Typography>
                                <SettingsButton />
                            </Toolbar>
                        </AppBar>

                        {/* Main Content */}
                        <Grid container spacing={2} alignItems='start'>
                            {/* Space under header */}
                            <Grid item xs={12}/>

                            {/* Left Section: Graphs */}
                            <Grid container item xs={12} spacing={2}>
                                <Grid item xs={12}>
                                    <Paper>
                                        <TimelineChart logEntries={logEntries}></TimelineChart>
                                    </Paper>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Container>
                </SettingsProvider>
            </LocalizationProvider>
        </div>
    );
}

export default App;
