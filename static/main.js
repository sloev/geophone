var noSleep = new NoSleep();
console.log(noSleep)
let pointsaddedtochart = 0
const maxpointsinchart = 500
const max_speed = 9.81 // 3g
const debug = /[?&]debug=/.test(location.search)


let max_seen_speedx = 0.1
let max_seen_speedy = 0.1
let max_seen_speedz = 0.1
let ringbuffer = []
function enableNoSleep() {
    console.log("no sleep enabled")
    noSleep.enable();
    document.removeEventListener('touchstart', enableNoSleep, false);
}

// Enable wake lock.
// (must be wrapped in a user input event handler e.g. a mouse or touch handler)
document.addEventListener('touchstart', enableNoSleep, false);
const samplingrow = document.getElementById("samplingrow")
const audioElem = document.getElementById("audio")
const samplesrow = document.getElementById("samplesrow")
const recordingrow = document.getElementById("recordingrow")

const monotoggle = document.getElementById("mono")
const stopbutton = document.getElementById("recording")
const progress = document.getElementById("progress")

const downloadButton = document.getElementById("download")
const generateButton = document.getElementById("generate")
const resetButton = document.getElementById("reset")
const loadingElem = document.getElementById("loading")
const xline = document.getElementById("xline")
const yline = document.getElementById("yline")
const zline = document.getElementById("zline")
const charts = document.getElementById("charts")

const recordbutton = document.getElementById("stopped")
const errorElement = document.getElementById("error")
const sampleRateAccel = 60
const graceperiodSeconds = 5
const sampleRateWav = 8000
let accelerometer
let numberOfSamples = 0
let wav = undefined
function mapRange(value, oldMin, oldMax, newMin, newMax) {
    return ((value - oldMin) * (newMax - newMin) / (oldMax - oldMin)) + newMin;
}

const setError = (e) => {
    errorElement.classList.remove("fadeout");

    // -> triggering reflow /* The actual magic */
    // without this it wouldn't work. Try uncommenting the line and the transition won't be retriggered.
    // Oops! This won't work in strict mode. Thanks Felis Phasma!
    // element.offsetWidth = element.offsetWidth;
    // Do this instead:
    errorElement.innerText = e
    void errorElement.offsetWidth;

    // -> and re-adding the class
    errorElement.classList.add("fadeout");


}

const setNumberOfSamples = (n) => {
    numberOfSamples = n
    const recordingtime = new Date((numberOfSamples / sampleRateAccel) * 1000);
    samplingrow.innerText = `${recordingtime.toISOString().slice(11, 19)}.${String(recordingtime.getMilliseconds()).padStart(4, '0')}`

    const playtime = new Date((numberOfSamples / sampleRateWav) * 1000);
    recordingrow.innerText = `${playtime.toISOString().slice(11, 19)}.${String(playtime.getMilliseconds()).padStart(4, '0')}`
    samplesrow.innerText = `${numberOfSamples}`
}
idb.openDB('geophone', 1, {
    upgrade(db) {
        console.log("initialised db")
        // Create a store of objects
        const store = db.createObjectStore('samples', {
            keyPath: 'timestamp'
        });
    },
}).then(async db => {
    setStatus(LOADING)

    const n = await db.count("samples")
    setNumberOfSamples(n)
    const tx = db.transaction('samples');

    const points = []

    for await (const cursor of tx.store) {
        const val = cursor.value
        max_seen_speedx = Math.max(max_seen_speedx, val.x)
        max_seen_speedy = Math.max(max_seen_speedy, val.y)
        max_seen_speedz = Math.max(max_seen_speedz, val.z)
        points.push(val)

    }
    await tx.done

    points.slice(points.length - maxpointsinchart).map(val => {
        addPointToChart(val.x, val.y, val.z)
    })
    console.log("db ready with" + numberOfSamples + "samples")
    setTimeout(() => {
        setStatus(IDLE)
    }, 500);
}).catch(e => {
    console.log("db error", e)
})

