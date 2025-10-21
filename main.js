
export function encodeWavFileFromAudioBuffer(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const numberOfFrames = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const channelData = Array(numberOfChannels);
    for (let channelNo = 0; channelNo < numberOfChannels; channelNo++) {
        channelData[channelNo] = audioBuffer.getChannelData(channelNo);
        if (channelData[channelNo].length != numberOfFrames) {
            throw new Error("Unexpected channel data array size.");
        }
    }

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
    for (let frameNo = 0; frameNo < numberOfFrames; frameNo++) {
        for (let channelNo = 0; channelNo < numberOfChannels; channelNo++) {
            const sampleValueFloat = channelData[channelNo][frameNo];
            dataView.setFloat32(offs, sampleValueFloat, true);
            offs += 4;
        }
    }
    return arrayBuffer;

}