const addEntry = async (timestamp, x, y, z) => {


    ringbuffer.push({ timestamp, x, y, z })
    if (ringbuffer.length > sampleRateAccel * graceperiodSeconds) {
        const item = ringbuffer.shift()
        max_seen_speedx = Math.max(max_seen_speedx, item.x)
        max_seen_speedy = Math.max(max_seen_speedy, item.y)
        max_seen_speedz = Math.max(max_seen_speedz, item.z)
        try {
            const db = await idb.openDB('geophone', 1)
            await db.add('samples', item);
            setNumberOfSamples(numberOfSamples + 1)
            addPointToChart(x, y, z)
        } catch (e) {
            console.log("error adding entry", e)
        }
    }
}

const reset = async () => {
    setStatus(RESETTING)
    wav = undefined
    try {
        const db = await idb.openDB('geophone', 1)
        await db.clear('samples');
        setNumberOfSamples(0)
        xline.points.clear();
        xline.removeAttribute("transform")
        yline.points.clear();
        yline.removeAttribute("transform")
        zline.points.clear();
        zline.removeAttribute("transform")
        max_seen_speedx = 0.1
        max_seen_speedy = 0.1
        max_seen_speedz = 0.1

        pointsaddedtochart = 0

        setStatus(IDLE)
    } catch (e) {
        console.log("error resseting", e)
    }
}


const addPointToChart = (xr, yr, zr) => {
    const x = mapRange(xr, -max_seen_speedx, max_seen_speedx, -1, 1)
    const y = mapRange(yr, -max_seen_speedy, max_seen_speedy, -1, 1)
    const z = mapRange(zr, -max_seen_speedz, max_seen_speedz, -1, 1)
    let transform = ""
    if (pointsaddedtochart > maxpointsinchart) {
        transform = `translate(-${pointsaddedtochart - maxpointsinchart},0)`
        xline.points.removeItem(0);
        yline.points.removeItem(0);
        zline.points.removeItem(0);
    }
    let point = charts.createSVGPoint();

    point.y = 40 + (15 * x);
    point.x = pointsaddedtochart;
    xline.points.appendItem(point);
    xline.setAttribute("transform", transform)

    point = charts.createSVGPoint();
    point.y = 80 + (15 * y);
    point.x = pointsaddedtochart;
    yline.points.appendItem(point);
    yline.setAttribute("transform", transform)

    point = charts.createSVGPoint();
    point.y = 120 + (15 * z);
    point.x = pointsaddedtochart;
    zline.points.appendItem(point);
    zline.setAttribute("transform", transform)
    pointsaddedtochart += 1
}


if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
} else {
    setError("This page is only tested on mobile, beware!")
}

monotoggle.addEventListener('change', (event) => {
    wav = undefined
    generateButton.removeAttribute("disabled")
    generateButton.removeAttribute("hidden")
    downloadButton.setAttribute("hidden", "")
    audioElem.style.visibility = "hidden"

})
// javascript
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

// javascript
const installApp = document.getElementById('installApp');
installApp.addEventListener('click', async () => {
    if (deferredPrompt !== null) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            deferredPrompt = null;
        }
    }
});
let [IDLE, STARTING_RECORDING, RECORDING, STOPPING, GENERATING, RESETTING, LOADING] = [1, 2, 3, 4, 5, 6, 7]


const setStatus = (status) => {
    switch (status) {
        case LOADING:
            stopbutton.setAttribute("disabled", "")
            recordbutton.setAttribute("disabled", "")
            downloadButton.setAttribute("disabled", "")
            generateButton.setAttribute("disabled", "")
            loadingElem.classList.remove("fadeoutfast");
            audioElem.style.visibility = "hidden"
            void loadingElem.offsetWidth;
            // -> and re-adding the class
            break;
        case IDLE:
            stopbutton.removeAttribute("disabled")
            stopbutton.setAttribute("hidden", "")
            recordbutton.removeAttribute("disabled")
            recordbutton.removeAttribute("hidden")
            resetButton.removeAttribute("disabled")

            loadingElem.classList.add("fadeoutfast");


            void loadingElem.offsetWidth;

            if (numberOfSamples > 0) {
                resetButton.removeAttribute("disabled")
                if (wav !== undefined) {
                    generateButton.setAttribute("hidden", "")
                    generateButton.setAttribute("disabled", "")
                    downloadButton.removeAttribute("hidden")
                    downloadButton.removeAttribute("disabled")
                } else {
                    generateButton.removeAttribute("disabled")
                    generateButton.removeAttribute("hidden")
                    downloadButton.setAttribute("hidden", "")
                    audioElem.style.visibility = "hidden"



                }

            }

            break;
        case STARTING_RECORDING:
            recordbutton.setAttribute("disabled", "")
            downloadButton.setAttribute("disabled", "")
            generateButton.setAttribute("disabled", "")
            resetButton.setAttribute("disabled", "")
            break;
        case RECORDING:
            recordbutton.setAttribute("hidden", "")
            stopbutton.removeAttribute("hidden")
            break;
        case STOPPING:
            stopbutton.setAttribute("disabled", "")
            loadingElem.classList.remove("fadeoutfast");
            void loadingElem.offsetWidth;
            break;
        case GENERATING:
            downloadButton.setAttribute("hidden", "")
            generateButton.setAttribute("disabled", "")
            recordbutton.setAttribute("disabled", "")
            stopbutton.setAttribute("disabled", "")
            break;
        case RESETTING:
            generateButton.setAttribute("disabled", "")
            downloadButton.setAttribute("hidden", "")
            generateButton.removeAttribute("hidden")
            recordbutton.setAttribute("disabled", "")
            resetButton.setAttribute("disabled", "")
            break;
    }
}
const stopRecording = () => {
    setStatus(STOPPING)
    wav = undefined
    accelerometer && accelerometer.stop()
    setStatus(IDLE)

}
const startRecording = () => {
    enableNoSleep()
    wav = undefined
    ringbuffer.length = 0

    setStatus(STARTING_RECORDING)
    if (typeof Accelerometer !== "function") {
        setError("you dont have  accelerometer")
        setStatus(IDLE)
        return
    }
    let countdown = graceperiodSeconds
    const foo = () => {
        progress.innerText = `${countdown}`


        if (countdown > 0) {
            setTimeout(() => {
                foo()
            }, 1000);
        } else {
            startRecordingMode()


        }
        countdown -= 1

    }
    foo()
}
const startRecordingMode = () => {
    progress.innerText = "🔴"
    if (debug) {
        setStatus(RECORDING)
        let index = 1000
        let foo = () => {
            addEntry(new Date().getTime(), Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
            index -= 1
            if (index > 1) {
                setTimeout(() => {
                    foo()
                }, 1);
            } else {
                setStatus(IDLE)
            }

        }
        foo()
        return
    }
    accelerometer = new LinearAccelerationSensor({ frequency: sampleRateAccel });
    accelerometer.addEventListener("activate", (event) => {
        setStatus(RECORDING)
    })

    accelerometer.addEventListener("error", (event) => {
        // Handle runtime errors.
        if (event.error.name === "NotAllowedError") {
            navigator.permissions.query({ name: "accelerometer" }).then((result) => {
                if (result.state === "denied") {
                    console.log("Permission to use accelerometer sensor is denied.");
                    return;
                }
            })
            // Branch to code for requesting permission.
        } else if (event.error.name === "NotReadableError") {
            setError("Cannot connect to the sensor");
        }
        setStatus(IDLE)
    });
    accelerometer.addEventListener("reading", (e) => {
        addEntry(e.timeStamp, accelerometer.x, accelerometer.y, accelerometer.z)
    })
    accelerometer.start()
}



const generate = async () => {
    setStatus(GENERATING)
    setStatus(LOADING)
    const db = await idb.openDB('geophone', 1)
    const numberOfSamples = await db.count("samples")
    const tx = db.transaction('samples');

    const writer = createwave(monotoggle.checked, numberOfSamples)
    for await (const cursor of tx.store) {
        const val = cursor.value
        const x = mapRange(val.x, -max_seen_speedx, max_seen_speedx, -0.95, 0.95)
        const y = mapRange(val.y, -max_seen_speedy, max_seen_speedy, -0.95, 0.95)
        const z = mapRange(val.z, -max_seen_speedz, max_seen_speedz, -0.95, 0.95)
        wav = writer(x, y, z)
    }
    await tx.done
        audioElem.src = URL.createObjectURL(wav)
        audioElem.load()
        audioElem.style.visibility = "visible"
   
    setStatus(IDLE)

}

const download = () => {
    let downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(wav)
    const d = new Date()
    const filename = `geophone.${d.toISOString()}.wav`
    downloadLink.text = filename
    downloadLink.setAttribute('download', filename) // name file
    downloadLink.removeAttribute('disabled');
    downloadLink.click()
}

const createwave = (mono, numberOfFrames) => {
    const sampleRate = sampleRateWav
    const numberOfChannels = mono ? 1 : 3;

    function setString(offset, value) {
        for (let p = 0; p < value.length; p++) {
            dataView.setUint8(offset + p, value.charCodeAt(p));
        }
    }
    if (numberOfChannels < 1) {
        throw new Error("No audio channels.");
    }
    const bitsPerSample = 32;
    const formatCode = 3; // WAVE_FORMAT_IEEE_FLOAT
    const fmtChunkSize = 18;
    const bytesPerSample = Math.ceil(bitsPerSample / 8);
    const bytesPerFrame = numberOfChannels * bytesPerSample;
    const bytesPerSec = sampleRate * numberOfChannels * bytesPerSample;
    const headerLength = 20 + fmtChunkSize + 8;
    const sampleDataLength = numberOfChannels * numberOfFrames * bytesPerSample;
    const fileLength = headerLength + sampleDataLength;
    const arrayBuffer = new ArrayBuffer(fileLength);
    const dataView = new DataView(arrayBuffer);
    setString(0, "RIFF");                                // chunk ID
    dataView.setUint32(4, fileLength - 8, true);         // chunk size
    setString(8, "WAVE");                                // WAVEID
    setString(12, "fmt ");                               // chunk ID
    dataView.setUint32(16, fmtChunkSize, true);          // chunk size
    dataView.setUint16(20, formatCode, true);            // wFormatTag
    dataView.setUint16(22, numberOfChannels, true);      // nChannels
    dataView.setUint32(24, sampleRate, true);            // nSamplesPerSec
    dataView.setUint32(28, bytesPerSec, true);           // nAvgBytesPerSec
    dataView.setUint16(32, bytesPerFrame, true);         // nBlockAlign
    dataView.setUint16(34, bitsPerSample, true);         // wBitsPerSample
    if (fmtChunkSize > 16) {
        dataView.setUint16(36, 0, true);
    }                // cbSize (extension size)
    const p = 20 + fmtChunkSize;
    setString(p, "data");                                // chunk ID
    dataView.setUint32(p + 4, sampleDataLength, true);


    let offs = headerLength;
    let frameNo = 0
    return (x, y, z) => {
        if (mono) {
            const val = (x + y + z) / 3.0
            dataView.setFloat32(offs, Math.fround(val), true);
            offs += 4;
        } else {
            dataView.setFloat32(offs, Math.fround(x), true);
            offs += 4;
            dataView.setFloat32(offs, Math.fround(y), true);
            offs += 4;
            dataView.setFloat32(offs, Math.fround(z), true);
            offs += 4;
        }
        frameNo += 1

        if (frameNo >= numberOfFrames) {
            return new Blob([dataView], { type: 'audio/wav' });
        }
    }
}